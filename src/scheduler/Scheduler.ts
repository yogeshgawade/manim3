/**
 * Scheduler — Single source of truth for time.
 * One rAF loop drives all animations, audio, and rendering.
 */

import type { AnimationTrack } from '../animation/AnimationTrack';
import type { UpdaterTrack } from '../animation/UpdaterTrack';
import type { TimePosition } from '../core/types';

export interface ScheduledTrack {
  track: AnimationTrack;
  startTime: number;
  endTime: number;
}

export class Scheduler {
  private _clock = 0;
  private _totalDuration = 0;
  private _isPlaying = false;
  private _rafId: number | null = null;
  private _lastTimestamp: number | null = null;
  private _tracks: ScheduledTrack[] = [];
  private _updaters: UpdaterTrack[] = [];
  private _bookmarks = new Map<string, number>();
  private _lastTrackEndTime = 0;

  // Callbacks
  onFrameReady?: () => void;
  onComplete?: () => void;

  // ── Playback ─────────────────────────────────────────────────────────────

  play(): void {
    if (this._isPlaying) return;
    this._isPlaying = true;
    this._lastTimestamp = null;
    this._rafId = requestAnimationFrame(this._tick);
  }

  pause(): void {
    this._isPlaying = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  resume(): void {
    this.play();
  }

  seek(t: number): void {
    this._clock = Math.max(0, Math.min(t, this._totalDuration));
    this._applyAllTracksAtTime(this._clock);
    this.onFrameReady?.();
  }

  reset(): void {
    this.pause();
    this._clock = 0;
    this._tracks = [];
    this._updaters = [];
    this._bookmarks.clear();
    this._totalDuration = 0;
    this._lastTimestamp = null;
    this._lastTrackEndTime = 0;
  }

  // ── Track Management ───────────────────────────────────────────────────────

  addTrack(track: AnimationTrack, startTime: number): void {
    track.prepare();
    const endTime = startTime + track.duration;
    this._tracks.push({ track, startTime, endTime });
    this._totalDuration = Math.max(this._totalDuration, endTime);
    this._lastTrackEndTime = Math.max(this._lastTrackEndTime, endTime);
  }

  addUpdater(updater: UpdaterTrack): void {
    this._updaters.push(updater);
  }

  removeUpdater(updater: UpdaterTrack): void {
    const idx = this._updaters.indexOf(updater);
    if (idx !== -1) {
      this._updaters.splice(idx, 1);
    }
  }

  addBookmark(name: string, t: number): void {
    this._bookmarks.set(name, t);
  }

  getBookmark(name: string): number | undefined {
    return this._bookmarks.get(name);
  }

  // ── State Queries ────────────────────────────────────────────────────────

  get clock(): number {
    return this._clock;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  get totalDuration(): number {
    return this._totalDuration;
  }

  get lastTrackEndTime(): number {
    return this._lastTrackEndTime;
  }

  // ── Timeline Builder ───────────────────────────────────────────────────

  /**
   * Create a TimelineBuilder for positioning tracks at a specific time.
   * Supports: number (absolute), '+=' (relative), '<' (same as last start), 'bookmark:name'
   */
  at(position: TimePosition): TimelineBuilder {
    return new TimelineBuilder(this, position);
  }

  /**
   * Build multiple tracks at specific positions and return total duration.
   * This allows pre-building the entire timeline before playing.
   */
  buildTimeline(buildFn: (builder: TimelineBuilder) => void): number {
    const builder = new TimelineBuilder(this, 0);
    buildFn(builder);
    return this._totalDuration;
  }

  // ── Single rAF Tick ──────────────────────────────────────────────────────

  private _tick = (timestamp: number) => {
    if (!this._isPlaying) return;
    this._rafId = requestAnimationFrame(this._tick);

    const dt = this._lastTimestamp === null ? 0 : (timestamp - this._lastTimestamp) / 1000;
    this._lastTimestamp = timestamp;
    this._clock += dt;

    // 1. Run updaters
    for (const updater of this._updaters) {
      updater.tick(dt);
    }

    // 2. Apply all animation tracks at current time
    this._applyAllTracksAtTime(this._clock);

    // 3. Signal renderer to render one frame
    this.onFrameReady?.();

    // 4. Check completion
    if (this._clock >= this._totalDuration) {
      this._isPlaying = false;
      this.onComplete?.();
    }
  };

  private _applyAllTracksAtTime(t: number): void {
    for (const { track, startTime, endTime } of this._tracks) {
      if (t < startTime) {
        // Before start: apply initial state
        //track.interpolate(0);
      } else if (t >= endTime) {
        track.interpolate(track.rateFunc(1));
      } else {
        const rawAlpha = (t - startTime) / (endTime - startTime);
        const alpha = track.rateFunc(rawAlpha);
        track.interpolate(alpha);
      }
    }
  }
}

// ── Timeline Builder ─────────────────────────────────────────────────────

export class TimelineBuilder {
  constructor(
    private scheduler: Scheduler,
    private position: TimePosition
  ) {}

  /**
   * Position the next animation at a specific time.
   * Supports: number (absolute), '+=' (relative), '<' (same as last start), 'bookmark:name'
   */
  at(position: TimePosition): TimelineBuilder {
    return new TimelineBuilder(this.scheduler, position);
  }

  play(...tracks: AnimationTrack[]): TimelineBuilder {
    const resolvedTime = this._resolvePosition();
    for (const track of tracks) {
      track.prepare(); // Initialize track before adding
      this.scheduler.addTrack(track, resolvedTime);
    }
    const endTime = resolvedTime + Math.max(...tracks.map(t => t.duration), 0);
    // Return new builder positioned at end of these tracks for chaining
    return new TimelineBuilder(this.scheduler, endTime);
  }

  private _resolvePosition(): number {
    const pos = this.position;
    const lastEnd = this.scheduler.lastTrackEndTime;

    if (typeof pos === 'number') {
      return pos;
    }

    if (pos === '<') {
      // Same time as last track start — simplified to last end
      return lastEnd;
    }

    if (pos.startsWith('+=')) {
      const delta = parseFloat(pos.slice(2)) || 0;
      return lastEnd + delta;
    }

    if (pos.startsWith('bookmark:')) {
      const name = pos.slice(9);
      const bookmark = this.scheduler.getBookmark(name);
      if (bookmark === undefined) {
        console.warn(`[Scheduler] Bookmark '${name}' not found`);
        return lastEnd;
      }
      return bookmark;
    }

    return lastEnd;
  }
}
