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

export class CircumscribeTrack extends BaseAnimationTrack {
  private shapeType: CircumscribeShape;
  private shapeColor: string;
  private buff: number;
  private strokeWidth: number;
  private timeWidth: number;
  private shouldFadeOut: boolean;
  private shapeMobject: Rectangle | Circle | null = null;
  private bounds: { width: number; height: number } = { width: 1, height: 1 };
  private center: Vec3 = [0, 0, 0];

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
    this.shouldFadeOut = options.fadeOut ?? true;
  }

  prepare(): void {
    this._destroyShape();
    this.bounds = { width: 1, height: 1 };
  }

  captureStartState(): void {
    this._destroyShape();
    this.center = [...this.mobject.getCenter()] as Vec3;

    // Recursively collect points from all children (works for VMobject, VGroup, MathTex, etc.)
    const allPoints: [number, number, number][] = [];
    const collectPoints = (mob: any) => {
      if (mob.points3D && !(mob.children?.length)) {
        allPoints.push(...mob.points3D);
      }
      if (mob.children) {
        for (const child of mob.children) collectPoints(child);
      }
    };
    collectPoints(this.mobject);

    if (allPoints.length > 0) {
      const xs = allPoints.map(p => p[0]);
      const ys = allPoints.map(p => p[1]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      this.bounds = { width: maxX - minX, height: maxY - minY };
      this.center = [(minX + maxX) / 2, (minY + maxY) / 2, 0];
    }

    // Create shape
    const width = this.bounds.width + this.buff * 2;
    const height = this.bounds.height + this.buff * 2;

    if (this.shapeType === 'circle') {
      const radius = Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);
      this.shapeMobject = new Circle({
        radius,
        color: this.shapeColor,
        strokeWidth: this.strokeWidth,
        fillOpacity: 0,
        center: this.center,
      });
    } else {
      this.shapeMobject = new Rectangle({
        width,
        height,
        color: this.shapeColor,
        strokeWidth: this.strokeWidth,
        fillOpacity: 0,
        center: this.center,
      });
    }

    this.shapeMobject.opacity = 0;
    this.mobject.add(this.shapeMobject);
  }

  interpolate(alpha: number): void {
    if (!this.shapeMobject) return;

    if (alpha >= 1 && this.shouldFadeOut) {  // ← only destroy if fadeOut is true
      this._destroyShape();
      return;
    }

    const drawEnd = this.timeWidth;
    const drawAlpha = drawEnd > 0 ? Math.min(1, alpha / drawEnd) : 1;

    if (this.shouldFadeOut && alpha > drawEnd) {
      // Fade out phase
      const fadeAlpha = (alpha - drawEnd) / (1 - drawEnd);
      this.shapeMobject.opacity = 1 - fadeAlpha;
    } else {
      // Draw phase — fully visible once drawing starts
      this.shapeMobject.opacity = drawAlpha > 0 ? 1 : 0;
    }

    if (this.shapeMobject instanceof VMobject) {
      this.shapeMobject.visibleFraction = drawAlpha;
    }

    this.shapeMobject.markDirty();
  }

  dispose(): void {
    this._destroyShape();
  }

  private _destroyShape(): void {
    if (this.shapeMobject) {
      this.shapeMobject.opacity = 0;
      this.shapeMobject.markDirty();
      this.mobject.remove(this.shapeMobject);
      this.shapeMobject = null;
    }
  }
}

export function circumscribe(mob: Mobject, options?: CircumscribeOptions): CircumscribeTrack {
  return new CircumscribeTrack(mob, options);
}
