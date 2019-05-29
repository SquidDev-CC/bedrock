/**
 * Setup logging, and return a helper logging function
 *
 * @param engine The Minecraft Script Engine instance.
 * @param system The instantiated system instance.
 * @return A function which will log to chat and the system's log.
 */
export const setupLog = (engine: ScriptEngine<any>, system: System<any, any>) => {
  const ev = system.createEventData("minecraft:script_logger_config")!;
  ev.data.log_errors = ev.data.log_warnings = ev.data.log_information = true;
  system.broadcastEvent("minecraft:script_logger_config", ev);

  return (message: string) => {
    // A bit odd, but TS's type safety does fall down occasionally.
    const msg: any = message;
    if (msg instanceof Error) message = JSON.stringify(msg) + ":" + (msg.message || "");
    message = typeof message === "string" ? message : typeof message;

    const eventData = system.createEventData("minecraft:display_chat_event")!;
    eventData.data.message = message;
    system.broadcastEvent("minecraft:display_chat_event", eventData);

    engine.log(message);
  };
};
