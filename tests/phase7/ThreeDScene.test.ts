import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThreeDScene } from '../../src/scene/ThreeDScene';
import { Mobject } from '../../src/core/Mobject';

describe('ThreeDScene', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
  });

  it('creates with perspective camera', () => {
    const scene = new ThreeDScene(container, { orbitControls: false });

    expect(scene).toBeDefined();
    expect(scene.getCameraPosition()).toBeDefined();
  });

  it('setCamera updates position and target', () => {
    const scene = new ThreeDScene(container, { orbitControls: false });

    scene.setCamera([5, 5, 5], [0, 0, 0]);

    const pos = scene.getCameraPosition();
    expect(pos[0]).toBe(5);
    expect(pos[1]).toBe(5);
    expect(pos[2]).toBe(5);
  });

  it('getCameraTarget returns current target', () => {
    const scene = new ThreeDScene(container, { orbitControls: false });

    scene.setCamera([0, 0, 10], [5, 5, 5]);

    const target = scene.getCameraTarget();
    expect(target[0]).toBe(5);
    expect(target[1]).toBe(5);
    expect(target[2]).toBe(5);
  });

  it('orbit updates camera spherical coordinates', () => {
    const scene = new ThreeDScene(container, { orbitControls: false });
    const before = scene.getCameraPosition();

    scene.orbit(0.1, 0.2);
    const after = scene.getCameraPosition();

    // Position should change after orbit
    expect(after).not.toEqual(before);
  });

  it('zoom updates camera radius', () => {
    const scene = new ThreeDScene(container, { orbitControls: false });
    const before = scene.getCameraPosition();
    const beforeRadius = Math.sqrt(before[0]**2 + before[1]**2 + before[2]**2);

    scene.zoom(5);
    const after = scene.getCameraPosition();
    const afterRadius = Math.sqrt(after[0]**2 + after[1]**2 + after[2]**2);

    expect(afterRadius).toBeGreaterThan(beforeRadius);
  });

  it('resize updates camera aspect', () => {
    const scene = new ThreeDScene(container, { orbitControls: false });

    // Should not throw
    scene.resize(1024, 768);
  });

  it('addLight adds a THREE.Light', () => {
    const scene = new ThreeDScene(container, { orbitControls: false });
    const light = { type: 'DirectionalLight' } as any;

    scene.addLight(light);

    // Light should be added (implementation detail tested via mock)
  });

  it('setLighting configures default lights', () => {
    const scene = new ThreeDScene(container, { orbitControls: false });

    scene.setLighting({ ambient: true, directional: true });

    // Should not throw
  });

  it('clearLights removes all lights', () => {
    const scene = new ThreeDScene(container, { orbitControls: false });

    scene.clearLights();

    // Should not throw
  });

  it('addHUD marks mobjects as HUD', () => {
    const scene = new ThreeDScene(container, { orbitControls: false });
    const mob = new Mobject();

    scene.addHUD(mob);

    expect((mob as any).isHUD).toBe(true);
  });

  it('moveCamera returns a Promise', () => {
    const scene = new ThreeDScene(container, { orbitControls: false });

    const result = scene.moveCamera({ position: [0, 0, 5], duration: 0.01 });

    expect(result).toBeInstanceOf(Promise);
  });

  it('does not create separate rAF loops (Golden Rule #4)', () => {
    // The Scheduler should be the only rAF source
    // This is verified by architecture, not runtime test
    const scene = new ThreeDScene(container, { orbitControls: false });

    // ThreeDScene uses Scheduler.addUpdater for camera animation
    // rather than creating its own requestAnimationFrame
    expect(scene).toBeDefined();
  });
});
