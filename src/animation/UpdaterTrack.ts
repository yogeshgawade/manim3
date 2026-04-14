import type { Mobject } from '../core/Mobject';

/**
 * UpdaterTrack — Per-frame function runner.
 * Called every frame with delta time.
 */
export class UpdaterTrack {
  constructor(
    public mobject: Mobject,
    private _fn: (mob: Mobject, dt: number) => void,
  ) {}

  tick(dt: number): void {
    this._fn(this.mobject, dt);
  }

  dispose(): void {}
}
