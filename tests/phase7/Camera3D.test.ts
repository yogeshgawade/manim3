import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Camera3D } from '../../src/renderer/Camera3D';
import type { Vec3 } from '../../src/core/types';

describe('Camera3D', () => {
  let camera: Camera3D;

  beforeEach(() => {
    camera = new Camera3D(45, 16 / 9, 0.1, 1000);
  });

  it('initializes with spherical coordinates', () => {
    const spherical = camera.getSpherical();
    expect(spherical.radius).toBe(10);
    expect(spherical.phi).toBe(Math.PI / 3);
    expect(spherical.theta).toBe(Math.PI / 4);
  });

  it('setPosition updates camera position', () => {
    camera.setPosition([5, 5, 5]);
    const pos = camera.getPosition();
    expect(pos[0]).toBeCloseTo(5);
    expect(pos[1]).toBeCloseTo(5);
    expect(pos[2]).toBeCloseTo(5);
  });

  it('setTarget updates lookAt target', () => {
    camera.setTarget([1, 2, 3]);
    const target = camera.getTarget();
    expect(target[0]).toBe(1);
    expect(target[1]).toBe(2);
    expect(target[2]).toBe(3);
  });

  it('orbit changes spherical coordinates', () => {
    const before = camera.getSpherical();
    camera.orbit(0.1, 0.2);
    const after = camera.getSpherical();

    expect(after.phi).toBeCloseTo(before.phi + 0.1, 3);
    expect(after.theta).toBeCloseTo(before.theta + 0.2, 3);
  });

  it('orbit clamps phi to prevent flipping', () => {
    // Try to orbit past vertical
    camera.setSpherical(10, 0.1, 0);
    camera.orbit(-1, 0);
    const after = camera.getSpherical();

    // Phi should be clamped to minimum 0.1
    expect(after.phi).toBeGreaterThanOrEqual(0.1);
  });

  it('zoom changes radius', () => {
    const before = camera.getSpherical().radius;
    camera.zoom(5);
    const after = camera.getSpherical().radius;

    expect(after).toBe(before + 5);
  });

  it('zoom clamps radius to minimum 2', () => {
    camera.setSpherical(3, Math.PI / 3, 0);
    camera.zoom(-5);
    const after = camera.getSpherical().radius;

    expect(after).toBe(2);
  });

  it('zoom clamps radius to maximum 100', () => {
    camera.setSpherical(90, Math.PI / 3, 0);
    camera.zoom(20);
    const after = camera.getSpherical().radius;

    expect(after).toBe(100);
  });

  it('setAspect updates camera aspect ratio', () => {
    camera.setAspect(4 / 3);
    const cam = camera.getCamera();
    expect(cam.aspect).toBeCloseTo(4 / 3);
  });

  it('lerpPosition interpolates position', () => {
    camera.setPosition([0, 0, 10]);
    camera.lerpPosition([10, 10, 10], 0.5);
    const pos = camera.getPosition();

    expect(pos[0]).toBeCloseTo(5);
    expect(pos[1]).toBeCloseTo(5);
    expect(pos[2]).toBe(10);
  });

  it('lerpTarget interpolates lookAt target', () => {
    camera.setTarget([0, 0, 0]);
    camera.lerpTarget([10, 10, 10], 0.5);
    const target = camera.getTarget();

    expect(target[0]).toBeCloseTo(5);
    expect(target[1]).toBeCloseTo(5);
    expect(target[2]).toBeCloseTo(5);
  });
});
