import type { AnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { RateFunction } from '../core/types';
import { FadeTrack } from './FadeTrack';

/**
 * FadeGroupTrack - Fades an entire group of mobjects including descendants.
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
    return this.trackDuration;
  }

  get rateFunc() {
    return (t: number) => t;
  }

  constructor(
    private targetMobject: Mobject,
    private startOpacity: number | null,
    private endOpacity: number,
    private trackDuration: number = 1,
    private trackRateFunc: RateFunction = (t) => t,
    private lagRatio: number = 0,
  ) {}

  prepare(): void {
    for (const track of this.childTracks) {
      track.dispose();
    }
    this.childTracks = [];
    this.prepared = false;
  }

  captureStartState(): void {
    if (!this.prepared) {
      this.prepared = true;
      const family = this.targetMobject.getFamily();
      for (const mob of family) {
        const track = new FadeTrack(mob, this.startOpacity, this.endOpacity, this.trackDuration, this.trackRateFunc);
        track.prepare();
        this.childTracks.push(track);
      }
    }

    for (const track of this.childTracks) {
      track.captureStartState?.();
    }
  }

  interpolate(alpha: number): void {
    for (let i = 0; i < this.childTracks.length; i++) {
      const childAlpha = this.computeChildAlpha(alpha, i, this.childTracks.length);
      this.childTracks[i].interpolate(childAlpha);
    }
  }
  
  private computeChildAlpha(alpha: number, i: number, n: number): number {
    if (this.lagRatio === 0 || n <= 1) return alpha;

    // Standard manim stagger: child runtime ratio accounts for lag between starts
    const childRunTimeRatio = 1 / (1 + (n - 1) * this.lagRatio);
    const start = i * this.lagRatio * childRunTimeRatio;
    const end = start + childRunTimeRatio;

    if (alpha <= start) return 0;
    if (alpha >= end) return 1;
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

export interface FadeOptions {
  duration?: number;
  rateFunc?: RateFunction;
  lagRatio?: number;
}

export function fadeIn(group: Mobject, options: FadeOptions = {}): FadeGroupTrack {
  const { duration = 1, rateFunc, lagRatio = 0 } = options;
  return new FadeGroupTrack(group, 0, 1, duration, rateFunc, lagRatio);
}

export function fadeOut(group: Mobject, options: FadeOptions = {}): FadeGroupTrack {
  const { duration = 1, rateFunc, lagRatio = 0 } = options;
  const track = new FadeGroupTrack(group, null, 0, duration, rateFunc, lagRatio);
  track.remover = true;
  return track;
}
