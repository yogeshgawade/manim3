import { BaseAnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { RateFunction, Vec3 } from '../core/types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export class CrossfadeTrack extends BaseAnimationTrack {
  private source: Mobject;
  private target: Mobject;
  private startPos: Vec3 | null = null;
  private endPos: Vec3 | null = null;

  constructor(
    source: Mobject,
    target: Mobject,
    duration: number = 2,
    rateFunc: RateFunction = (t) => t,
  ) {
    super(source, duration, rateFunc);
    this.source = source;
    this.target = target;
    this.remover = true;
  }

  prepare(): void {
    // Reset so positions are re-captured on next interpolate()
    // This makes replay safe — stale positions are cleared every schedule build
    this.startPos = null;
    this.endPos = null;
  }

  interpolate(alpha: number): void {
    // Capture positions lazily on first call — this is when moveTo() has
    // already set source to its moved position during playback
    if (this.startPos === null || this.endPos === null) {
      this.startPos = [...this.source.position] as Vec3;
      this.endPos   = [...this.target.position] as Vec3;

      // Place target at source's current position, hidden
      this.target.position = [...this.startPos] as Vec3;
      this.target.opacity  = 0;
      this.target.visible  = true;
      this.target.markDirty();
    }

    const pos = lerpVec3(this.startPos, this.endPos, alpha);

    // Source: fades out while moving toward target position
    this.source.opacity  = 1 - alpha;
    this.source.position = [...pos] as Vec3;
    this.source.markDirty();

    // Target: fades in while moving from source position to target position
    this.target.opacity  = alpha;
    this.target.position = [...pos] as Vec3;
    this.target.markDirty();
  }
}

export function crossFade(
  source: Mobject,
  target: Mobject,
  duration = 2,
  rateFunc?: RateFunction,
): CrossfadeTrack {
  return new CrossfadeTrack(source, target, duration, rateFunc);
}