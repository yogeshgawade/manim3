/**
 * Circumscribe animation track - draws a shape around the mobject.
 *
 * Draws a rectangle or circle around a mobject to highlight it,
 * then optionally fades it away.
 */

import { BaseAnimationTrack } from './AnimationTrack';
import { Mobject } from '../core/Mobject';
import { VMobject } from '../core/VMobject';
import type { RateFunction, Vec3 } from '../core/types';
import { YELLOW, DEFAULT_STROKE_WIDTH } from '../constants/colors';
import { smooth } from '../utils/rateFunctions';
import { Rectangle } from '../mobjects/geometry/Rectangle';
import { Circle } from '../mobjects/geometry/Circle';

export type CircumscribeShape = 'rectangle' | 'circle';

export interface CircumscribeOptions {
  /** Duration of the animation in seconds. Default: 1 */
  duration?: number;
  /** Rate function controlling animation pacing. Default: smooth */
  rateFunc?: RateFunction;
  /** Shape to draw. Default: 'rectangle' */
  shape?: CircumscribeShape;
  /** Color of the circumscribe shape. Default: YELLOW */
  color?: string;
  /** Buffer space between mobject and shape. Default: 0.2 */
  buff?: number;
  /** Width of the shape stroke. Default: DEFAULT_STROKE_WIDTH */
  strokeWidth?: number;
  /** Time proportion to draw the shape (0-1). Default: 0.7 */
  timeWidth?: number;
  /** Whether to fade out after drawing. Default: true */
  fadeOut?: boolean;
}

/**
 * CircumscribeTrack — Draw shape around mobject.
 */
export class CircumscribeTrack extends BaseAnimationTrack {
  private shapeType: CircumscribeShape;
  private shapeColor: string;
  private buff: number;
  private strokeWidth: number;
  private timeWidth: number;
  private fadeOut: boolean;
  private shapeMobject: Rectangle | Circle | null = null;
  private prepared = false;
  private bounds: { width: number; height: number } = { width: 1, height: 1 };

  constructor(
    mobject: Mobject,
    options: CircumscribeOptions = {},
  ) {
    const duration = options.duration ?? 1;
    const rateFunc = options.rateFunc ?? smooth;
    super(mobject, duration, rateFunc);
    this.shapeType = options.shape ?? 'rectangle';
    this.shapeColor = options.color ?? YELLOW;
    this.buff = options.buff ?? 0.2;
    this.strokeWidth = options.strokeWidth ?? DEFAULT_STROKE_WIDTH;
    this.timeWidth = options.timeWidth ?? 0.7;
    this.fadeOut = options.fadeOut ?? true;
  }

  prepare(): void {
    if (this.prepared) return;
    this.prepared = true;

    // Estimate bounds based on mobject and calculate actual geometric center
    let center: Vec3 = [...this.mobject.getCenter()] as Vec3;

    if (this.mobject instanceof VMobject) {
      const vmob = this.mobject as VMobject;
      const points = vmob.points3D;
      if (points.length > 0) {
        const xs = points.map(p => p[0]);
        const ys = points.map(p => p[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        this.bounds = {
          width: maxX - minX,
          height: maxY - minY,
        };
        // Calculate actual geometric center from bounds
        center = [(minX + maxX) / 2, (minY + maxY) / 2, 0];
      }
    }

    // Create the circumscribe shape
    const width = this.bounds.width + this.buff * 2;
    const height = this.bounds.height + this.buff * 2;

    if (this.shapeType === 'circle') {
      const radius = Math.max(width, height) / 2;
      this.shapeMobject = new Circle({
        radius,
        color: this.shapeColor,
        strokeWidth: this.strokeWidth,
        fillOpacity: 0,
        center,
      });
    } else {
      this.shapeMobject = new Rectangle({
        width,
        height,
        color: this.shapeColor,
        strokeWidth: this.strokeWidth,
        fillOpacity: 0,
        center,
      });
    }

    this.shapeMobject.opacity = 0;
    this.mobject.add(this.shapeMobject);
  }

  interpolate(alpha: number): void {
    if (!this.shapeMobject) return;

    const drawEnd = this.timeWidth;
    const drawAlpha = drawEnd > 0 ? Math.min(1, alpha / drawEnd) : 1;

    if (this.fadeOut && alpha > drawEnd) {
      // Fade out phase
      const fadeAlpha = (alpha - drawEnd) / (1 - drawEnd);
      this.shapeMobject.opacity = 1 - fadeAlpha;
    } else {
      // Draw phase
      this.shapeMobject.opacity = 1;
    }

    // Animate visibleFraction for progressive drawing effect
    if (this.shapeMobject instanceof VMobject) {
      this.shapeMobject.visibleFraction = drawAlpha;
    }

    this.shapeMobject.markDirty();
  }

  dispose(): void {
    if (this.shapeMobject) {
      this.mobject.remove(this.shapeMobject);
      this.shapeMobject = null;
    }
  }
}

/**
 * Create a Circumscribe animation track.
 * @param mob The mobject to circumscribe
 * @param options Circumscribe options (shape, color, buff, strokeWidth)
 */
export function circumscribe(mob: Mobject, options?: CircumscribeOptions): CircumscribeTrack {
  return new CircumscribeTrack(mob, options);
}
