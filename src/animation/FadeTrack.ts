import { BaseAnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { RateFunction } from '../core/types';

/**
 * FadeTrack — Interpolates opacity from one value to another.
 */
export class FadeTrack extends BaseAnimationTrack {
  private startOpacity: number | null;
  private endOpacity: number;
  private capturedOpacity: number = 1;
  private opacityCaptured: boolean = false;

  constructor(
    mobject: Mobject,
    from: number | null,
    to: number,
    duration: number = 1,
    rateFunc: RateFunction = (t) => t,
  ) {
    super(mobject, duration, rateFunc);
    this.startOpacity = from;
    this.endOpacity = to;
  }

  prepare(): void {
    // Reset capture flag so opacity is captured on first interpolate() call.
    // This ensures we capture opacity after all prior tracks have run.
    this.opacityCaptured = false;
  }

  interpolate(alpha: number): void {
    // On first call, determine the actual starting opacity:
    // - If startOpacity is null, capture current mobject.opacity (for fadeOut after other anims)
    // - If startOpacity is a number, use that value (for fadeIn from explicit value)
    if (!this.opacityCaptured) {
      if (this.startOpacity === null) {
        this.capturedOpacity = this.mobject.opacity;
      } else {
        this.capturedOpacity = this.startOpacity;
      }
      this.opacityCaptured = true;
    }
    const opacity = this.capturedOpacity + (this.endOpacity - this.capturedOpacity) * alpha;
    this.mobject.opacity = opacity;
    this.mobject.markDirty();
  }
}
