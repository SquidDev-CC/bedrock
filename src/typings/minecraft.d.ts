/**
 * Script engine for the client
 */
declare var client: ScriptEngine<VanillaClientEvents>;

/**
 * Script engine for the server
 */
declare var server: ScriptEngine<VanillaServerEvents>;

/**
 * The script engine for the UI.
 */
declare var engine: {
  on(event: "facet:updated:core.scripting", callback: (interface: ScriptInterface) => void): void;
  on(event: string, callback: (data: string) => void): void;

  trigger(event: string, args: any[]): void;
}

/**
 * Script interface for UI.
 */
declare interface ScriptInterface {
  triggerEvent(body: string): void,
}

/**
 * An entry point to the Minecraft Script engine.
 *
 * One will either consume {@link client} or {@link server}.
 */
declare interface ScriptEngine<E> {
  registerSystem<Ex = {}, Cs = {}>(major: number, minor: number): System<E & Ex, Cs & VanillaComponents>;

  log(message: string): void;
}

/**
 * An instance of the Minecraft Script Engine
 */
declare interface System<Events, Components> {
  initialize?: () => void;
  update?: () => void;
  shutdown?: () => void;

  registerEventData<
    K extends keyof D,
    D extends { [P in keyof (VanillaCommonEvents | VanillaClientEvents | VanillaServerEvents)]: never } & Events
  >(key: K, defaults: D[K]): true | null;

  createEventData<K extends keyof Events>(key: K): EventWrapper<Events[K]> | null;

  listenForEvent<K extends keyof Events>(key: K, callback: (event: EventWrapper<Events[K]>) => void): true | null;

  broadcastEvent<K extends keyof Events>(key: K, event: EventWrapper<Events[K]>): true | null;

  registerComponent<
    K extends keyof D,
    D extends { [P in keyof VanillaComponents]: never } & Components
  >(key: K, defaults: D[K]): true | null;

  getComponent<K extends keyof Components>(object: Tagged<any>, key: K):
    (Tagged<"component"> & { data: Components[K] }) | null;

  createComponent<K extends keyof Components>(object: Tagged<any>, key: K):
    (Tagged<"component"> & { data: Components[K] }) | null;

  applyComponentChanges<K extends keyof Components>(object: Tagged<any>, component: Tagged<"component">): void;

  getBlock(area: TickingArea, x: number, y: number, z: number): Block | null;
  getBlock(area: TickingArea, pos: BlockPos): Block | null;
}

declare type VanillaCommonEvents = {
  "minecraft:display_chat_event": {
    message: string;
  },

  "minecraft:script_logger_config": {
    log_errors: boolean,
    log_warnings: boolean,
    log_information: boolean,
  }
};

/**
 * All vanilla-provided events which can be listened to on the client.
 *
 * This should generally not need to be used directly, but rather is used as a
 * lookup for the various event methods in {@link System}.
 *
 * Well, technically all the ones we need.
 */
declare type VanillaClientEvents = VanillaCommonEvents & {
  "minecraft:client_entered_world": {},

  "minecraft:load_ui": {
    path: string,
    options: {
      always_accepts_input: boolean,
      render_game_behind: boolean,
      absorbs_input: boolean,
      is_showing_menu: boolean,
      should_steal_mouse: boolean,
      force_render_below: boolean,
      render_only_when_topmost: boolean,
    }
  },

  "minecraft:unload_ui": { path: string },

  "minecraft:ui_event": string,

  "minecraft:send_ui_event": {
    eventIdentifier: string,
    data: string,
  }
};

/**
 * All vanilla-provided events which can be listened to on the server.
 *
 * This should generally not need to be used directly, but rather is used as a
 * lookup for the various event methods in {@link System}.
 *
 * Well, technically all the ones we need.
 */
declare type VanillaServerEvents = VanillaCommonEvents & {
  "minecraft:block_interacted_with": {
    player: Entity,
    block_position: BlockPos,
  }
};

declare type EventWrapper<T> = {
  data: T,
};

/**
 * All components exposed by Vanilla minecraft
 *
 * Well, technically all the ones we need.
 */
declare type VanillaComponents = {
  "minecraft:tick_world": {
    radius: number,
    distance_to_players: number,
    never_despawn: boolean,
    ticking_area: EntityTickingArea,
  },

  "minecraft:position": { x: number, y: number, z: number },
};

/**
 * A
 */
declare type Vector = [number, number, number]

/**
 * An integer position in the world
 */
declare type BlockPos = { x: number, y: number; z: number };

/**
 * A tagged object which is provided by the game.
 *
 * This should never be instantiated directly by the user.
 */
declare type Tagged<K extends string> = {
  readonly __type__: K,
  readonly ["*do-not-instantiate*"]: never
}

/**
 * An object which has an identifier.
 */
declare type Identified = { readonly __identifier__: string; }

/**
 * An entity
 */
declare type Entity = Tagged<"entity" | "item"> & Identified & {
  readonly id: number;
}

/**
 * The ticking area an entity belongs to
 *
 * Gathered using the {@code "minecraft:tick_world"} component.
 */
declare type EntityTickingArea = Tagged<"entity_ticking_area"> & { readonly entity_ticking_area_id: number };

/**
 * The ticking area in a level
 */
declare type LevelTickingArea = Tagged<"level_ticking_area"> & { readonly level_ticking_area_id: string };

declare type TickingArea = EntityTickingArea | LevelTickingArea;

/**
 * A block
 */
declare type Block = Tagged<"block"> & Identified & {
  readonly ticking_area: TickingArea,
  readonly block_position: BlockPos,
};
