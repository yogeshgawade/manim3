import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Renderer }   from '../../src/renderer/Renderer';
import { VMobject }   from '../../src/core/VMobject';
import { Group }      from '../../src/core/Group';
import { Mobject }    from '../../src/core/Mobject';

describe('Renderer — reconciler', () => {
  let renderer: Renderer;

  beforeEach(() => {
    const canvas = document.createElement('canvas');
    renderer = new Renderer(canvas, { width: 800, height: 450 });
  });

  it('creates a RenderNode for a newly added Mobject', () => {
    const m = new VMobject();
    renderer.reconcile([m]);
    expect(renderer.getRenderNode(m.id)).toBeDefined();
  });

  it('destroys RenderNode when Mobject is removed', () => {
    const m = new VMobject();
    renderer.reconcile([m]);
    renderer.reconcile([]);
    expect(renderer.getRenderNode(m.id)).toBeUndefined();
  });

  it('sync() is called only on dirty Mobjects', () => {
    const m = new VMobject();
    renderer.reconcile([m]);
    const node    = renderer.getRenderNode(m.id)!;
    const syncSpy = vi.spyOn(node, 'sync');

    m.dirty = false;
    renderer.syncDirty([m]);
    expect(syncSpy).not.toHaveBeenCalled();

    m.dirty = true;
    renderer.syncDirty([m]);
    expect(syncSpy).toHaveBeenCalledOnce();
  });

  it('dirty flag is cleared after sync', () => {
    const m = new VMobject();
    m.dirty = true;
    renderer.reconcile([m]);
    renderer.syncDirty([m]);
    expect(m.dirty).toBe(false);
  });

  it('setHoverHighlight does NOT change mobject.color', () => {
    const m = new VMobject();
    m.color = '#ff0000';
    renderer.reconcile([m]);
    renderer.getRenderNode(m.id)!.setHoverHighlight(true);
    expect(m.color).toBe('#ff0000');
  });

  it('Group gets GroupRenderNode, VMobject gets VMobjectRenderNode', () => {
    const v = new VMobject();
    const g = new Group(v);
    renderer.reconcile([g, v]);
    expect(renderer.getRenderNode(v.id)?.constructor.name).toBe('VMobjectRenderNode');
    expect(renderer.getRenderNode(g.id)?.constructor.name).toBe('GroupRenderNode');
  });

  it('fill mesh is added when fillOpacity > 0', () => {
    const m = new VMobject();
    // minimal 4-point cubic bezier (degenerate straight line)
    m.points3D = [
      [0,0,0],[0.5,0,0],[1,0,0],[1,1,0],
    ];
    m.fillOpacity = 1;
    m.dirty = true;
    renderer.reconcile([m]);
    renderer.syncDirty([m]);
    const node = renderer.getRenderNode(m.id)!;
    // Group should have 2 children: fill group + stroke mesh
    expect(node.threeObject.children.length).toBe(2);
  });

  it('fill group is hidden when fillOpacity === 0', () => {
    const m = new VMobject();
    m.points3D = [[0,0,0],[0.5,0,0],[1,0,0],[1,1,0]];
    m.fillOpacity = 0;
    m.dirty = true;
    renderer.reconcile([m]);
    renderer.syncDirty([m]);
    const node = renderer.getRenderNode(m.id)!;
    const fillGroup = node.threeObject.children[0] as any;
    expect(fillGroup.visible).toBe(false);
  });
});
