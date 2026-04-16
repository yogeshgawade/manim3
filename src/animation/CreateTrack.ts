import { BaseAnimationTrack } from './AnimationTrack';
import type { VMobject } from '../core/VMobject';
import type { RateFunction } from '../core/types';

/**
 * CreateTrack — Reveals stroke using visibleFraction (dash-based), then fades in fill and opacity.
 * Line2Renderer reads visibleFraction and adjusts dashSize/gapSize.
 * Fill opacity and overall opacity are animated in the second half (like Manim's DrawBorderThenFill).
 */
export class CreateTrack extends BaseAnimationTrack {
  private _originalFillOpacity: number = 0;
  private _originalOpacity: number = 1;
  private _hasFill: boolean = false;
  private _wasTransparent: boolean = false;
  private _prepared: boolean = false;

  constructor(
    mobject: VMobject,
    duration: number = 1,
    rateFunc: RateFunction = (t) => t,
    private strokeFillLagRatio: number = 0.5,
  ) {
    super(mobject, duration, rateFunc);
  }

  prepare(): void {
    if (this._prepared) return;
    this._prepared = true;

    const vmob = this.mobject as VMobject;

    // Only save originals — hiding happens in interpolate(0)
    this._originalFillOpacity = vmob.fillOpacity;
    this._hasFill = this._originalFillOpacity > 0;
    this._originalOpacity = vmob.opacity;
    this._wasTransparent = this._originalOpacity < 1;

    // Remove these lines:
    // vmob.visibleFraction = 0;
    // if (this._hasFill) vmob.fillOpacity = 0;
    // if (this._wasTransparent) vmob.opacity = 0;
    // this.mobject.markDirty();
  }

  dispose(): void {
    this._prepared = false;
    const vmob = this.mobject as VMobject;
    vmob.visibleFraction = 1;
    if (this._hasFill) vmob.fillOpacity = this._originalFillOpacity;
    if (this._wasTransparent) vmob.opacity = this._originalOpacity;
    vmob.markDirty();
  }

  interpolate(alpha: number): void {
    const vmob = this.mobject as VMobject;
    const split = this.strokeFillLagRatio;

    // Handle edge cases
    if (split <= 0) {
      // No lag - animate stroke and fill together from the start
      vmob.visibleFraction = alpha;
      if (this._hasFill) {
        vmob.fillOpacity = this._originalFillOpacity * alpha;
      }
      vmob.opacity = 1;
    } else if (split >= 1) {
      // Full lag - stroke takes entire animation, fill appears instantly at the end
      vmob.visibleFraction = alpha;
      if (alpha >= 1) {
        if (this._hasFill) {
          vmob.fillOpacity = this._originalFillOpacity;
        }
        vmob.opacity = 1;
      } else {
        if (this._hasFill) {
          vmob.fillOpacity = 0;
        }
        vmob.opacity = 1;
      }
    } else {
      // Normal case: 0 < split < 1
      if (alpha < split) {
        // Keep fill hidden during stroke phase
        if (this._hasFill) {
          vmob.fillOpacity = 0;
        }
        // Make stroke visible during draw phase (even if original was 0)
        vmob.opacity = alpha === 0 ? 0 : 1;
        // Stroke reveals from 0 to 1 over first part
        vmob.visibleFraction = alpha / split;
      } else {
        // Second part: fill fades in, stroke stays fully visible
        vmob.visibleFraction = 1;
        const secondHalfAlpha = (alpha - split) / (1 - split);
        if (this._hasFill) {
          vmob.fillOpacity = this._originalFillOpacity * secondHalfAlpha;
        }
        // Keep stroke visible - don't animate opacity in Create animation
        vmob.opacity = 1;
      }
    }

    this.mobject.markDirty();
  }


}

// Factory function
export function create(mob: VMobject, duration = 1, rateFunc?: RateFunction, strokeFillLagRatio?: number): CreateTrack {
  return new CreateTrack(mob, duration, rateFunc, strokeFillLagRatio);
}
