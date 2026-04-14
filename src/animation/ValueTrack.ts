// src/animation/ValueTrack.ts
import { BaseAnimationTrack } from './AnimationTrack';
import type { RateFunction } from '../core/types';
import { Mobject } from '../core/Mobject'; // dummy mobject, never rendered

const dummyMobject = new Mobject();

/**
 * Simple scalar ValueTracker, similar to Manim's.
 * - Holds a numeric value.
 * - Can create an AnimationTrack that interpolates this value over time.
 * - Optional onChange callback lets you update mobjects or other state.
 */
export class ValueTracker {
  private _value: number;

  constructor(initial: number) {
    this._value = initial;
  }

  get(): number {
    return this._value;
  }

  set(v: number): void {
    this._value = v;
  }

  /**
   * Create an animation track that animates this value from its current
   * value to `target` over `duration` seconds, using `rateFunc`.
   *
   * onChange is called on every interpolate() with the new value so you
   * can drive mobjects directly.
   */
  animateTo(
    target: number,
    duration = 1,
    rateFunc: RateFunction = (t) => t,
    onChange?: (v: number) => void,
  ): ValueTrack {
    return new ValueTrack(this, target, duration, rateFunc, onChange);
  }
}

/**
 * Under-the-hood track that the Scheduler understands.
 * It has a dummy Mobject so it fits the AnimationTrack API,
 * but it only updates the ValueTracker + optional callback.
 */
export class ValueTrack extends BaseAnimationTrack {
  private start!: number;
  private end: number;
  private started = false;

  constructor(
    private tracker: ValueTracker,
    to: number,
    duration: number,
    rateFunc: RateFunction,
    private onChange?: (v: number) => void,
  ) {
    super(dummyMobject, duration, rateFunc);
    this.end = to;
  }

  prepare(): void {
    // Start value captured on first interpolate()
  }

  interpolate(alpha: number): void {
    // Capture start value on first call (when animation actually starts)
    if (!this.started) {
      this.start = this.tracker.get();
      this.started = true;
    }
    const v = this.start + (this.end - this.start) * alpha;
    this.tracker.set(v);
    if (this.onChange) this.onChange(v);
    // No markDirty here; your onChange callback should do any mobject updates.
  }
}