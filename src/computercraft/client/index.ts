import { setupLog } from "../common/system-helpers";
import { ClientToUI, Events, UIToClient } from "../minecraft";

const system = client.registerSystem<Events>(0, 0);
const log = setupLog(client, system);

const assert = (ok: true | null) => {
  if (!ok) throw new Error("Could not register event");
};

const sendToUI = <K extends keyof ClientToUI>(event: K, data: ClientToUI[K]) => {
  const eventData = system.createEventData("minecraft:send_ui_event")!;
  eventData.data.eventIdentifier = event;
  eventData.data.data = JSON.stringify(data);
  system.broadcastEvent("minecraft:send_ui_event", eventData);
};

system.initialize = () => {
  // Register any events we'll be queueing
  system.registerEventData("computercraft:action", { id: -1, action: "turn_on" });
  system.registerEventData("computercraft:queue_event", { id: -1, event: "invalid_event", args: [] });

  // When we receive "open_computer", open the GUI and buffer our terminal data
  let currentComputer: Events["computercraft:open_computer"] | null = null;
  let interacting: boolean = false;
  assert(system.listenForEvent("computercraft:open_computer", e => {
    currentComputer = e.data;
    interacting = false;

    const eventData = system.createEventData("minecraft:load_ui")!;
    eventData.data.path = `cct_gui_${e.data.advanced ? "advanced" : "normal"}.html`;
    eventData.data.options.absorbs_input = true;
    eventData.data.options.always_accepts_input = true;
    system.broadcastEvent("minecraft:load_ui", eventData);
  }));

  // When we receive "sync_terminal", just push the data to the UI.
  assert(system.listenForEvent("computercraft:sync_terminal", e => {
    if (!currentComputer || currentComputer.id !== e.data.id) return;

    currentComputer.terminal = e.data.terminal;
    if (interacting) sendToUI("computercraft:sync_terminal", { terminal: currentComputer.terminal });
  }));

  // Handle events from the computer UI
  assert(system.listenForEvent("minecraft:ui_event", event => {
    let data: UIToClient;
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      log(`Cannot parse event ${event.data}`);
      return;
    }

    switch (data.tag) {
      case "log": {
        const eventData = system.createEventData("minecraft:display_chat_event")!;
        eventData.data.message = `[${data.level}] ${data.message}`;
        system.broadcastEvent("minecraft:display_chat_event", eventData);
        return;
      }

      case "close": {
        const advanced = currentComputer === null ? false : currentComputer.advanced;
        currentComputer = null;
        interacting = true;

        const eventData = system.createEventData("minecraft:unload_ui")!;
        eventData.data.path = eventData.data.path = `cct_gui_${advanced ? "advanced" : "normal"}.html`;
        system.broadcastEvent("minecraft:unload_ui", eventData);
        return;
      }

      case "action": {
        if (!currentComputer) return;

        const eventData = system.createEventData("computercraft:action")!;
        eventData.data.id = currentComputer.id;
        eventData.data.action = data.action;
        system.broadcastEvent("computercraft:action", eventData);
        return;
      }

      case "queue_event": {
        if (!currentComputer) return;

        const eventData = system.createEventData("computercraft:queue_event")!;
        eventData.data.id = currentComputer.id;
        eventData.data.event = data.event;
        eventData.data.args = data.args;
        system.broadcastEvent("computercraft:queue_event", eventData);
        return;
      }

      case "ready": {
        if (!currentComputer) return;

        sendToUI("computercraft:sync_terminal", { terminal: currentComputer.terminal });
        interacting = true;
        return;
      }
    }
  }));
};
