/**
 * WiggleOutThenIn animation track - wiggles outward and back.
 *
 * Scales the mobject outward with rotation oscillation, then returns
 * to original state. Uses there-and-back envelope for smooth motion.
 */

import { BaseAnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { RateFunction, Vec3 } from '../core/types';
import { linear, smoothstep } from '../utils/rateFunctions';
import { lerp, lerpVec3 } from '../utils/math';

const TAU = 2 * Math.PI;

export interface WiggleOutThenInOptions {
  /** Duration of the animation in seconds. Default: 2 */
  duration?: number;
  /** Rate function controlling animation pacing. Default: linear */
  rateFunc?: RateFunction;
  /** Peak scale factor. Default: 1.1 */
  scaleValue?: number;
  /** Maximum rotation angle in radians. Default: 0.01 * TAU (~3.6 degrees) */
  rotationAngle?: number;
  /** Number of rotation oscillations. Default: 6 */
  nWiggles?: number;
  /** Axis to rotate about. Default: [0, 0, 1] (Z axis) */
  rotationAxis?: Vec3;
}

/**
 * There-and-back smooth envelope: ramps to 1 at t=0.5, back to 0 at t=1
 */
function thereAndBackSmooth(t: number): number {
  return t < 0.5 ? smoothstep(2 * t) : smoothstep(2 * (1 - t));
}

/**
 * Wiggle function: sinusoidal oscillation with smooth envelope
 */
function wiggleFunc(t: number, nWiggles: number): number {
  return Math.sin(nWiggles * TAU * t) * thereAndBackSmooth(t);
}

/**
 * WiggleOutThenInTrack — Scale out with rotation oscillation, then back.
 */
export class WiggleOutThenInTrack extends BaseAnimationTrack {
  private startRotation: Vec3;
  private startScale: Vec3;
  private scaleValue: number;
  private rotationAngle: number;
  private nWiggles: number;
  private rotationAxis: Vec3;

  constructor(
    mobject: Mobject,
    options: WiggleOutThenInOptions = {},
  ) {
    const duration = options.duration ?? 2;
    const rateFunc = options.rateFunc ?? linear;
    super(mobject, duration, rateFunc);
    this.scaleValue = options.scaleValue ?? 1.1;
    this.rotationAngle = options.rotationAngle ?? 0.01 * TAU;
    this.nWiggles = options.nWiggles ?? 6;
    this.rotationAxis = options.rotationAxis ?? [0, 0, 1];
    this.startRotation = [...mobject.rotation] as Vec3;
    this.startScale = [...mobject.scale] as Vec3;
  }

  prepare(): void {
    this.startRotation = [...this.mobject.rotation] as Vec3;
    this.startScale = [...this.mobject.scale] as Vec3;
  }

  interpolate(alpha: number): void {
    // Scale: there-and-back envelope, peaks at alpha=0.5
    const scaleAlpha = thereAndBackSmooth(alpha);
    const currentScaleFactor = lerp(1, this.scaleValue, scaleAlpha);
    this.mobject.scale = [
      this.startScale[0] * currentScaleFactor,
      this.startScale[1] * currentScaleFactor,
      this.startScale[2] * currentScaleFactor,
    ];

    // Rotation: sinusoidal oscillation with smooth envelope
    const currentAngle = wiggleFunc(alpha, this.nWiggles) * this.rotationAngle;

    // Apply rotation around the specified axis
    if (this.rotationAxis[2] !== 0) {
      this.mobject.rotation = [
        this.startRotation[0],
        this.startRotation[1],
        this.startRotation[2] + currentAngle,
      ];
    } else if (this.rotationAxis[0] !== 0) {
      this.mobject.rotation = [
        this.startRotation[0] + currentAngle,
        this.startRotation[1],
        this.startRotation[2],
      ];
    } else if (this.rotationAxis[1] !== 0) {
      this.mobject.rotation = [
        this.startRotation[0],
        this.startRotation[1] + currentAngle,
        this.startRotation[2],
      ];
    }

    this.mobject.markDirty();
  }
}

/**
 * Create a WiggleOutThenIn animation track.
 * @param mob The mobject to wiggle
 * @param options WiggleOutThenIn options (scaleValue, rotationAngle, nWiggles)
 */
export function wiggleOutThenIn(mob: Mobject, options?: WiggleOutThenInOptions): WiggleOutThenInTrack {
  return new WiggleOutThenInTrack(mob, options);
}
