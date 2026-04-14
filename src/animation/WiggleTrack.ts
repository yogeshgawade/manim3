/**
 * Wiggle animation track - makes a mobject wiggle back and forth.
 *
 * Rotates the mobject back and forth around a point with optional scaling.
 */

import { BaseAnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { RateFunction, Vec3 } from '../core/types';
import { linear, easeInOutSine } from '../utils/rateFunctions';
import { lerpVec3 } from '../utils/math';

export interface WiggleOptions {
  /** Duration of the animation in seconds. Default: 1 */
  duration?: number;
  /** Rate function controlling animation pacing. Default: linear */
  rateFunc?: RateFunction;
  /** Maximum rotation angle in radians. Default: PI/12 (15 degrees) */
  rotationAngle?: number;
  /** Number of wiggles. Default: 6 */
  nWiggles?: number;
  /** Scale factor at peak of wiggle. Default: 1.1 */
  scaleFactor?: number;
  /** Axis to rotate about as [x, y, z]. Default: [0, 0, 1] (Z axis) */
  rotationAxis?: Vec3;
}

/**
 * WiggleTrack — Rotation oscillation with optional scale envelope.
 */
export class WiggleTrack extends BaseAnimationTrack {
  private startRotation: Vec3;
  private startScale: Vec3;
  private rotationAngle: number;
  private nWiggles: number;
  private scaleFactor: number;
  private rotationAxis: Vec3;

  constructor(
    mobject: Mobject,
    options: WiggleOptions = {},
  ) {
    const duration = options.duration ?? 1;
    const rateFunc = options.rateFunc ?? linear;
    super(mobject, duration, rateFunc);
    this.rotationAngle = options.rotationAngle ?? Math.PI / 12;
    this.nWiggles = options.nWiggles ?? 6;
    this.scaleFactor = options.scaleFactor ?? 1.1;
    this.rotationAxis = options.rotationAxis ?? [0, 0, 1];
    this.startRotation = [...mobject.rotation] as Vec3;
    this.startScale = [...mobject.scale] as Vec3;
  }

  prepare(): void {
    this.startRotation = [...this.mobject.rotation] as Vec3;
    this.startScale = [...this.mobject.scale] as Vec3;
  }

  interpolate(alpha: number): void {
    // Calculate wiggle angle using sine wave
    // Multiple oscillations during the animation
    const wigglePhase = alpha * this.nWiggles * Math.PI * 2;

    // Amplitude envelope: starts at 0, peaks in middle, returns to 0
    // Using sin^2 for smooth envelope
    const envelope = Math.sin(alpha * Math.PI);

    // Current rotation angle
    const currentAngle = Math.sin(wigglePhase) * this.rotationAngle * envelope;

    // Apply rotation around the specified axis
    // For simplicity, we rotate around Z by default (2D rotation)
    if (this.rotationAxis[2] !== 0) {
      // Z-axis rotation (2D plane)
      this.mobject.rotation = [
        this.startRotation[0],
        this.startRotation[1],
        this.startRotation[2] + currentAngle,
      ];
    } else if (this.rotationAxis[0] !== 0) {
      // X-axis rotation
      this.mobject.rotation = [
        this.startRotation[0] + currentAngle,
        this.startRotation[1],
        this.startRotation[2],
      ];
    } else if (this.rotationAxis[1] !== 0) {
      // Y-axis rotation
      this.mobject.rotation = [
        this.startRotation[0],
        this.startRotation[1] + currentAngle,
        this.startRotation[2],
      ];
    }

    // Scale: peaks at middle of animation
    const scaleEnvelope = Math.sin(alpha * Math.PI);
    const currentScaleFactor = 1 + (this.scaleFactor - 1) * scaleEnvelope;
    this.mobject.scale = [
      this.startScale[0] * currentScaleFactor,
      this.startScale[1] * currentScaleFactor,
      this.startScale[2] * currentScaleFactor,
    ];

    this.mobject.markDirty();
  }
}

/**
 * Create a Wiggle animation track.
 * @param mob The mobject to wiggle
 * @param options Wiggle options (rotationAngle, nWiggles, scaleFactor, rotationAxis)
 */
export function wiggle(mob: Mobject, options?: WiggleOptions): WiggleTrack {
  return new WiggleTrack(mob, options);
}
