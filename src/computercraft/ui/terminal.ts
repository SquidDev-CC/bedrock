import { IComputerActionable, Semaphore } from "../common/computer";
import { TerminalData } from "../common/terminal";
import { catching, send } from "./helpers";
import { convertChar, convertKey, convertMouseButton } from "./input";

const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

export class Terminal {
  private canvasElem?: HTMLDivElement;
  private wrapperElem?: HTMLDivElement;
  private cursorElem?: HTMLSpanElement;
  private readonly cells: Element[] = [];

  private changed: boolean = true;
  private lastBlink: boolean = false;

  private readonly computer: IComputerActionable;
  private readonly changeListener: Semaphore;
  private readonly terminal: TerminalData;

  private mounted: boolean = false;
  private drawQueued: boolean = false;

  private lastX: number = -1;
  private lastY: number = -1;
  private lastButton: number = -1;

  private down: Set<number> = new Set();

  public constructor(props: {
    computer: IComputerActionable,
    changed: Semaphore,
    terminal: TerminalData,
  }) {
    this.computer = props.computer;
    this.changeListener = props.changed;
    this.terminal = props.terminal;
  }

  public mount() {
    this.mounted = true;
    this.changeListener.attach(this.onChanged);

    this.canvasElem = document.querySelector(".terminal-canvas") as HTMLDivElement;
    this.wrapperElem = document.querySelector(".terminal-wrapper") as HTMLDivElement;
    this.cursorElem = document.querySelector(".terminal-cursor") as HTMLSpanElement;

    this.wrapperElem.addEventListener("mousedown", this.onMouse);
    this.wrapperElem.addEventListener("mouseup", this.onMouse);
    this.wrapperElem.addEventListener("mousemove", this.onMouse);
    this.wrapperElem.addEventListener("wheel", this.onMouseWheel);
    this.wrapperElem.addEventListener("contextmenu", this.onEventDefault);

    document.body.addEventListener("paste", this.onPaste);
    document.body.addEventListener("keydown", this.onKey);
    document.body.addEventListener("keyup", this.onKey);
    document.body.addEventListener("input", this.onInput);

    this.queueDraw();
  }

  public unmount() {
    if (this.wrapperElem) {
      this.wrapperElem.removeEventListener("mousedown", this.onMouse);
      this.wrapperElem.removeEventListener("mouseup", this.onMouse);
      this.wrapperElem.removeEventListener("mousemove", this.onMouse);
      this.wrapperElem.removeEventListener("wheel", this.onMouseWheel);
      this.wrapperElem.removeEventListener("contextmenu", this.onEventDefault);
    }

    document.body.removeEventListener("paste", this.onPaste);
    document.body.removeEventListener("keydown", this.onKey);
    document.body.removeEventListener("keyup", this.onKey);
    document.body.removeEventListener("input", this.onInput);

    this.mounted = false;

    for (const cell of this.cells) cell.remove();
    this.cells.splice(0, this.cells.length);

    this.changeListener.detach(this.onChanged);
  }

  public queueDraw() {
    if (this.mounted && !this.drawQueued) {
      this.drawQueued = true;
      window.requestAnimationFrame(catching(time => {
        this.drawQueued = false;
        if (!this.mounted) return;

        this.draw(time);

        // Schedule another redraw to handle the cursor blink
        if (this.terminal.cursorBlink) this.queueDraw();
      }));
    }
  }

  private draw(time: number) {
    if (!this.canvasElem || !this.cursorElem) return;

    const terminal = this.terminal;
    const sizeX = terminal.sizeX || 51;
    const sizeY = terminal.sizeY || 19;

    const blink = Math.floor(time / 400) % 2 === 0;
    const changed = this.changed;

    if (!changed && (
      !terminal.cursorBlink || this.lastBlink === blink ||
      terminal.cursorX < 0 || terminal.cursorX >= sizeX ||
      terminal.cursorY < 0 || terminal.cursorY >= sizeY
    )) {
      return;
    }

    this.lastBlink = blink;
    this.changed = false;

    const elements = sizeX * sizeY;
    const cells = this.cells;
    if (changed && elements !== cells.length) {
      // Remove extra cells
      for (let i = elements; i < cells.length; i++) cells[i].remove();
      cells.splice(elements, cells.length);
      // And add missing ones
      for (let i = cells.length; i < elements; i++) {
        const cell = document.createElement("span");
        cell.className = "term-cell";
        cells.push(cell);
        this.canvasElem.appendChild(cell);
      }
    }

    // If we"re just redrawing the cursor. We"ve aborted earlier if the cursor is not visible/
    // out of range and hasn"t changed.
    if (!changed) {
      if (blink) {
        this.cursorElem.style.display = "none";
      } else {
        this.cursorElem.style.display = "block";
        this.cursorElem.style.top = `${terminal.cursorY * 18 + 4}px`;
        this.cursorElem.style.left = `${terminal.cursorX * 12 + 4}px`;
      }
      return;
    }

    // And render!
    if (terminal.sizeX === 0 && terminal.sizeY === 0) {
      // render.bsod(ctx, sizeX, sizeY, "No terminal output", scale, font);
    } else {
      for (let y = 0; y < terminal.sizeY; y++) {
        for (let x = 0; x < terminal.sizeX; x++) {
          cells[y * terminal.sizeX + x].className = `term-cell`
            + ` term-fore-${terminal.fore[y].charAt(x)}`
            + ` term-back-${terminal.back[y].charAt(x)}`
            + ` term-text-${terminal.text[y].charCodeAt(x)}`;
        }
      }
    }
  }

