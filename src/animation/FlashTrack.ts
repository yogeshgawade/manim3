/**
 * Flash animation track - creates radiating flash lines from mobject center.
 *
 * Creates temporary line mobjects that flash outward and fade.
 */

import { BaseAnimationTrack } from './AnimationTrack';
import { Mobject } from '../core/Mobject';
import { VMobject } from '../core/VMobject';
import type { RateFunction, Vec3 } from '../core/types';
import { YELLOW, DEFAULT_STROKE_WIDTH } from '../constants/colors';
import { smooth } from '../utils/rateFunctions';
import { Line } from '../mobjects/geometry/Line';

export interface FlashOptions {
  /** Duration of the animation in seconds. Default: 0.5 */
  duration?: number;
  /** Rate function controlling animation pacing. Default: smooth */
  rateFunc?: RateFunction;
  /** Color of the flash lines. Default: YELLOW */
  color?: string;
  /** Number of flash lines. Default: 8 */
  numLines?: number;
  /** Maximum radius the flash extends to. Default: 1 */
  flashRadius?: number;
  /** Width of flash lines. Default: DEFAULT_STROKE_WIDTH */
  lineWidth?: number;
}

/**
 * FlashTrack — Radiating flash lines from mobject center.
 */
export class FlashTrack extends BaseAnimationTrack {
  private flashColor: string;
  private numLines: number;
  private flashRadius: number;
  private lineWidth: number;
  private flashLines: Line[] = [];
  private center: Vec3 = [0, 0, 0];
  private prepared = false;

  constructor(
    mobject: Mobject,
    options: FlashOptions = {},
  ) {
    const duration = options.duration ?? 0.5;
    const rateFunc = options.rateFunc ?? smooth;
    super(mobject, duration, rateFunc);
    this.flashColor = options.color ?? YELLOW;
    this.numLines = options.numLines ?? 8;
    this.flashRadius = options.flashRadius ?? 1;
    this.lineWidth = options.lineWidth ?? DEFAULT_STROKE_WIDTH;
  }

  prepare(): void {
    if (this.prepared) return;
    this.prepared = true;

    this.center = this.mobject.getCenter();

    // Create flash lines as child mobjects
    for (let i = 0; i < this.numLines; i++) {
      const angle = (i / this.numLines) * Math.PI * 2;
      // Create line with small initial length (0.1) so it renders properly
      const innerX = this.center[0] + Math.cos(angle) * 0.1;
      const innerY = this.center[1] + Math.sin(angle) * 0.1;
      const line = new Line({
        start: [...this.center] as Vec3,
        end: [innerX, innerY, this.center[2]] as Vec3,
        color: this.flashColor,
        strokeWidth: this.lineWidth,
      });
      // Store angle for interpolation
      (line as any)._flashAngle = angle;
      line.opacity = 0;
      line.fillOpacity = 0;
      this.flashLines.push(line);
      this.mobject.add(line);
    }
  }

  interpolate(alpha: number): void {
    // Flash grows outward and fades
    const currentRadius = this.flashRadius * alpha;
    const opacity = 1 - alpha;

    for (const line of this.flashLines) {
      const angle = (line as any)._flashAngle as number;
      const innerX = this.center[0] + Math.cos(angle) * 0.1;
      const innerY = this.center[1] + Math.sin(angle) * 0.1;
      const outerX = this.center[0] + Math.cos(angle) * currentRadius;
      const outerY = this.center[1] + Math.sin(angle) * currentRadius;

      // Update line endpoints
      line.setStart([innerX, innerY, this.center[2]] as Vec3);
      line.setEnd([outerX, outerY, this.center[2]] as Vec3);
      line.opacity = opacity;
      line.markDirty();
    }
  }

  dispose(): void {
    // Remove flash lines
    for (const line of this.flashLines) {
      this.mobject.remove(line);
    }
    this.flashLines = [];
  }
}

/**
 * Create a Flash animation track.
 * @param mob The mobject to flash around
 * @param options Flash options (color, numLines, flashRadius, lineWidth)
 */
export function flash(mob: Mobject, options?: FlashOptions): FlashTrack {
  return new FlashTrack(mob, options);
}
