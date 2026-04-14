import { BaseAnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { RateFunction, Vec3 } from '../core/types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/**
 * ScaleTrack — Interpolates scale from one value to another.
 * If `from` is null, the start scale is captured when the animation begins.
 */
export class ScaleTrack extends BaseAnimationTrack {
  private startScale: Vec3 | null;
  private endScale: Vec3;

  constructor(
    mobject: Mobject,
    from: number | Vec3 | null,
    to: number | Vec3,
    duration: number = 1,
    rateFunc: RateFunction = (t) => t,
  ) {
    super(mobject, duration, rateFunc);
    this.startScale = from === null ? null : (typeof from === 'number' ? [from, from, 1] : from);
    this.endScale = typeof to === 'number' ? [to, to, 1] : to;
  }

  prepare(): void {
    // Defer start scale capture until animation begins
  }

  interpolate(alpha: number): void {
    // Capture start scale on first frame if not set
    if (this.startScale === null) {
      this.startScale = [...this.mobject.scale] as Vec3;
    }
    this.mobject.scale = lerpVec3(this.startScale, this.endScale, alpha);
    this.mobject.markDirty();
  }
}

// Factory function
// Passes null for start scale so it's captured when animation begins
export function scaleTo(mob: Mobject, target: number | Vec3, duration = 1, rateFunc?: RateFunction): ScaleTrack {
  const targetVec = typeof target === 'number' ? [target, target, 1] as Vec3 : target;
  return new ScaleTrack(mob, null, targetVec, duration, rateFunc);
}
