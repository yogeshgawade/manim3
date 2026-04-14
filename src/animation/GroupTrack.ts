import type { AnimationTrack } from './AnimationTrack';

export type GroupMode = 'parallel' | 'sequence' | 'stagger';

/**
 * GroupTrack — Manages child tracks with parallel, sequence, or stagger timing.
 */
export class GroupTrack implements AnimationTrack {
  id = crypto.randomUUID();
  remover = false;

  constructor(
    private tracks: AnimationTrack[],
    private mode: GroupMode,
    private lagRatio = 0,
  ) {}

  get mobject() {
    return this.tracks[0]?.mobject;
  }

  get duration(): number {
    if (this.mode === 'sequence') {
      return this.tracks.reduce((sum, t) => sum + t.duration, 0);
    }
    if (this.mode === 'stagger' && this.lagRatio > 0) {
      const maxChildDur = Math.max(...this.tracks.map(t => t.duration));
      const fullLen = (this.tracks.length - 1) * this.lagRatio + 1;
      return maxChildDur * fullLen;
    }
    // parallel
    return Math.max(...this.tracks.map(t => t.duration), 0);
  }

  get rateFunc() {
    return (t: number) => t;
  }

  prepare(): void {
    for (const track of this.tracks) {
      track.prepare();
    }
  }

  interpolate(alpha: number): void {
    for (let i = 0; i < this.tracks.length; i++) {
      const childAlpha = this.computeChildAlpha(alpha, i, this.tracks.length);
      this.tracks[i].interpolate(childAlpha);
    }
  }

  dispose(): void {
    for (const track of this.tracks) {
      track.dispose?.();
    }
  }

  private computeChildAlpha(alpha: number, i: number, n: number): number {
    if (this.mode === 'parallel') {
      return alpha;
    }
    if (this.mode === 'sequence') {
      // Calculate which track should be playing
      const totalDur = this.duration;
      let cumDur = 0;
      for (let j = 0; j < i; j++) {
        cumDur += this.tracks[j].duration;
      }
      const trackDur = this.tracks[i].duration;
      const start = cumDur / totalDur;
      const end = (cumDur + trackDur) / totalDur;
      if (alpha < start) return 0;
      if (alpha > end) return 1;
      return (alpha - start) / (end - start);
    }
    // stagger
    if (this.lagRatio === 0) return alpha;
    const fullLen = (n - 1) * this.lagRatio + 1;
    const start = (i * this.lagRatio) / fullLen;
    const end = start + 1 / fullLen;
    if (alpha < start) return 0;
    if (alpha > end) return 1;
    return (alpha - start) / (end - start);
  }
}

// Factory functions
export function parallel(...tracks: AnimationTrack[]): GroupTrack {
  return new GroupTrack(tracks, 'parallel');
}

export function sequence(...tracks: AnimationTrack[]): GroupTrack {
  return new GroupTrack(tracks, 'sequence');
}

export function stagger(tracks: AnimationTrack[], lagRatio = 0.1): GroupTrack {
  return new GroupTrack(tracks, 'stagger', lagRatio);
}
