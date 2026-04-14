import { describe, it, expect, vi } from 'vitest';
import { Mobject } from '../../src/core/Mobject';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Mobject — zero THREE.js', () => {
  it('has no import from three in its module graph', () => {
    const srcPath = resolve(__dirname, '../../src/core/Mobject.ts');
    const src = readFileSync(srcPath, 'utf-8');
    // Check for actual import statements (not comments)
    const importRegex = /^\s*import\s+.*\s+from\s+['"]three['"]/m;
    expect(src).not.toMatch(importRegex);
  });

  it('position is a plain Vec3 array, not a THREE.Vector3', () => {
    const m = new Mobject();
    expect(Array.isArray(m.position)).toBe(true);
    expect(m.position).toHaveLength(3);
  });

  it('shift moves position by delta', () => {
    const m = new Mobject();
    m.position = [1, 2, 0];
    m.shift([3, -1, 0]);
    expect(m.position).toEqual([4, 1, 0]);
  });

  it('markDirty sets dirty flag', () => {
    const m = new Mobject();
    m.dirty = false;
    m.markDirty();
    expect(m.dirty).toBe(true);
  });

  it('add() registers child and markDirty', () => {
    const parent = new Mobject();
    const child  = new Mobject();
    parent.add(child);
    expect(parent.children).toContain(child);
  });

  it('remove() unregisters child', () => {
    const parent = new Mobject();
    const child  = new Mobject();
    parent.add(child);
    parent.remove(child);
    expect(parent.children).not.toContain(child);
  });

  it('captureState() returns plain JSON-serializable object', () => {
    const m = new Mobject();
    m.position = [1, 2, 0];
    m.opacity  = 0.5;
    const state = m.captureState();
    expect(() => JSON.stringify(state)).not.toThrow();
    expect(state.position).toEqual([1, 2, 0]);
    expect(state.opacity).toBe(0.5);
  });

  it('restoreState() restores all properties exactly', () => {
    const m = new Mobject();
    m.position = [3, 4, 0];
    m.opacity  = 0.7;
    const state = m.captureState();
    m.position = [0, 0, 0];
    m.opacity  = 1;
    m.restoreState(state);
    expect(m.position).toEqual([3, 4, 0]);
    expect(m.opacity).toBeCloseTo(0.7);
  });

  it('captureState() deep clones — mutating state does not affect mobject', () => {
    const m = new Mobject();
    m.position = [1, 2, 0];
    const state = m.captureState();
    state.position[0] = 99;
    expect(m.position[0]).toBe(1);
  });

  it('updaters run on update(dt)', () => {
    const m = new Mobject();
    const calls: number[] = [];
    m.addUpdater((_mob, dt) => calls.push(dt));
    m.update(0.016);
    m.update(0.016);
    expect(calls).toHaveLength(2);
  });

  it('removeUpdater stops it from running', () => {
    const m = new Mobject();
    const calls: number[] = [];
    const fn = (_: Mobject, dt: number) => calls.push(dt);
    m.addUpdater(fn);
    m.removeUpdater(fn);
    m.update(0.016);
    expect(calls).toHaveLength(0);
  });

  it('on/off interaction handlers', () => {
    const m = new Mobject();
    const handler = vi.fn();
    m.on('click', handler);
    expect(m.handlers.onClick).toBe(handler);
    m.off('click');
    expect(m.handlers.onClick).toBeUndefined();
  });

  it('getFamily() returns self + all descendants', () => {
    const root  = new Mobject();
    const child = new Mobject();
    const grand = new Mobject();
    root.add(child);
    child.add(grand);
    const family = root.getFamily();
    expect(family).toContain(root);
    expect(family).toContain(child);
    expect(family).toContain(grand);
    expect(family).toHaveLength(3);
  });
});
