/**
 * Indicate animation track - draws attention by scaling and changing color.
 *
 * Scales the mobject up to a peak scale factor while changing to a highlight
 * color, then returns to original state. Uses thereAndBack rate function
 * by default for smooth motion.
 */

import { BaseAnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { RateFunction, Vec3 } from '../core/types';
import { YELLOW } from '../constants/colors';
import { thereAndBack } from '../utils/rateFunctions';
import { lerpColor } from '../utils/math';

export interface IndicateOptions {
  /** Duration of the animation in seconds. Default: 1 */
  duration?: number;
  /** Rate function controlling animation pacing. Default: thereAndBack */
  rateFunc?: RateFunction;
  /** Scale factor at peak of indication. Default: 1.2 */
  scaleFactor?: number;
  /** Highlight color. Default: YELLOW */
  color?: string;
}

/**
 * IndicateTrack — Scale up/down with color change.
 */
export class IndicateTrack extends BaseAnimationTrack {
  private startScale: Vec3;
  private startColor: string;
  private scaleFactor: number;
  private indicateColor: string;

  constructor(
    mobject: Mobject,
    options: IndicateOptions = {},
  ) {
    const duration = options.duration ?? 1;
    const rateFunc = options.rateFunc ?? thereAndBack;
    super(mobject, duration, rateFunc);
    this.scaleFactor = options.scaleFactor ?? 1.2;
    this.indicateColor = options.color ?? YELLOW;
    this.startScale = [...mobject.scale] as Vec3;
    this.startColor = mobject.color;
  }

  prepare(): void {
    // Capture initial state
    this.startScale = [...this.mobject.scale] as Vec3;
    this.startColor = this.mobject.color;
  }

  interpolate(alpha: number): void {
    // Scale: 1 -> scaleFactor -> 1 using rate function's alpha
    // alpha goes 0->1->0 with thereAndBack rate function
    const scaleMultiplier = 1 + (this.scaleFactor - 1) * alpha;
    this.mobject.scale = [
      this.startScale[0] * scaleMultiplier,
      this.startScale[1] * scaleMultiplier,
      this.startScale[2] * scaleMultiplier,
    ];

    // Color interpolation
    this.mobject.color = lerpColor(this.startColor, this.indicateColor, alpha);
    this.mobject.markDirty();
  }
}

/**
 * Create an Indicate animation track.
 * @param mob The mobject to indicate
 * @param options Indicate options (scaleFactor, color, duration, rateFunc)
 */
export function indicate(mob: Mobject, options?: IndicateOptions): IndicateTrack {
  return new IndicateTrack(mob, options);
}
