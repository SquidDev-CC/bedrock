import { LuaValue } from "./common/computer";
import { TerminalData } from "./common/terminal";

/**
 * Messages which are sent to the client from the UI
 */
export type UIToClient
  = { tag: "log", level: "info" | "error", message: string }
  | { tag: "close" }
  | { tag: "action", action: "shutdown" | "reboot" | "turn_on" }
  | { tag: "queue_event", event: string, args: LuaValue[] }
  | { tag: "ready" };

/**
 * Messages which are sent to the UI from the client
 */
export type ClientToUI = {
  "computercraft:sync_terminal": {
    terminal: TerminalData,
  },
};

/**
 * Events sent between the client and server.
 */
export type Events = {
  "computercraft:open_computer": {
    id: number,
    advanced: boolean,
    terminal: TerminalData,
  },

  "computercraft:sync_terminal": {
    id: number,
    terminal: TerminalData,
  },

  "computercraft:queue_event": {
    id: number,
    event: string,
    args: LuaValue[],
  },

  "computercraft:action": {
    id: number,
    action: "shutdown" | "reboot" | "turn_on",
  },
};

export type Components = {
  "computercraft:computer": {
    id: number,
  },
};
