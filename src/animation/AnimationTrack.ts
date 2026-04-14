import type { Mobject } from '../core/Mobject';
import type { RateFunction } from '../core/types';

/**
 * AnimationTrack — Pure interpolation function for animations.
 * No side effects except setting mobject state.
 * Deterministic: same alpha → same result.
 */
export interface AnimationTrack {
  id: string;
  mobject: Mobject;
  duration: number;
  rateFunc: RateFunction;
  remover: boolean;

  /** Called ONCE at build time when added to Scheduler */
  prepare(): void;

  /** Pure function — deterministic for any alpha in [0, 1] */
  interpolate(alpha: number): void;

  dispose(): void;
}

export abstract class BaseAnimationTrack implements AnimationTrack {
  id = crypto.randomUUID();
  remover = false;

  constructor(
    public mobject: Mobject,
    public duration: number = 1,
    public rateFunc: RateFunction = (t) => t,
  ) {}

  abstract prepare(): void;
  abstract interpolate(alpha: number): void;
  dispose(): void {}
}
