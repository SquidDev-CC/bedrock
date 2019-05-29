import { Semaphore } from "../common/computer";
import { setupLog } from "../common/system-helpers";
import { TerminalData } from "../common/terminal";
import { Events } from "../minecraft";
import { ComputerAccess } from "./access";
import { ConfigGroup, ConfigStore } from "./config";
import { start } from "./java";
import { VoidPersistence } from "./persist";

const system = server.registerSystem<Events>(0, 0);
const log = setupLog(server, system);

const assert = <T>(res: T | null): T => {
  if (res === null) throw new Error("Could not run task");
  return res;
};

// Set a couple of settings to be "nicer" on a setup with limited resources.
const config = new ConfigStore();
config.set(
  { type: "boolean", id: "http.enabled", name: "", description: "", changed: () => { }, def: true },
  false,
);
config.set(
  { type: "string", id: "default_computer_settings", name: "", description: "", changed: () => { }, def: "" },
  "bios.use_multishell=false",
);

const callbacks = start((name, desc) => new ConfigGroup(name, desc, config));

let nextId = 0;
const computerInstances: Map<number, {
  terminal: TerminalData,
  computer: ComputerAccess,
  advanced: boolean,
}> = new Map();
const idInstances: Map<string, number> = new Map();

const createInstance = (id: number, advanced: boolean) => {
  const existing = computerInstances.get(id);
  if (existing) return existing;

  const terminal = new TerminalData();
  terminal.resize(51, 19);
  terminal.text[0] = "Hello" + (" ").repeat(51 - 5);

  const terminalSemaphore = new Semaphore();

  const computer = new ComputerAccess(new VoidPersistence(), terminal, terminalSemaphore, () => { });
  callbacks.makeComputer(id, advanced, computer);

  // Update the clients when a terminal changes.
  // This is terribly inefficient network wise, but I can't find a way to limit who it is sent to.
  terminalSemaphore.attach(() => {
    const eventData = system.createEventData("computercraft:sync_terminal")!;
    eventData.data.id = id;
    eventData.data.terminal = terminal;
    system.broadcastEvent("computercraft:sync_terminal", eventData);
  });

  const data = { terminal, computer, advanced };
  computerInstances.set(id, data);
  return data;
};

system.initialize = () => {
  log("Initialised on the server");

  // Register events
  system.registerEventData("computercraft:open_computer", { id: -1, advanced: false, terminal: new TerminalData() });
  system.registerEventData("computercraft:sync_terminal", { id: -1, terminal: new TerminalData() });

  // Handle right clicking on computers
  assert(system.listenForEvent("minecraft:block_interacted_with", e => {
    const world = system.getComponent(e.data.player, "minecraft:tick_world");
    if (world === null) return;

    const block = system.getBlock(world.data.ticking_area, e.data.block_position);
    if (block === null) return;

    if (block.__identifier__ !== "computercraft:computer_normal" &&
      block.__identifier__ !== "computercraft:computer_advanced") return;

    // So ideally we'd register a component on the block. But that doesn't appear to be allowed,
    // so we maintain a mapping of positions to ids. Will this break? Yes.
    const pos = JSON.stringify(e.data.block_position);
    let id: number;
    if (idInstances.has(pos)) {
      id = idInstances.get(pos)!;
    } else {
      id = nextId++;
      idInstances.set(pos, id);
    }

    const { terminal, advanced } = createInstance(id, block.__identifier__ === "computercraft:computer_advanced");

    const eventData = system.createEventData("computercraft:open_computer")!;
    eventData.data.id = id;
    eventData.data.advanced = advanced;
    eventData.data.terminal = terminal;
    system.broadcastEvent("computercraft:open_computer", eventData);
  }));

  // Handle computer events from the client
  assert(system.listenForEvent("computercraft:action", e => {
    const instance = computerInstances.get(e.data.id);
    if (!instance) return;

    switch (e.data.action) {
      case "reboot":
        instance.computer.reboot();
        break;
      case "shutdown":
        instance.computer.shutdown();
        break;
      case "turn_on":
        instance.computer.turnOn();
        break;
    }
  }));

  assert(system.listenForEvent("computercraft:queue_event", e => {
    const instance = computerInstances.get(e.data.id);
    if (!instance) return;

    instance.computer.queueEvent(e.data.event, e.data.args);
  }));
};

system.update = () => {
  callbacks.tick();
};