  private onChanged = () => {
    this.changed = true;
    this.queueDraw();
  }

  private paste(clipboard: DataTransfer | undefined) {
    if (!clipboard) return;
    let content = clipboard.getData("text");
    if (!content) return;

    // Limit to allowed characters (actually slightly more generous but
    // there you go).
    content = content.replace(/[^\x20-\xFF]/gi, "");
    // Strip to the first newline
    content = content.replace(/[\r\n].*/, "");
    // Limit to 512 characters
    content = content.substr(0, 512);

    // Abort if we"re empty
    if (!content) return;

    this.computer.queueEvent("paste", [content]);
  }

  private onPaste = catching((event: ClipboardEvent) => {
    this.onEventDefault(event);
    this.paste((event.clipboardData || (window as any).clipboardData));
  });

  private onMouse = catching((event: MouseEvent) => {
    this.onEventDefault(event);
    if (!this.wrapperElem) return;

    // If we"re a mouse move and nobody is pressing anything, let"s
    // skip for now.
    if (event.type === "mousemove" && this.lastButton === -1) return;

    const x = clamp(
      Math.floor((event.screenX - this.wrapperElem.offsetLeft)
        / this.wrapperElem.offsetWidth * this.terminal.sizeX) + 1,
      1, this.terminal.sizeX);
    const y = clamp(
      Math.floor((event.screenY - this.wrapperElem.offsetTop)
        / this.wrapperElem.offsetHeight * this.terminal.sizeY) + 1,
      1, this.terminal.sizeY);

    switch (event.type) {
      case "mousedown": {
        const button = convertMouseButton(event.button);
        if (button) {
          this.computer.queueEvent("mouse_click", [button, x, y]);
          this.lastButton = button;
          this.lastX = x;
          this.lastY = y;
        }
        break;
      }
      case "mouseup": {
        const button = convertMouseButton(event.button);
        if (button) {
          this.computer.queueEvent("mouse_up", [button, x, y]);
          this.lastButton = -1;
          this.lastX = x;
          this.lastY = y;
        }
        break;
      }
      case "mousemove": {
        const button = convertMouseButton(event.button);
        if (button && button === this.lastButton && (x !== this.lastX || y !== this.lastY)) {
          this.computer.queueEvent("mouse_drag", [button, x, y]);
          this.lastX = x;
          this.lastY = y;
        }
      }
    }
  });

  private onMouseWheel = catching((event: WheelEvent) => {
    this.onEventDefault(event);
    if (!this.wrapperElem) return;

    const x = clamp(
      Math.floor((event.screenX - this.wrapperElem.offsetLeft)
        / this.wrapperElem.offsetWidth * this.terminal.sizeX) + 1,
      1, this.terminal.sizeX);
    const y = clamp(
      Math.floor((event.screenY - this.wrapperElem.offsetTop)
        / this.wrapperElem.offsetHeight * this.terminal.sizeY) + 1,
      1, this.terminal.sizeY);

    if (event.deltaY !== 0) {
      this.computer.queueEvent("mouse_scroll", [Math.sign(event.deltaY), x, y]);
    }
  });

  private onEventDefault = (event: Event) => {
    event.preventDefault();
  }

  private onKey = catching((event: KeyboardEvent) => {
    if (!this.canvasElem || !this.mounted) return;

    if (event.type === "keydown" && event.keyCode === 27) {
      send({ tag: "close" });
      return;
    }

    // Handle pasting. Might be worth adding shift+insert support too.
    // Note this is needed as we block the main paste event.
    if (event.type === "keydown" && (event.ctrlKey && event.keyCode === 86)) {
      const data = (window as any).clipboardData;
      if (data) {
        this.paste(data);
        this.onEventDefault(event);
      }
      return;
    }

    // Try to pull the key number from the event.
    const code = convertKey(event.keyCode);
    const char = event.key || convertChar(event.keyCode, this.down.has(0x10)) || "";
    if (code || char.length === 1) this.onEventDefault(event);

    if (event.type === "keydown") {
      if (code) this.computer.queueEvent("key", [code, this.down.has(event.keyCode)]);
      this.down.add(event.keyCode);

      // Only queue an event if not holding Ctrl
      if (!this.down.has(0x11) && char.length === 1) this.computer.queueEvent("char", [char]);
    } else if (event.type === "keyup") {
      if (code) this.computer.queueEvent("key_up", [code]);
      this.down.delete(event.keyCode);
    }
  });

  private onInput = catching((event: Event) => {
    const target = event.target as HTMLInputElement;
    this.onEventDefault(event);

    // Some browsers (*cough* Chrome *cough*) don't provide
    // KeyboardEvent.{code, key} for printable characters. Let's scrape it from
    // the input instead.
    const value = target.value;
    if (!value) return;
    target.value = "";

    this.computer.queueEvent(value.length === 1 ? "char" : "paste", [value]);
  });
}
