import { describe, it, expect } from 'vitest';
import { Mobject } from '../../src/core/Mobject';
import { VMobject } from '../../src/core/VMobject';
import { FadeTrack, fadeIn, fadeOut } from '../../src/animation/FadeTrack';
import { MoveTrack, moveTo } from '../../src/animation/MoveTrack';
import { ScaleTrack, scaleTo } from '../../src/animation/ScaleTrack';
import { RotateTrack, rotateTo } from '../../src/animation/RotateTrack';
import { ColorTrack, colorTo } from '../../src/animation/ColorTrack';
import { CreateTrack, create } from '../../src/animation/CreateTrack';
import { GroupTrack, parallel, sequence, stagger } from '../../src/animation/GroupTrack';

describe('Animation Tracks', () => {
  describe('FadeTrack', () => {
    it('interpolates opacity from 0 to 1', () => {
      const mob = new Mobject();
      const track = new FadeTrack(mob, 0, 1, 1);
      track.prepare();

      expect(mob.opacity).toBe(0);

      track.interpolate(0.5);
      expect(mob.opacity).toBe(0.5);

      track.interpolate(1);
      expect(mob.opacity).toBe(1);
    });

    it('fadeIn factory sets correct range', () => {
      const mob = new Mobject();
      mob.opacity = 1;
      const track = fadeIn(mob, 1);
      track.prepare();
      expect(mob.opacity).toBe(0);
    });

    it('fadeOut factory sets remover flag', () => {
      const mob = new Mobject();
      const track = fadeOut(mob, 1);
      expect(track.remover).toBe(true);
    });
  });

  describe('MoveTrack', () => {
    it('interpolates position', () => {
      const mob = new Mobject();
      const track = new MoveTrack(mob, [0, 0, 0], [10, 20, 30], 1);
      track.prepare();

      expect(mob.position).toEqual([0, 0, 0]);

      track.interpolate(0.5);
      expect(mob.position).toEqual([5, 10, 15]);

      track.interpolate(1);
      expect(mob.position).toEqual([10, 20, 30]);
    });
  });

  describe('ScaleTrack', () => {
    it('interpolates scale with number', () => {
      const mob = new Mobject();
      const track = new ScaleTrack(mob, 1, 2, 1);
      track.prepare();

      expect(mob.scale).toEqual([1, 1, 1]);

      track.interpolate(0.5);
      expect(mob.scale).toEqual([1.5, 1.5, 1]);
    });

    it('interpolates scale with Vec3', () => {
      const mob = new Mobject();
      const track = new ScaleTrack(mob, [1, 1, 1], [2, 3, 1], 1);
      track.prepare();

      track.interpolate(0.5);
      expect(mob.scale).toEqual([1.5, 2, 1]);
    });
  });

  describe('RotateTrack', () => {
    it('interpolates rotation', () => {
      const mob = new Mobject();
      const track = new RotateTrack(mob, [0, 0, 0], [Math.PI, Math.PI / 2, 0], 1);
      track.prepare();

      expect(mob.rotation).toEqual([0, 0, 0]);

      track.interpolate(0.5);
      expect(mob.rotation[0]).toBeCloseTo(Math.PI / 2);
      expect(mob.rotation[1]).toBeCloseTo(Math.PI / 4);
    });
  });

  describe('ColorTrack', () => {
    it('interpolates color', () => {
      const mob = new Mobject();
      mob.color = '#000000';
      const track = new ColorTrack(mob, '#000000', '#ffffff', 1);
      track.prepare();

      expect(mob.color).toBe('#000000');

      track.interpolate(0.5);
      expect(mob.color).toBe('#808080');

      track.interpolate(1);
      expect(mob.color).toBe('#ffffff');
    });
  });

  describe('CreateTrack', () => {
    it('interpolates visibleFraction with two-phase stroke-then-fill', () => {
      const mob = new VMobject();
      const track = new CreateTrack(mob, 1);
      track.prepare();

      // Initially stroke is hidden
      expect(mob.visibleFraction).toBe(0);

      // At 25%: stroke is halfway revealed (alpha < 0.5, so visibleFraction = 0.25 * 2 = 0.5)
      track.interpolate(0.25);
      expect(mob.visibleFraction).toBe(0.5);

      // At 50% and beyond: stroke is fully revealed (alpha >= 0.5, so visibleFraction = 1)
      track.interpolate(0.5);
      expect(mob.visibleFraction).toBe(1);

      track.interpolate(1);
      expect(mob.visibleFraction).toBe(1);
    });
  });

  describe('GroupTrack', () => {
    it('parallel mode runs all children together', () => {
      const mob1 = new Mobject();
      const mob2 = new Mobject();
      const track1 = new FadeTrack(mob1, 0, 1, 1);
      const track2 = new FadeTrack(mob2, 0, 1, 1);

      const group = parallel(track1, track2);
      group.prepare();

      group.interpolate(0.5);
      expect(mob1.opacity).toBe(0.5);
      expect(mob2.opacity).toBe(0.5);
    });

    it('sequence mode runs children in order', () => {
      const mob1 = new Mobject();
      const mob2 = new Mobject();
      const track1 = new FadeTrack(mob1, 0, 1, 1);
      const track2 = new FadeTrack(mob2, 0, 1, 1);

      const group = sequence(track1, track2);
      group.prepare();

      // At 25%, first track should be at 50%, second at 0
      group.interpolate(0.25);
      expect(mob1.opacity).toBe(0.5);
      expect(mob2.opacity).toBe(0);

      // At 75%, first track done, second at 50%
      group.interpolate(0.75);
      expect(mob1.opacity).toBe(1);
      expect(mob2.opacity).toBe(0.5);
    });
  });
});
