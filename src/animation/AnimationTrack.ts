import type { Mobject } from '../core/Mobject';
import type { RateFunction } from '../core/types';

/**
 * AnimationTrack lifecycle:
 * - prepare(): reset transient state and helper resources for a fresh evaluation pass
 * - captureStartState(): read the live state this track should animate from
 * - interpolate(alpha): apply animation using captured state + track config
 */
export interface AnimationTrack {
  id: string;
  mobject: Mobject;
  duration: number;
  rateFunc: RateFunction;
  remover: boolean;

  /** Scheduler setup/reset hook. Must not capture live start state here. */
  prepare(): void;

  /** Capture live mobject state at this track's resolved start time. */
  captureStartState?(): void;

  /** Apply animation for any alpha in [0, 1] using already-captured state. */
  interpolate(alpha: number): void;

  dispose(): void;
  reset?(): void;
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
  captureStartState(): void {}
  abstract interpolate(alpha: number): void;
  dispose(): void {}
}
