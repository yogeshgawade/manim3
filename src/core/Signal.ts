// Plain TypeScript — zero Three.js, not a Mobject subclass.
export class Signal<T> {
  private _value: T;
  private listeners: Array<(value: T, prev: T) => void> = [];

  constructor(initial: T) {
    this._value = initial;
  }

  get(): T {
    return this._value;
  }

  set(value: T): void {
    const prev  = this._value;
    this._value = value;
    for (const fn of this.listeners) fn(value, prev);
  }

  onChange(fn: (value: T, prev: T) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  dispose(): void {
    this.listeners = [];
  }
}

export const signal = <T>(initial: T): Signal<T> => new Signal(initial);

export function derived<T>(
  fn: () => T,
  deps: Signal<any>[],
): Signal<T> {
  const s = new Signal<T>(fn());
  for (const dep of deps) {
    dep.onChange(() => s.set(fn()));
  }
  return s;
}
