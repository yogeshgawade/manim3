/**
 * FocusOn animation track - creates converging rings effect.
 *
 * Creates expanding rings that focus attention on the mobject.
 */

import { BaseAnimationTrack } from './AnimationTrack';
import { Mobject } from '../core/Mobject';
import { VMobject } from '../core/VMobject';
import type { RateFunction, Vec3 } from '../core/types';
import { GRAY, DEFAULT_STROKE_WIDTH } from '../constants/colors';
import { smooth } from '../utils/rateFunctions';
import { Circle } from '../mobjects/geometry/Circle';

export interface FocusOnOptions {
  /** Duration of the animation in seconds. Default: 0.5 */
  duration?: number;
  /** Rate function controlling animation pacing. Default: smooth */
  rateFunc?: RateFunction;
  /** Color of the focus effect. Default: GRAY */
  color?: string;
  /** Starting radius. Default: 2 */
  startRadius?: number;
  /** Ending radius (shrinks down to this). Default: 0.5 */
  endRadius?: number;
  /** Number of rings. Default: 5 */
  numRings?: number;
  /** Stroke width. Default: DEFAULT_STROKE_WIDTH */
  strokeWidth?: number;
  /** Opacity of the rings. Default: 0.5 */
  opacity?: number;
}

/**
 * FocusOnTrack — Converging rings focusing on mobject.
 */
export class FocusOnTrack extends BaseAnimationTrack {
  private focusColor: string;
  private startRadius: number;
  private endRadius: number;
  private numRings: number;
  private strokeWidth: number;
  private ringOpacity: number;
  private rings: Circle[] = [];
  private center: Vec3 = [0, 0, 0];
  private prepared = false;

  constructor(
    mobject: Mobject,
    options: FocusOnOptions = {},
  ) {
    const duration = options.duration ?? 0.5;
    const rateFunc = options.rateFunc ?? smooth;
    super(mobject, duration, rateFunc);
    this.focusColor = options.color ?? GRAY;
    this.startRadius = options.startRadius ?? 2;
    this.endRadius = options.endRadius ?? 0.5;
    this.numRings = options.numRings ?? 5;
    this.strokeWidth = options.strokeWidth ?? DEFAULT_STROKE_WIDTH;
    this.ringOpacity = options.opacity ?? 0.5;
  }

  prepare(): void {
    if (this.prepared) return;
    this.prepared = true;

    this.center = this.mobject.getCenter();

    // Create concentric rings as child mobjects
    // Spread rings across radius range so they're visible
    for (let i = 0; i < this.numRings; i++) {
      const spreadProgress = i / (this.numRings - 1 || 1);
      const initialRadius = this.startRadius + (this.endRadius - this.startRadius) * spreadProgress;
      const ring = new Circle({
        radius: initialRadius,
        color: this.focusColor,
        strokeWidth: this.strokeWidth,
        fillOpacity: 0,
      });
      ring.position = this.center;
      ring.opacity = 0;
      // Store ring index and speed for animation
      (ring as any)._ringIndex = i;
      (ring as any)._ringSpeed = 1 + i * 0.2; // Faster rings catch up
      this.rings.push(ring);
      this.mobject.add(ring);
    }
  }

  interpolate(alpha: number): void {
    this.rings.forEach((ring, i) => {
      // Stagger the rings - each one slightly delayed
      const ringDelay = i / (this.numRings * 2);
      const adjustedAlpha = Math.max(0, Math.min(1, (alpha - ringDelay) / (1 - ringDelay)));

      // Calculate radius: starts large, shrinks to end
      const radius = this.startRadius + (this.endRadius - this.startRadius) * adjustedAlpha;

      // Calculate opacity: visible in middle, fades at end
      let opacity: number;
      if (adjustedAlpha < 0.1) {
        // Fade in
        opacity = (adjustedAlpha / 0.1) * this.ringOpacity;
      } else if (adjustedAlpha > 0.8) {
        // Fade out
        opacity = (1 - (adjustedAlpha - 0.8) / 0.2) * this.ringOpacity;
      } else {
        opacity = this.ringOpacity;
      }

      // Update ring radius so it actually converges
      (ring as any).setRadius?.(radius);
      ring.position = this.center;
      ring.opacity = opacity;
      ring.markDirty();
    });
  }

  dispose(): void {
    for (const ring of this.rings) {
      this.mobject.remove(ring);
    }
    this.rings = [];
  }
}

/**
 * Create a FocusOn animation track.
 * @param mob The mobject to focus on
 * @param options FocusOn options (color, startRadius, endRadius, numRings)
 */
export function focusOn(mob: Mobject, options?: FocusOnOptions): FocusOnTrack {
  return new FocusOnTrack(mob, options);
}
