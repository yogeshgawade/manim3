/**
 * Pulse animation track - makes a mobject pulse (scale up and down).
 *
 * Creates a pulsing effect using sine wave modulation of scale.
 */

import { BaseAnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { RateFunction, Vec3 } from '../core/types';
import { smooth } from '../utils/rateFunctions';

export interface PulseOptions {
  /** Duration of the animation in seconds. Default: 0.5 */
  duration?: number;
  /** Rate function controlling animation pacing. Default: smooth */
  rateFunc?: RateFunction;
  /** Scale factor at peak. Default: 1.2 */
  scaleFactor?: number;
  /** Number of pulses. Default: 1 */
  nPulses?: number;
}

/**
 * PulseTrack — Scale pulse using sine wave.
 */
export class PulseTrack extends BaseAnimationTrack {
  private startScale: Vec3;
  private scaleFactor: number;
  private nPulses: number;

  constructor(
    mobject: Mobject,
    options: PulseOptions = {},
  ) {
    const duration = options.duration ?? 0.5;
    const rateFunc = options.rateFunc ?? smooth;
    super(mobject, duration, rateFunc);
    this.scaleFactor = options.scaleFactor ?? 1.2;
    this.nPulses = options.nPulses ?? 1;
    this.startScale = [...mobject.scale] as Vec3;
  }

  prepare(): void {
    this.startScale = [...this.mobject.scale] as Vec3;
  }

  interpolate(alpha: number): void {
    // Pulse using sine wave: 0 -> 1 -> 0 pattern
    const pulsePhase = alpha * this.nPulses * Math.PI * 2;
    const pulseValue = Math.abs(Math.sin(pulsePhase));

    // Scale from 1 to scaleFactor and back
    const currentScale = 1 + (this.scaleFactor - 1) * pulseValue;

    this.mobject.scale = [
      this.startScale[0] * currentScale,
      this.startScale[1] * currentScale,
      this.startScale[2] * currentScale,
    ];
    this.mobject.markDirty();
  }
}

/**
 * Create a Pulse animation track.
 * @param mob The mobject to pulse
 * @param options Pulse options (scaleFactor, nPulses, duration, rateFunc)
 */
export function pulse(mob: Mobject, options?: PulseOptions): PulseTrack {
  return new PulseTrack(mob, options);
}
