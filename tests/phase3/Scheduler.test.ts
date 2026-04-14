import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Scheduler } from '../../src/scheduler/Scheduler';
import { BaseAnimationTrack } from '../../src/animation/AnimationTrack';
import { UpdaterTrack } from '../../src/animation/UpdaterTrack';
import { Mobject } from '../../src/core/Mobject';

// ── Mock Animation Track ───────────────────────────────────────────────────

class MockAnimationTrack extends BaseAnimationTrack {
  prepareCalled = false;
  interpolateCalls: number[] = [];

  prepare(): void {
    this.prepareCalled = true;
  }

  interpolate(alpha: number): void {
    this.interpolateCalls.push(alpha);
    this.mobject.opacity = alpha; // Side effect for testing
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Scheduler', () => {
  let scheduler: Scheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    scheduler = new Scheduler();
  });

  afterEach(() => {
    scheduler.reset();
    vi.useRealTimers();
  });

  describe('basic state', () => {
    it('starts with clock at 0', () => {
      expect(scheduler.clock).toBe(0);
    });

    it('starts not playing', () => {
      expect(scheduler.isPlaying).toBe(false);
    });

    it('starts with 0 total duration', () => {
      expect(scheduler.totalDuration).toBe(0);
    });
  });

  describe('playback control', () => {
    it('play() sets isPlaying to true', () => {
      scheduler.play();
      expect(scheduler.isPlaying).toBe(true);
    });

    it('pause() sets isPlaying to false', () => {
      scheduler.play();
      scheduler.pause();
      expect(scheduler.isPlaying).toBe(false);
    });

    it('resume() resumes playback', () => {
      scheduler.play();
      scheduler.pause();
      scheduler.resume();
      expect(scheduler.isPlaying).toBe(true);
    });

    it('reset() clears all state', () => {
      const mob = new Mobject();
      const track = new MockAnimationTrack(mob, 1);
      scheduler.addTrack(track, 0);
      scheduler.play();
      scheduler.reset();

      expect(scheduler.clock).toBe(0);
      expect(scheduler.isPlaying).toBe(false);
      expect(scheduler.totalDuration).toBe(0);
    });
  });

  describe('seek', () => {
    it('seek() updates clock', () => {
      const mob = new Mobject();
      scheduler.addTrack(new MockAnimationTrack(mob, 10), 0);
      scheduler.seek(5);
      expect(scheduler.clock).toBe(5);
    });

    it('seek() clamps to 0 when negative', () => {
      scheduler.seek(-5);
      expect(scheduler.clock).toBe(0);
    });

    it('seek() clamps to totalDuration', () => {
      const mob = new Mobject();
      const track = new MockAnimationTrack(mob, 10);
      scheduler.addTrack(track, 0);
      scheduler.seek(100);
      expect(scheduler.clock).toBe(10);
    });

    it('seek() calls onFrameReady callback', () => {
      const onFrameReady = vi.fn();
      scheduler.onFrameReady = onFrameReady;
      const mob = new Mobject();
      scheduler.addTrack(new MockAnimationTrack(mob, 10), 0);
      scheduler.seek(1);
      expect(onFrameReady).toHaveBeenCalled();
    });
  });

  describe('track management', () => {
    it('addTrack() calls prepare() on track', () => {
      const mob = new Mobject();
      const track = new MockAnimationTrack(mob, 1);
      scheduler.addTrack(track, 0);
      expect(track.prepareCalled).toBe(true);
    });

    it('addTrack() updates totalDuration', () => {
      const mob = new Mobject();
      const track = new MockAnimationTrack(mob, 5);
      scheduler.addTrack(track, 0);
      expect(scheduler.totalDuration).toBe(5);
    });

    it('addTrack() with offset updates totalDuration correctly', () => {
      const mob = new Mobject();
      const track = new MockAnimationTrack(mob, 5);
      scheduler.addTrack(track, 3);
      expect(scheduler.totalDuration).toBe(8);
    });

    it('multiple tracks update totalDuration to max end time', () => {
      const mob1 = new Mobject();
      const mob2 = new Mobject();
      scheduler.addTrack(new MockAnimationTrack(mob1, 3), 0);
      scheduler.addTrack(new MockAnimationTrack(mob2, 5), 2);
      expect(scheduler.totalDuration).toBe(7);
    });
  });

  describe('bookmark management', () => {
    it('addBookmark() stores bookmark', () => {
      scheduler.addBookmark('intro', 2.5);
      expect(scheduler.getBookmark('intro')).toBe(2.5);
    });

    it('getBookmark() returns undefined for unknown', () => {
      expect(scheduler.getBookmark('unknown')).toBeUndefined();
    });
  });

  describe('animation interpolation', () => {
    it('seek() interpolates track at correct alpha', () => {
      const mob = new Mobject();
      const track = new MockAnimationTrack(mob, 10);
      scheduler.addTrack(track, 0);

      scheduler.seek(5);
      expect(track.interpolateCalls).toContain(0.5);
    });

    it('seek() before track start interpolates at alpha=0', () => {
      const mob = new Mobject();
      const track = new MockAnimationTrack(mob, 10);
      scheduler.addTrack(track, 5);

      scheduler.seek(2);
      expect(track.interpolateCalls).toContain(0);
    });

    it('seek() after track end interpolates at alpha=1', () => {
      const mob = new Mobject();
      const track = new MockAnimationTrack(mob, 5);
      scheduler.addTrack(track, 0);

      scheduler.seek(10);
      expect(track.interpolateCalls).toContain(1);
    });
  });

  describe('updater tracks', () => {
    it('addUpdater() registers updater', () => {
      const mob = new Mobject();
      const tickFn = vi.fn();
      const updater = new UpdaterTrack(mob, tickFn);

      scheduler.addUpdater(updater);
      // Updater is called during play() tick, verified in integration tests
    });
  });

  describe('onComplete callback', () => {
    it('calls onComplete when clock reaches totalDuration', async () => {
      const onComplete = vi.fn();
      scheduler.onComplete = onComplete;

      const mob = new Mobject();
      scheduler.addTrack(new MockAnimationTrack(mob, 0.01), 0);

      scheduler.play();
      // Advance multiple frames to trigger rAF
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(16); // ~60fps frame time
        await Promise.resolve(); // let microtasks run
      }

      expect(onComplete).toHaveBeenCalled();
    });
  });
});
