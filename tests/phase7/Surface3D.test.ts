import { describe, it, expect, vi } from 'vitest';
import { Surface3D } from '../../src/mobjects/three/Surface3D';
import type { Vec3 } from '../../src/core/types';

describe('Surface3D', () => {
  const defaultUVFunction = (u: number, v: number): Vec3 => [
    u * 2 - 1,
    v * 2 - 1,
    0,
  ];

  it('creates with default parameters', () => {
    const surface = new Surface3D({ uvFunction: defaultUVFunction });

    expect(surface.uRange).toEqual([0, 1]);
    expect(surface.vRange).toEqual([0, 1]);
    expect(surface.uResolution).toBe(32);
    expect(surface.vResolution).toBe(32);
    expect(surface.fillColor).toBe('#ffffff');
    expect(surface.fillOpacity).toBe(1);
    expect(surface.wireframe).toBe(false);
    expect(surface.doubleSided).toBe(true);
  });

  it('creates with custom parameters', () => {
    const surface = new Surface3D({
      uvFunction: defaultUVFunction,
      uRange: [-1, 1],
      vRange: [-2, 2],
      uResolution: 64,
      vResolution: 16,
      color: '#ff0000',
      opacity: 0.5,
      wireframe: true,
      doubleSided: false,
    });

    expect(surface.uRange).toEqual([-1, 1]);
    expect(surface.vRange).toEqual([-2, 2]);
    expect(surface.uResolution).toBe(64);
    expect(surface.vResolution).toBe(16);
    expect(surface.fillColor).toBe('#ff0000');
    expect(surface.fillOpacity).toBe(0.5);
    expect(surface.wireframe).toBe(true);
    expect(surface.doubleSided).toBe(false);
  });

  it('evaluate calls uvFunction', () => {
    const surface = new Surface3D({ uvFunction: defaultUVFunction });
    const result = surface.evaluate(0.5, 0.5);

    expect(result).toEqual([0, 0, 0]);
  });

  it('getPointAt maps normalized coordinates', () => {
    const surface = new Surface3D({
      uvFunction: defaultUVFunction,
      uRange: [0, 10],
      vRange: [0, 100],
    });

    const result = surface.getPointAt(0.5, 0.5);

    // At u=0.5 in [0,10] -> u=5, at v=0.5 in [0,100] -> v=50
    expect(result[0]).toBeCloseTo(5 * 2 - 1); // u * 2 - 1
    expect(result[1]).toBeCloseTo(50 * 2 - 1); // v * 2 - 1
  });

  it('setUVFunction updates function and marks dirty', () => {
    const surface = new Surface3D({ uvFunction: defaultUVFunction });
    surface.dirty = false;

    const newFn = (u: number, v: number): Vec3 => [u, v, u * v];
    surface.setUVFunction(newFn);

    expect(surface.uvFunction).toBe(newFn);
    expect(surface.dirty).toBe(true);
  });

  it('setResolution updates and marks dirty', () => {
    const surface = new Surface3D({ uvFunction: defaultUVFunction });
    surface.dirty = false;

    surface.setResolution(64, 32);

    expect(surface.uResolution).toBe(64);
    expect(surface.vResolution).toBe(32);
    expect(surface.dirty).toBe(true);
  });

  it('setWireframe updates and marks dirty', () => {
    const surface = new Surface3D({ uvFunction: defaultUVFunction });
    surface.dirty = false;

    surface.setWireframe(true);

    expect(surface.wireframe).toBe(true);
    expect(surface.dirty).toBe(true);
  });

  it('setDoubleSided updates and marks dirty', () => {
    const surface = new Surface3D({ uvFunction: defaultUVFunction });
    surface.dirty = false;

    surface.setDoubleSided(false);

    expect(surface.doubleSided).toBe(false);
    expect(surface.dirty).toBe(true);
  });

  it('setFillColor updates and marks dirty', () => {
    const surface = new Surface3D({ uvFunction: defaultUVFunction });
    surface.dirty = false;

    surface.setFillColor('#00ff00');

    expect(surface.fillColor).toBe('#00ff00');
    expect(surface.dirty).toBe(true);
  });

  it('setFillOpacity updates and marks dirty', () => {
    const surface = new Surface3D({ uvFunction: defaultUVFunction });
    surface.dirty = false;

    surface.setFillOpacity(0.8);

    expect(surface.fillOpacity).toBe(0.8);
    expect(surface.dirty).toBe(true);
  });

  it('captureState includes Surface3D-specific properties', () => {
    const surface = new Surface3D({
      uvFunction: defaultUVFunction,
      checkerboardColors: ['#ff0000', '#00ff00'],
    });

    const state = surface.captureState();

    expect(state.extra).toHaveProperty('uvFunction');
    expect(state.extra).toHaveProperty('uRange');
    expect(state.extra).toHaveProperty('vRange');
    expect(state.extra).toHaveProperty('uResolution');
    expect(state.extra).toHaveProperty('vResolution');
    expect(state.extra).toHaveProperty('fillColor');
    expect(state.extra).toHaveProperty('fillOpacity');
    expect(state.extra).toHaveProperty('wireframe');
    expect(state.extra).toHaveProperty('doubleSided');
    expect(state.extra).toHaveProperty('checkerboardColors');
  });

  it('restoreState restores all properties', () => {
    const surface = new Surface3D({
      uvFunction: defaultUVFunction,
      color: '#ff0000',
      opacity: 0.5,
    });

    const state = surface.captureState();

    surface.setFillColor('#000000');
    surface.setFillOpacity(1);
    surface.dirty = false;

    surface.restoreState(state);

    expect(surface.fillColor).toBe('#ff0000');
    expect(surface.fillOpacity).toBe(0.5);
    expect(surface.dirty).toBe(true);
  });

  it('copy creates independent instance', () => {
    const surface = new Surface3D({
      uvFunction: defaultUVFunction,
      color: '#ff0000',
    });
    surface.position = [1, 2, 3];
    surface.rotation = [0, Math.PI / 2, 0];
    surface.scale = [2, 2, 2];

    const copy = surface.copy();

    expect(copy).toBeInstanceOf(Surface3D);
    expect(copy.fillColor).toBe('#ff0000');
    expect(copy.position).toEqual([1, 2, 3]);
    expect(copy.rotation).toEqual([0, Math.PI / 2, 0]);
    expect(copy.scale).toEqual([2, 2, 2]);
    expect(copy.id).not.toBe(surface.id);
  });
});
