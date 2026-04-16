import type { AnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { RateFunction } from '../core/types';
import { FadeTrack } from './FadeTrack';

/**
 * FadeGroupTrack â€” Fades an entire group of mobjects (including all descendants).
 * Follows the same composite pattern as VGroupMorphTrack.
 */
export class FadeGroupTrack implements AnimationTrack {
  id = crypto.randomUUID();
  remover = false;
  private childTracks: FadeTrack[] = [];
  private prepared = false;

  get mobject() {
    return this.targetMobject;
  }

  get duration() {
    if (this.lagRatio > 0) {
      // stagger mode: total duration includes overlap
      const maxChildDur = Math.max(...this.childTracks.map(t => t.duration), 0);
      const fullLen = (this.childTracks.length - 1) * this.lagRatio + 1;
      return maxChildDur * fullLen;
    }
    return Math.max(...this.childTracks.map(t => t.duration), 0);
  }

  get rateFunc() {
    return (t: number) => t;
  }

  constructor(
    private targetMobject: Mobject,
    private startOpacity: number,
    private endOpacity: number,
    private trackDuration: number = 1,
    private trackRateFunc: RateFunction = (t) => t,
    private lagRatio: number = 0,
  ) { }

  prepare(): void {
    if (this.prepared) return;
    this.prepared = true;
    // Always clear before rebuilding â€” safe for re-seek / re-prepare
    for (const track of this.childTracks) track.dispose();
    this.childTracks = [];
    // Get all family members (this + all descendants)
    const family = this.targetMobject.getFamily();

    // Create fade tracks for each family member
    for (const mob of family) {
      const track = new FadeTrack(mob, this.startOpacity, this.endOpacity, this.trackDuration, this.trackRateFunc);
      this.childTracks.push(track);
    }

    // Prepare all child tracks
    for (const track of this.childTracks) {
      track.prepare();
    }
  }

  interpolate(alpha: number): void {
    for (let i = 0; i < this.childTracks.length; i++) {
      const childAlpha = this.computeChildAlpha(alpha, i, this.childTracks.length);
      this.childTracks[i].interpolate(childAlpha);
    }
  }

  private computeChildAlpha(alpha: number, i: number, n: number): number {
    if (this.lagRatio === 0) return alpha;
    const fullLen = (n - 1) * this.lagRatio + 1;
    const start = (i * this.lagRatio) / fullLen;
    const end = start + 1 / fullLen;
    if (alpha < start) return 0;
    if (alpha > end) return 1;
    return (alpha - start) / (end - start);
  }

  dispose(): void {
    for (const track of this.childTracks) {
      track.dispose();
    }
    this.childTracks = [];
    this.prepared = false;
  }
}

// Factory functions
export function fadeInGroup(
  group: Mobject,
  duration = 1,
  rateFunc?: RateFunction,
  lagRatio = 0,
): FadeGroupTrack {
  const track = new FadeGroupTrack(group, 0, 1, duration, rateFunc, lagRatio);
  return track;
}

export function fadeOutGroup(
  group: Mobject,
  duration = 1,
  rateFunc?: RateFunction,
  lagRatio = 0,
): FadeGroupTrack {
  const track = new FadeGroupTrack(group, 1, 0, duration, rateFunc, lagRatio);
  track.remover = true;
  return track;
}