import { IConfigGroup } from "./classes";

/** The supported types of a property */
type PropertyTypes = {
  string: string,
  boolean: boolean,
  int: number,
  option: string,
};

/** Additional properties for a specific type */
type TypeExtensions = {
  string: {};
  boolean: {};
  int: { min: number, max: number };
  option: { choices: Array<{ key: string, value: string }> }
};

export type IConfigProperty<K extends keyof PropertyTypes> = {
  type: K,
  id: string,
  name: string,
  description: string,
  def: PropertyTypes[K], changed: (value: PropertyTypes[K]) => void,
} & TypeExtensions[K];

export type ConfigProperty
  = IConfigProperty<"string">
  | IConfigProperty<"boolean">
  | IConfigProperty<"int">
  | IConfigProperty<"option">;

/**
 * The persisted map for config
 */
export class ConfigStore {
  private data: { [key: string]: any } = {};

  /** Get the value of a config property under the current storage */
  public get<K extends keyof PropertyTypes>(property: IConfigProperty<K>): PropertyTypes[K] {
    return property.id in this.data ? this.data[property.id] : property.def;
  }

  /** Set a value and fire any callbacks */
  public set<K extends keyof PropertyTypes>(property: IConfigProperty<K>, value: PropertyTypes[K]): void {
    if (this.get(property) === value) return;
    this.data[property.id] = value;
    property.changed(value);
  }
}

export class ConfigGroup implements IConfigGroup {
  private readonly store: ConfigStore;

  public readonly name: string;
  public readonly description: string | null;
  public readonly properties: ConfigProperty[] = [];

  constructor(name: string, description: string | null, store: ConfigStore) {
    this.name = name;
    this.description = description;
    this.store = store;
  }

  private add<K extends keyof PropertyTypes>(property: IConfigProperty<K>): IConfigProperty<K> {
    this.properties.push(property as ConfigProperty);
    const value = this.store.get(property);
    if (value !== property.def) property.changed(value);
    return property;
  }

  public addString(
    id: string, name: string, def: string, description: string,
    changed: (value: string) => void,
  ): IConfigProperty<"string"> {
    return this.add({ type: "string", id, name, description, def, changed });
  }

  public addBoolean(
    id: string, name: string, def: boolean, description: string,
    changed: (value: boolean) => void,
  ): IConfigProperty<"boolean"> {
    return this.add({ type: "boolean", id, name, description, def, changed });
  }

  public addOption(
    id: string, name: string, def: string, choices: Array<{ key: string, value: string }>, description: string,
    changed: (value: string) => void,
  ): IConfigProperty<"option"> {
    return this.add({ type: "option", id, name, description, choices, def, changed });
  }

  public addInt(
    id: string, name: string, def: number, min: number, max: number, description: string,
    changed: (value: number) => void,
  ): IConfigProperty<"int"> {
    return this.add({ type: "int", id, name, description, def, min, max, changed });
  }
}
