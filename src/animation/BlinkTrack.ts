/**
 * Blink animation track - makes a mobject blink (fade out and back in).
 *
 * Creates a blinking effect by modulating opacity, making the mobject
 * fade out and back in a configurable number of times.
 */

import { BaseAnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { RateFunction } from '../core/types';
import { linear } from '../utils/rateFunctions';

export interface BlinkOptions {
  /** Duration of the animation in seconds. Default: 1 */
  duration?: number;
  /** Rate function controlling animation pacing. Default: linear */
  rateFunc?: RateFunction;
  /** Number of blinks. Default: 2 */
  nBlinks?: number;
  /** Minimum opacity during blink (0-1). Default: 0 */
  minOpacity?: number;
}

/**
 * BlinkTrack — Fade out/in repeatedly.
 */
export class BlinkTrack extends BaseAnimationTrack {
  private startOpacity: number;
  private nBlinks: number;
  private minOpacity: number;

  constructor(
    mobject: Mobject,
    options: BlinkOptions = {},
  ) {
    const duration = options.duration ?? 1;
    const rateFunc = options.rateFunc ?? linear;
    super(mobject, duration, rateFunc);
    this.nBlinks = options.nBlinks ?? 2;
    this.minOpacity = options.minOpacity ?? 0;
    this.startOpacity = mobject.opacity;
  }

  prepare(): void {
    this.startOpacity = this.mobject.opacity;
  }

  interpolate(alpha: number): void {
    // Calculate blink phase (0 to 1 for each blink cycle)
    const blinkPhase = (alpha * this.nBlinks) % 1;

    // Smooth fade out and back in using sine wave
    // 0 -> 0.25: fading out
    // 0.25 -> 0.75: at minimum
    // 0.75 -> 1: fading in
    let currentOpacity: number;
    if (blinkPhase < 0.25) {
      // Fading out
      currentOpacity = this.startOpacity + (this.minOpacity - this.startOpacity) * (blinkPhase / 0.25);
    } else if (blinkPhase < 0.75) {
      // At minimum opacity
      currentOpacity = this.minOpacity;
    } else {
      // Fading in
      currentOpacity = this.minOpacity + (this.startOpacity - this.minOpacity) * ((blinkPhase - 0.75) / 0.25);
    }

    this.mobject.opacity = currentOpacity;
    this.mobject.markDirty();
  }
}

/**
 * Create a Blink animation track.
 * @param mob The mobject to blink
 * @param options Blink options (nBlinks, minOpacity, duration, rateFunc)
 */
export function blink(mob: Mobject, options?: BlinkOptions): BlinkTrack {
  return new BlinkTrack(mob, options);
}
