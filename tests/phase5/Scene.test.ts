import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Scene } from '../../src/scene/Scene';
import { LogicalScene } from '../../src/scene/LogicalScene';
import { Mobject } from '../../src/core/Mobject';
import { FadeTrack } from '../../src/animation/FadeTrack';
import { Scheduler } from '../../src/scheduler/Scheduler';

describe('Phase 5 — Scene Wiring', () => {
  describe('LogicalScene', () => {
    it('add() registers mobject', () => {
      const scene = new LogicalScene();
      const mob = new Mobject();
      scene.add(mob);
      expect(scene.has(mob)).toBe(true);
    });

    it('remove() unregisters mobject', () => {
      const scene = new LogicalScene();
      const mob = new Mobject();
      scene.add(mob);
      scene.remove(mob);
      expect(scene.has(mob)).toBe(false);
    });

    it('clear() removes all mobjects', () => {
      const scene = new LogicalScene();
      const mob1 = new Mobject();
      const mob2 = new Mobject();
      scene.add(mob1, mob2);
      scene.clear();
      expect(scene.count).toBe(0);
    });

    it('getAllMobjects() returns flattened family', () => {
      const scene = new LogicalScene();
      const parent = new Mobject();
      const child = new Mobject();
      const grandchild = new Mobject();
      parent.add(child);
      child.add(grandchild);
      scene.add(parent);

      const all = scene.getAllMobjects();
      expect(all).toContain(parent);
      expect(all).toContain(child);
      expect(all).toContain(grandchild);
      expect(all).toHaveLength(3);
    });
  });

  describe('Scene', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      container.style.width = '800px';
      container.style.height = '450px';
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    it('add() registers mobject in logical scene', () => {
      const scene = new Scene(container);
      const mob = new Mobject();
      scene.add(mob);
      expect(scene.getMobjects()).toContain(mob);
      scene.dispose();
    });

    it('remove() unregisters mobject', () => {
      const scene = new Scene(container);
      const mob = new Mobject();
      scene.add(mob);
      scene.remove(mob);
      expect(scene.getMobjects()).not.toContain(mob);
      scene.dispose();
    });

    it('seek() is synchronous — no await needed', () => {
      const scene = new Scene(container);
      const mob = new Mobject();
      mob.opacity = 1;
      scene.add(mob);

      // Schedule a track
      const scheduler = (scene as any).scheduler as Scheduler;
      const track = new FadeTrack(mob, 1, 0, 1);
      scheduler.addTrack(track, 0);

      scene.seek(0.5); // synchronous
      expect(mob.opacity).toBeCloseTo(0.5, 2);
      scene.dispose();
    });

    it('seek(0) shows initial state of all tracks', () => {
      const scene = new Scene(container);
      const mob = new Mobject();
      mob.opacity = 1;
      scene.add(mob);

      const scheduler = (scene as any).scheduler as Scheduler;
      const track = new FadeTrack(mob, 1, 0, 1);
      scheduler.addTrack(track, 0);

      scene.seek(1); // go to end
      scene.seek(0); // go back to start
      expect(mob.opacity).toBeCloseTo(1, 2);
      scene.dispose();
    });

    it('play() returns a Promise', () => {
      const scene = new Scene(container);
      const mob = new Mobject();
      const track = new FadeTrack(mob, 0, 1, 0.01);

      // Don't actually play to avoid timing issues, just check return type
      // Override scheduler play to prevent actual animation
      const scheduler = (scene as any).scheduler as Scheduler;
      const originalPlay = scheduler.play.bind(scheduler);
      scheduler.play = () => {
        originalPlay();
        scheduler.pause();
        scheduler.onComplete?.();
      };

      const result = scene.play(track);
      expect(result).toBeInstanceOf(Promise);
      scene.dispose();
    });

    it('wait() does NOT create competing rAF loop', async () => {
      const scene = new Scene(container);
      const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');
      const before = rafSpy.mock.calls.length;

      await scene.wait(0.01);

      // Should only have scheduler's rAF, no new loops
      expect(rafSpy.mock.calls.length - before).toBeLessThanOrEqual(1);
      scene.dispose();
    });

    it('pause() stops the scheduler', () => {
      const scene = new Scene(container);
      const scheduler = (scene as any).scheduler as Scheduler;
      scheduler.play();
      scene.pause();
      expect(scheduler.isPlaying).toBe(false);
      scene.dispose();
    });

    it('resume() restarts the scheduler', () => {
      const scene = new Scene(container);
      const scheduler = (scene as any).scheduler as Scheduler;
      scheduler.play();
      scene.pause();
      scene.resume();
      expect(scheduler.isPlaying).toBe(true);
      scene.dispose();
    });

    it('reset() clears scheduler state', () => {
      const scene = new Scene(container);
      const mob = new Mobject();
      scene.add(mob);

      const scheduler = (scene as any).scheduler as Scheduler;
      const track = new FadeTrack(mob, 0, 1, 1);
      scheduler.addTrack(track, 0);

      scene.seek(0.5);
      scene.reset();

      expect(scheduler.clock).toBe(0);
      expect(scheduler.totalDuration).toBe(0);
      scene.dispose();
    });

    it('resize() updates renderer dimensions', () => {
      const scene = new Scene(container);
      const renderer = (scene as any).renderer;
      const resizeSpy = vi.spyOn(renderer, 'resize');

      scene.resize(1024, 768);

      expect(resizeSpy).toHaveBeenCalledWith(1024, 768);
      scene.dispose();
    });
  });
});
