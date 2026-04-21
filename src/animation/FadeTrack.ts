import { BaseAnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { RateFunction } from '../core/types';

/**
 * FadeTrack — Interpolates opacity from one value to another.
 */
export class FadeTrack extends BaseAnimationTrack {
  private startOpacity: number;
  private endOpacity: number;

  constructor(
    mobject: Mobject,
    from: number,
    to: number,
    duration: number = 1,
    rateFunc: RateFunction = (t) => t,
  ) {
    super(mobject, duration, rateFunc);
    this.startOpacity = from;
    this.endOpacity = to;
  }

  prepare(): void {
    
  }

  interpolate(alpha: number): void {
    const opacity = this.startOpacity + (this.endOpacity - this.startOpacity) * alpha;
    this.mobject.opacity = opacity;
    this.mobject.markDirty();
  }
}
