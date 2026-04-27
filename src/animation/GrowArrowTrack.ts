import { BaseAnimationTrack } from './AnimationTrack';
import type { Arrow } from '../mobjects/geometry/Arrow';
import type { RateFunction, Vec3, Color } from '../core/types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/**
 * GrowArrowTrack — Introduces an Arrow by growing it from its start toward its tip.
 *
 * Unlike regular mobjects, Arrow in manim3 is a Group containing shaft and tip.
 * This animation scales the entire arrow about its start point while maintaining
 * the tip proportions.
 */
export class GrowArrowTrack extends BaseAnimationTrack {
  private pointColor: Color | null;
  private startPoint: Vec3;
  private endScale: Vec3 | null = null;
  private originalColor: Color | null = null;
  private targetColor: Color | null = null;
  private _prepared = false;

  constructor(
    arrow: Arrow,
    pointColor: Color | null = null,
    duration: number = 1,
    rateFunc: RateFunction = (t) => t,
  ) {
    super(arrow, duration, rateFunc);
    this.pointColor = pointColor;
    this.startPoint = arrow.getStart();
  }

  private _finalPos: Vec3 | null = null;

  prepare(): void {
    this._prepared = false;
    this.endScale = null;
    this.targetColor = null;
    this.originalColor = null;
    this._finalPos = null;
  }

  captureStartState(): void {
    if (this._prepared) return;
    const arrow = this.mobject as Arrow;
    this._prepared = true;
    this.endScale = [...arrow.scale] as Vec3;
    this.targetColor = arrow.color;
    this._finalPos = [...arrow.position] as Vec3;
    if (this.pointColor) {
      this.originalColor = arrow.color;
    }
    for (const mob of arrow.getFamily()) {
      mob.opacity = 0;
    }
  }

  interpolate(alpha: number): void {
    const arrow = this.mobject as Arrow;
    if (this.endScale === null || this._finalPos === null) {
      return;
    }

    if (alpha === 0) {
      arrow.position = [...this.startPoint] as Vec3;
    }
    if (this.pointColor && this.originalColor) {
      arrow.color = alpha > 0.5 ? this.targetColor! : this.originalColor;
    }

    const startScale: Vec3 = [0, 0, 0];
    arrow.scale = lerpVec3(startScale, this.endScale, alpha);
    arrow.position = lerpVec3(this.startPoint, this._finalPos!, alpha);
    for (const mob of arrow.getFamily()) {
      mob.opacity = 1;
      mob.markDirty();
    }
  }
}

// Options interface for growArrow
export interface GrowArrowOptions {
  duration?: number;
  rateFunc?: RateFunction;
}

// Factory functions

/**
 * Grow an Arrow from its start point toward its tip.
 */
export function growArrow(
  arrow: Arrow,
  options: GrowArrowOptions = {},
): GrowArrowTrack {
  const { duration = 1, rateFunc } = options;
  return new GrowArrowTrack(arrow, null, duration, rateFunc);
}

/**
 * Grow an Arrow from its start point with initial color.
 */
export function growArrowWithColor(
  arrow: Arrow,
  pointColor: Color,
  duration = 1,
  rateFunc?: RateFunction,
): GrowArrowTrack {
  return new GrowArrowTrack(arrow, pointColor, duration, rateFunc);
}
