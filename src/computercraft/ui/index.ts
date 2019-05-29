import { IComputerActionable, LuaValue, Semaphore } from "../common/computer";
import { TerminalData } from "../common/terminal";
import { log, send, subscribe } from "./helpers";
import { Terminal } from "./terminal";

const terminal = new TerminalData();
const terminalChanged = new Semaphore();

const computer: IComputerActionable = {
  queueEvent: (event: string, args: LuaValue[]): void => send({ tag: "queue_event", event, args }),
  turnOn: (): void => send({ tag: "action", action: "turn_on" }),
  shutdown: (): void => send({ tag: "action", action: "shutdown" }),
  reboot: (): void => send({ tag: "action", action: "reboot" }),
};

try {
  new Terminal({ terminal, changed: terminalChanged, computer }).mount();
} catch (e) {
  log("error", e);
}

// Subscribe to terminal updates.
subscribe("computercraft:sync_terminal", ({ terminal: from }) => {
  terminal.text = from.text;
  terminal.fore = from.fore;
  terminal.back = from.back;

  terminal.palette = from.palette;

  terminal.currentFore = from.currentFore;

  terminal.sizeX = from.sizeX;
  terminal.sizeY = from.sizeY;

  terminal.cursorX = from.cursorX;
  terminal.cursorY = from.cursorY;
  terminal.cursorBlink = from.cursorBlink;

  terminalChanged.signal();
});

// And tell the client to start sending them.
send({ tag: "ready" });
