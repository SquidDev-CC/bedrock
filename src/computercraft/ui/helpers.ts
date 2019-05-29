import { ClientToUI, UIToClient } from "../minecraft";

const events: string[] = [];

// Create a fake interface which queues events and try to load the "real" one
let scriptInterface: ScriptInterface = {
  triggerEvent: e => events.push(e),
};

if (typeof engine !== "undefined") {
  engine.on("facet:updated:core.scripting", iface => {
    scriptInterface = iface;
    // Send any buffered events
    for (const message of events) scriptInterface.triggerEvent(message);
    events.splice(0, events.length);
  });

  engine.trigger("facet:request", ["core.scripting"]);
}

/**
 * Send a message to be run on the client
 *
 * @param message The message to send
 */
export const send = (message: UIToClient) => scriptInterface.triggerEvent(JSON.stringify(message));

/**
 * Log a message to the client's chat
 * @param level The level at which to log
 * @param message The message to log
 */
export const log = (level: "info" | "error", message: string) => {
  // A bit odd, but TS's type safety does fall down occasionally.
  const msg: any = message;
  if (msg instanceof Error) message = JSON.stringify(msg) + ":" + (msg.message || "");
  message = typeof message === "string" ? message : typeof message;

  send({ tag: "log", level, message });
};

export const subscribe = <K extends keyof ClientToUI>(event: K, callback: (data: ClientToUI[K]) => void) =>
  engine.on(event, data => {
    try {
      callback(JSON.parse(data) as ClientToUI[K]);
    } catch (e) {
      log("error", e);
    }
  });

/**
 * Log any errors which this method produces to the client.
 *
 * Note, this will re-raise the exception rather than swallowing it.
 *
 * @param fun The method to wrap
 * @return The wrapped function
 */
export function catching<A extends any[], T, R>(fun: (this: T, ...args: A) => R): (this: T, ...args: A) => R {
  return function(...args: A): R {
    try {
      return fun.apply(this, args);
    } catch (e) {
      log("error", e);
      throw e;
    }
  };
}
