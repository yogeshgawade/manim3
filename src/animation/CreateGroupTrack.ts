import type { AnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { VMobject } from '../core/VMobject';
import type { RateFunction } from '../core/types';
import { CreateTrack } from './CreateTrack';
import { FadeTrack } from './FadeTrack';

/**
 * CreateGroupTrack — Applies CreateTrack to all leaf VMobjects in a group,
 * with optional staggered timing across children.
 *
 * - Each leaf VMobject gets its own CreateTrack (stroke draw + fill fade-in).
 * - Duration of each child CreateTrack = trackDuration.
 * - Optional lagRatio staggers children over the total group duration.
 */
export class CreateGroupTrack implements AnimationTrack {
  id = crypto.randomUUID();
  remover = false;

  private childTracks: AnimationTrack[] = [];
  private _childrenBuilt = false;

  get mobject(): Mobject {
    return this.targetGroup;
  }

  get duration(): number {
    if (!this._childrenBuilt || this.childTracks.length === 0) {
      return this.trackDuration;
    }

    if (this.lagRatio > 0) {
      // stagger mode: total duration includes overlap
      const maxChildDur = Math.max(...this.childTracks.map(t => t.duration), 0);
      const fullLen = (this.childTracks.length - 1) * this.lagRatio + 1;
      return maxChildDur * fullLen;
    }

    return Math.max(...this.childTracks.map(t => t.duration), 0);
  }

  get rateFunc(): RateFunction {
    return this.trackRateFunc;
  }

  constructor(
    private targetGroup: Mobject,
    private trackDuration: number = 1,
    private trackRateFunc: RateFunction = (t) => t,
    private lagRatio: number = 0,
    private strokeFillLagRatio: number = 0.5,
  ) { }

  private ensureChildTracksBuilt(): void {
    if (this._childrenBuilt) return;
    this._childrenBuilt = true;

    const family = this.targetGroup.getFamily();

    for (const mob of family) {
      const vmob = mob as VMobject;
      // Use CreateTrack for VMobjects with points (stroke animation)
      if (vmob.points3D && vmob.points3D.length > 0) {
        const track = new CreateTrack(
          vmob,
          this.trackDuration,
          this.trackRateFunc,
          this.strokeFillLagRatio,
        );
        this.childTracks.push(track);
      }
      // Use FadeTrack for non-VMobjects (Text, etc.) - simple fade in
      else {
        const track = new FadeTrack(
          mob,
          0,
          1,
          this.trackDuration,
          this.trackRateFunc,
        );
        this.childTracks.push(track);
      }
    }
  }

  prepare(): void {
    this.ensureChildTracksBuilt();
    for (const track of this.childTracks) {
      track.prepare();
    }
  }

  interpolate(alpha: number): void {
    if (!this._childrenBuilt) return;

    const n = this.childTracks.length;
    for (let i = 0; i < n; i++) {
      const childAlpha = this.computeChildAlpha(alpha, i, n);
      this.childTracks[i].interpolate(childAlpha);
    }
  }

  /**
   * Same stagger calculation as FadeGroupTrack:
   * - lagRatio = 0 → all children share the same alpha.
   * - lagRatio > 0 → children are spread across [0, 1] with overlap.
   */
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
    this._childrenBuilt = false;
  }

  reset(): void {
    for (const track of this.childTracks) {
      console.log("create reset")
      track.reset?.();
    }
  }
}

export interface CreateOptions {
  /** Duration of the animation in seconds. Default: 1 */
  duration?: number;
  /** Rate function controlling animation pacing */
  rateFunc?: RateFunction;
  /** Stagger ratio for animating children sequentially (0 = simultaneous). Default: 0 */
  lagRatio?: number;
  /** Lag ratio between stroke drawing and fill fade-in (0-1). Default: 0.5 */
  strokeFillLagRatio?: number;
}

/**
 * Create a mobject by drawing its stroke then fading in its fill.
 * Applies to all VMobjects in the group (including descendants).
 * @param group The mobject or group to create
 * @param options Create options (duration, rateFunc, lagRatio, strokeFillLagRatio)
 */
export function create(group: Mobject, options: CreateOptions = {}): CreateGroupTrack {
  const { duration = 1, rateFunc, lagRatio = 0, strokeFillLagRatio = 0.5 } = options;
  return new CreateGroupTrack(group, duration, rateFunc, lagRatio, strokeFillLagRatio);
}