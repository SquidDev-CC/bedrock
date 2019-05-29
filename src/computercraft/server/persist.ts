const empty = new Int8Array(0);

/**
 * A generic way of storing and loading computer information.
 *
 * This should not be treated as the cannonical source of file information (see {@link ComputerAccess} for that), but
 * rather as a backend for the computer to finally save to.
 */
export interface IComputerPersistance {
  getLabel(): string | null;

  setLabel(label: string | null): void;

  getContents(path: string): Int8Array;

  setContents(path: string, contents: Int8Array): void;

  removeContents(path: string): void;

  getChildren(path: string): string[] | null;

  setChildren(path: string, children: string[]): void;

  removeChildren(path: string): void;
}

/**
 * A persistance instance which saves nothing, useful for temporary file systems.
 */
export class VoidPersistence implements IComputerPersistance {
  public getLabel(): string | null {
    return null;
  }

  public setLabel(): void {
  }

  public getContents(): Int8Array {
    return empty;
  }

  public setContents(): void {
  }

  public removeContents(): void {
  }

  public getChildren(): string[] | null {
    return null;
  }

  public setChildren(): void {
  }

  public removeChildren(): void {
  }
}
