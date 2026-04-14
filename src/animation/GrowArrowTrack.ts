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
    if (this._prepared) return;
    this._prepared = true;

    const arrow = this.mobject as Arrow;

    // Capture target state only
    this.endScale = [...arrow.scale] as Vec3;
    this.targetColor = arrow.color;
    this._finalPos = [...arrow.position] as Vec3;

    // Save original color if needed
    if (this.pointColor) {
      this.originalColor = arrow.color;
    }
  }

  interpolate(alpha: number): void {
    const arrow = this.mobject as Arrow;

    // On first call, set the starting state
    if (this.endScale === null) {
      this.endScale = [1, 1, 1];
    }
    if (this._finalPos === null) {
      this._finalPos = [...arrow.position] as Vec3;
    }

    // Apply initial state on first frame
    if (arrow.scale[0] !== 0 && alpha < 0.01) {
      arrow.scale = [0, 0, 0];
      arrow.position = [...this.startPoint] as Vec3;
      if (this.pointColor && this.originalColor) {
        arrow.color = this.pointColor;
      }
    }

    // Interpolate scale from 0 to endScale
    const startScale: Vec3 = [0, 0, 0];
    arrow.scale = lerpVec3(startScale, this.endScale, alpha);

    // Interpolate position to maintain start point as anchor
    // When scaling grows, position shifts from start point toward final position
    arrow.position = lerpVec3(this.startPoint, this._finalPos!, alpha);

    // Interpolate color if pointColor was specified
    if (this.pointColor && this.targetColor && this.originalColor) {
      arrow.color = alpha > 0.5 ? this.targetColor : this.originalColor;
    }

    arrow.markDirty();
  }
}

// Factory functions

/**
 * Grow an Arrow from its start point toward its tip.
 */
export function growArrow(
  arrow: Arrow,
  duration = 1,
  rateFunc?: RateFunction,
): GrowArrowTrack {
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
