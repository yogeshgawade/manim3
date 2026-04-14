/**
 * ShowPassingFlash animation track - flash of light traveling along a path.
 *
 * Shows a highlighted portion of a VMobject's stroke traveling along its path.
 */

import { BaseAnimationTrack } from './AnimationTrack';
import { Mobject } from '../core/Mobject';
import { VMobject } from '../core/VMobject';
import type { RateFunction, Vec3 } from '../core/types';
import { YELLOW, DEFAULT_STROKE_WIDTH } from '../constants/colors';
import { linear } from '../utils/rateFunctions';
import { lerp } from '../utils/math';
import { VMobject as VMobjectClass } from '../core/VMobject';
import { Line } from '../mobjects/geometry/Line';

export interface ShowPassingFlashOptions {
  /** Duration of the animation in seconds. Default: 1 */
  duration?: number;
  /** Rate function controlling animation pacing. Default: linear */
  rateFunc?: RateFunction;
  /** Color of the flash. Default: YELLOW */
  color?: string;
  /** Width of the flash as a proportion of the path (0-1). Default: 0.2 */
  timeWidth?: number;
  /** Stroke width of the flash. Default: DEFAULT_STROKE_WIDTH * 1.5 */
  strokeWidth?: number;
}

/**
 * ShowPassingFlashTrack — Flash traveling along mobject path.
 */
export class ShowPassingFlashTrack extends BaseAnimationTrack {
  private flashColor: string;
  private timeWidth: number;
  private flashStrokeWidth: number;
  private pathPoints: number[][] = [];
  private flashSegments: Line[] = [];
  private isVMobject: boolean;
  private prepared = false;

  constructor(
    mobject: Mobject,
    options: ShowPassingFlashOptions = {},
  ) {
    const duration = options.duration ?? 1;
    const rateFunc = options.rateFunc ?? linear;
    super(mobject, duration, rateFunc);
    this.flashColor = options.color ?? YELLOW;
    this.timeWidth = options.timeWidth ?? 0.2;
    this.flashStrokeWidth = options.strokeWidth ?? DEFAULT_STROKE_WIDTH * 1.5;
    this.isVMobject = mobject instanceof VMobjectClass;
  }

  prepare(): void {
    if (this.prepared) return;
    this.prepared = true;

    // Get path points from VMobject or create a simple path
    if (this.isVMobject) {
      const vmob = this.mobject as VMobjectClass;
      this.pathPoints = vmob.points3D.map(p => [...p]);
    } else {
      // For non-VMobjects, create a simple bounding box path
      const center = this.mobject.getCenter();
      // Simple approximation - create a small square around center
      const size = 0.5;
      this.pathPoints = [
        [center[0] - size, center[1] - size, center[2]],
        [center[0] + size, center[1] - size, center[2]],
        [center[0] + size, center[1] + size, center[2]],
        [center[0] - size, center[1] + size, center[2]],
        [center[0] - size, center[1] - size, center[2]],
      ];
    }

    // Pre-create flash segment lines with initial positions from path
    const numSegments = Math.max(1, this.pathPoints.length - 1);
    for (let i = 0; i < numSegments; i++) {
      const idx = i;
      const pt0 = this.pathPoints[idx] || [0, 0, 0];
      const pt1 = this.pathPoints[idx + 1] || pt0;
      const line = new Line({
        start: [pt0[0], pt0[1], pt0[2]] as Vec3,
        end: [pt1[0], pt1[1], pt1[2]] as Vec3,
        color: this.flashColor,
        strokeWidth: this.flashStrokeWidth,
      });
      line.opacity = 0;
      this.flashSegments.push(line);
      this.mobject.add(line);
    }
  }

  interpolate(alpha: number): void {
    if (this.pathPoints.length < 2) return;

    const numPoints = this.pathPoints.length;
    const pathLength = numPoints - 1;

    // Flash center moves along path based on alpha
    const flashCenter = alpha * pathLength;
    const flashHalfWidth = (this.timeWidth * pathLength) / 2;
    const flashStart = flashCenter - flashHalfWidth;
    const flashEnd = flashCenter + flashHalfWidth;

    // Calculate base opacity (fade in at start, fade out at end)
    let baseOpacity = 1;
    if (alpha < this.timeWidth) {
      baseOpacity = alpha / this.timeWidth;
    } else if (alpha > 1 - this.timeWidth) {
      baseOpacity = (1 - alpha) / this.timeWidth;
    }

    // Update flash segments - each covers a portion of the flash
    const numSegments = this.flashSegments.length;
    this.flashSegments.forEach((line, i) => {
      // Each segment covers a portion of the flash length
      const segmentT0 = flashStart + (i / numSegments) * (flashEnd - flashStart);
      const segmentT1 = flashStart + ((i + 1) / numSegments) * (flashEnd - flashStart);

      // Check if segment is on the path
      if (segmentT1 < 0 || segmentT0 > pathLength) {
        line.opacity = 0;
        line.markDirty();
        return;
      }

      // Clamp to path bounds
      const t0 = Math.max(0, Math.min(pathLength, segmentT0));
      const t1 = Math.max(0, Math.min(pathLength, segmentT1));

      // Skip if too small
      if (t1 - t0 < 0.01) {
        line.opacity = 0;
        line.markDirty();
        return;
      }

      // Get interpolated positions along path
      const startPos = this._getPointOnPath(t0);
      const endPos = this._getPointOnPath(t1);

      // Update line
      line.setStart(startPos);
      line.setEnd(endPos);
      line.opacity = baseOpacity;
      line.markDirty();
    });
  }

  /** Get interpolated position along path at parameter t */
  private _getPointOnPath(t: number): Vec3 {
    const numPoints = this.pathPoints.length;
    const maxIdx = numPoints - 1;

    // Clamp t
    t = Math.max(0, Math.min(maxIdx, t));

    // Get integer and fractional parts
    const idx = Math.floor(t);
    const frac = t - idx;

    if (idx >= maxIdx) {
      const last = this.pathPoints[maxIdx];
      return [last[0], last[1], last[2]];
    }

    const p0 = this.pathPoints[idx];
    const p1 = this.pathPoints[idx + 1];

    // Linear interpolation between points
    return [
      p0[0] + (p1[0] - p0[0]) * frac,
      p0[1] + (p1[1] - p0[1]) * frac,
      p0[2] + (p1[2] - p0[2]) * frac,
    ] as Vec3;
  }

  dispose(): void {
    for (const segment of this.flashSegments) {
      this.mobject.remove(segment);
    }
    this.flashSegments = [];
  }
}

/**
 * Create a ShowPassingFlash animation track.
 * @param mob The mobject to show flash on (preferably VMobject)
 * @param options ShowPassingFlash options (color, timeWidth, strokeWidth)
 */
export function showPassingFlash(mob: Mobject, options?: ShowPassingFlashOptions): ShowPassingFlashTrack {
  return new ShowPassingFlashTrack(mob, options);
}
