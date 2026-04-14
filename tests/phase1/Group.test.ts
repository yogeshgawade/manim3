import { describe, it, expect } from 'vitest';
import { Group }    from '../../src/core/Group';
import { VMobject } from '../../src/core/VMobject';
import { Mobject }  from '../../src/core/Mobject';

describe('Group — is NOT a VMobject', () => {
  it('Group does NOT extend VMobject', () => {
    const g = new Group();
    expect(g instanceof VMobject).toBe(false);
  });

  it('Group DOES extend Mobject', () => {
    const g = new Group();
    expect(g instanceof Mobject).toBe(true);
  });

  it('Group has no points3D property', () => {
    const g = new Group();
    expect((g as any).points3D).toBeUndefined();
  });

  it('Group accepts mobjects in constructor', () => {
    const a = new Mobject();
    const b = new Mobject();
    const g = new Group(a, b);
    expect(g.children).toContain(a);
    expect(g.children).toContain(b);
  });

  it('shift propagates to children', () => {
    const child = new Mobject();
    child.position = [0, 0, 0];
    const g = new Group(child);
    g.shift([1, 0, 0]);
    expect(child.position[0]).toBe(1);
  });
});
