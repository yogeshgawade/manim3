import { describe, it, expect } from 'vitest';
import { VMobject } from '../../src/core/VMobject';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('VMobject — points3D', () => {
  it('has no import from three', () => {
    const srcPath = resolve(__dirname, '../../src/core/VMobject.ts');
    const src = readFileSync(srcPath, 'utf-8');
    // Check for actual import statements (not comments)
    const importRegex = /^\s*import\s+.*\s+from\s+['"]three['"]/m;
    expect(src).not.toMatch(importRegex);
  });

  it('points3D is number[][] — each point has 3 coords', () => {
    const v = new VMobject();
    v.setPoints3D([[0,0,0],[1,0,0],[1,1,0],[0,1,0]]);
    expect(v.points3D[0]).toHaveLength(3);
  });

  it('setPoints3D stores points correctly', () => {
    const v = new VMobject();
    v.setPoints3D([[1,2,3],[4,5,6]]);
    expect(v.points3D[0]).toEqual([1,2,3]);
    expect(v.points3D[1]).toEqual([4,5,6]);
  });

  it('setPoints3D calls markDirty', () => {
    const v = new VMobject();
    v.dirty = false;
    v.setPoints3D([[0,0,0]]);
    expect(v.dirty).toBe(true);
  });

  it('captureState includes points3D deep clone', () => {
    const v = new VMobject();
    v.setPoints3D([[1,2,3]]);
    const state = v.captureState();
    state.points3D[0][0] = 99;
    expect(v.points3D[0][0]).toBe(1);
  });

  it('restoreState restores points3D', () => {
    const v = new VMobject();
    v.setPoints3D([[1,2,3]]);
    const state = v.captureState();
    v.setPoints3D([[9,9,9]]);
    v.restoreState(state);
    expect(v.points3D[0]).toEqual([1,2,3]);
  });

  it('Z coordinate is preserved — not silently dropped', () => {
    const v = new VMobject();
    v.setPoints3D([[0,0,5],[1,0,5],[1,1,5],[0,1,5]]);
    expect(v.points3D.every(p => p[2] === 5)).toBe(true);
  });

  it('does NOT have alignPoints, bestRotation, reverseBezierPath methods', () => {
    const v = new VMobject();
    expect((v as any).alignPoints).toBeUndefined();
    expect((v as any).bestRotation).toBeUndefined();
    expect((v as any).reverseBezierPath).toBeUndefined();
  });
});
