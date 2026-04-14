import { BaseAnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { VMobject } from '../core/VMobject';
import type { RateFunction } from '../core/types';

// Simple RGB interpolation (OKLCH can be added later)
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * ColorTrack — Interpolates both stroke color and fill color using RGB lerp.
 */
export class ColorTrack extends BaseAnimationTrack {
  private startStrokeColor: string;
  private endStrokeColor: string;
  private startFillColor: string;
  private endFillColor: string;
  private startStrokeRgb: { r: number; g: number; b: number };
  private endStrokeRgb: { r: number; g: number; b: number };
  private startFillRgb: { r: number; g: number; b: number };
  private endFillRgb: { r: number; g: number; b: number };

  constructor(
    mobject: Mobject,
    from: string,
    to: string,
    duration: number = 1,
    rateFunc: RateFunction = (t) => t,
  ) {
    super(mobject, duration, rateFunc);
    this.startStrokeColor = from;
    this.endStrokeColor = to;
    this.startFillColor = from;
    this.endFillColor = to;
    this.startStrokeRgb = hexToRgb(from);
    this.endStrokeRgb = hexToRgb(to);
    this.startFillRgb = hexToRgb(from);
    this.endFillRgb = hexToRgb(to);
  }

  prepare(): void {
    // Capture current state as start, target as end
    // Note: We do NOT modify mobject here - let it stay at current state
  }

  interpolate(alpha: number): void {
    // Lerp stroke color
    const sr = lerp(this.startStrokeRgb.r, this.endStrokeRgb.r, alpha);
    const sg = lerp(this.startStrokeRgb.g, this.endStrokeRgb.g, alpha);
    const sb = lerp(this.startStrokeRgb.b, this.endStrokeRgb.b, alpha);
    this.mobject.color = rgbToHex(sr, sg, sb);

    // Lerp fill color (if has fill)
    const vmob = this.mobject as VMobject;
    if (vmob.fillOpacity > 0) {
      const fr = lerp(this.startFillRgb.r, this.endFillRgb.r, alpha);
      const fg = lerp(this.startFillRgb.g, this.endFillRgb.g, alpha);
      const fb = lerp(this.startFillRgb.b, this.endFillRgb.b, alpha);
      vmob.fillColor = rgbToHex(fr, fg, fb);
    }

    this.mobject.markDirty();
  }
}

// Factory function
export function colorTo(mob: Mobject, target: string, duration = 1, rateFunc?: RateFunction): ColorTrack {
  return new ColorTrack(mob, mob.color, target, duration, rateFunc);
}
