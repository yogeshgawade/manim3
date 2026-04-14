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
    // Capture current state as start, target as end
    // Note: We do NOT modify mobject here - let it stay at current state
    // The interpolate() will apply changes when animation runs
  }

  interpolate(alpha: number): void {
    const opacity = this.startOpacity + (this.endOpacity - this.startOpacity) * alpha;
    this.mobject.opacity = opacity;
    this.mobject.markDirty();
  }
}

// Factory functions
export function fadeIn(mob: Mobject, duration = 1, rateFunc?: RateFunction): FadeTrack {
  return new FadeTrack(mob, 0, 1, duration, rateFunc);
}

export function fadeOut(mob: Mobject, duration = 1, rateFunc?: RateFunction): FadeTrack {
  const track = new FadeTrack(mob, 1, 0, duration, rateFunc);
  track.remover = true;
  return track;
}
