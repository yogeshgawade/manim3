/**
 * ShrinkTrack.ts
 * Shrink animations - opposite of growing animations
 * Ported from Python Manim's ShrinkToCenter
 */

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
 * ShrinkToCenterTrack - Scales a mobject down to 0 at its center (reverse of GrowFromCenter)
 */
export class ShrinkToCenterTrack extends BaseAnimationTrack {
  private startScale: Vec3 | null = null;
  private endScale: Vec3 | null = null;
  private _prepared = false;

  constructor(
    mobject: Mobject,
    duration: number = 1,
    rateFunc: RateFunction = (t: number) => t,
  ) {
    super(mobject, duration, rateFunc);
  }

  prepare(): void {
    this._prepared = false;
    this.startScale = null;
    this.endScale = null;
  }

  captureStartState(): void {
    if (this._prepared) return;
    this._prepared = true;
    this.startScale = [...this.mobject.scale] as Vec3;
    this.endScale = [0, 0, 0];
  }

  interpolate(alpha: number): void {
    if (this.startScale === null || this.endScale === null) {
      return;
    }
    this.mobject.scale = lerpVec3(this.startScale, this.endScale!, alpha);
    this.mobject.markDirty();
  }

  dispose(): void {
    // No cleanup needed
  }
}

// Factory function
export function shrinkToCenter(
  mobject: Mobject,
  duration: number = 1,
  rateFunc?: RateFunction,
): ShrinkToCenterTrack {
  return new ShrinkToCenterTrack(mobject, duration, rateFunc);
}
