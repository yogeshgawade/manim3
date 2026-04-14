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
 * RotateTrack — Interpolates rotation (Euler angles) from one value to another.
 */
export class RotateTrack extends BaseAnimationTrack {
  private startRotation: Vec3;
  private endRotation: Vec3;

  constructor(
    mobject: Mobject,
    from: Vec3,
    to: Vec3,
    duration: number = 1,
    rateFunc: RateFunction = (t) => t,
  ) {
    super(mobject, duration, rateFunc);
    this.startRotation = from;
    this.endRotation = to;
  }

  prepare(): void {
  }

  interpolate(alpha: number): void {
    this.mobject.rotation = lerpVec3(this.startRotation, this.endRotation, alpha);
    this.mobject.markDirty();
  }
}

// Factory function
export function rotateTo(mob: Mobject, target: Vec3, duration = 1, rateFunc?: RateFunction): RotateTrack {
  return new RotateTrack(mob, mob.rotation, target, duration, rateFunc);
}
