import { ComputerAccess } from "./access";
import startup, { ComputerFactory, ICallbacks, IConfigGroup } from "./classes";

export type ConfigFactory = (name: string, description: string | null) => IConfigGroup;

export class Callbacks implements ICallbacks {
  public readonly config: ConfigFactory;

  private factory?: ComputerFactory;
  private ticker?: () => void;
  private readonly tasks: Array<() => void> = [];

  constructor(config: ConfigFactory) {
    this.config = config;
  }

  public setFactory(factory: ComputerFactory): void {
    this.factory = factory;
  }

  public setTick(callback: () => void): void {
    this.ticker = callback;
  }

  public queueImmediate(callback: () => void): void {
    this.tasks.push(callback);
  }

  public makeComputer(id: number, colour: boolean, computerAccess: ComputerAccess) {
    if (!this.factory) throw new Error("No factory set");

    this.factory(id, computerAccess.getLabel(), colour, computerAccess);
  }

  public tick(): void {
    const startTime = Date.now();

    if (this.ticker) this.ticker();

    while (Date.now() - startTime < 30) {
      const event = this.tasks.shift();
      if (!event) break;

      event();
    }
  }
}

export const start = (config: ConfigFactory): Callbacks => {
  const callbacks = new Callbacks(config);
  startup(callbacks);
  return callbacks;
};
