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
 * MoveTrack — Interpolates position from one point to another.
 * If `from` is null, the start position is captured when the animation begins.
 */
export class MoveTrack extends BaseAnimationTrack {
  private startPos: Vec3 | null;
  private endPos: Vec3;

  constructor(
    mobject: Mobject,
    from: Vec3 | null,
    to: Vec3,
    duration: number = 1,
    rateFunc: RateFunction = (t) => t,
  ) {
    super(mobject, duration, rateFunc);
    this.startPos = from;
    this.endPos = to;
  }

  prepare(): void {
  }

  interpolate(alpha: number): void {
    // Defer start position capture until animation actually runs
    if (this.startPos === null) {
      this.startPos = [...this.mobject.position] as Vec3;
    }
    this.mobject.position = lerpVec3(this.startPos, this.endPos, alpha);
    this.mobject.markDirty();
  }
}

// Factory function
// Passes null for start position so it's captured when animation begins
export function moveTo(mob: Mobject, target: Vec3, duration = 1, rateFunc?: RateFunction): MoveTrack {
  return new MoveTrack(mob, null, target, duration, rateFunc);
}
