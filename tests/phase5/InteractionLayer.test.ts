import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InteractionLayer } from '../../src/scene/InteractionLayer';
import { LogicalScene } from '../../src/scene/LogicalScene';
import { Renderer } from '../../src/renderer/Renderer';
import { Mobject } from '../../src/core/Mobject';

describe('Phase 5 — InteractionLayer', () => {
  let canvas: HTMLCanvasElement;
  let logicalScene: LogicalScene;
  let mockRenderer: Renderer;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.style.width = '800px';
    canvas.style.height = '450px';
    document.body.appendChild(canvas);

    logicalScene = new LogicalScene();
    mockRenderer = {
      getRenderNode: vi.fn(),
      reconcile: vi.fn(),
      syncDirty: vi.fn(),
      render: vi.fn(),
      camera: { isPerspectiveCamera: false },
      threeScene: { add: vi.fn(), remove: vi.fn() },
    } as unknown as Renderer;
  });

  it('can be instantiated without error', () => {
    const layer = new InteractionLayer(canvas, mockRenderer, logicalScene, {
      hoverHighlight: false,
    });
    expect(layer).toBeDefined();
    layer.dispose();
  });

  it('dispose() removes event listeners', () => {
    const removeEventListenerSpy = vi.spyOn(canvas, 'removeEventListener');

    const layer = new InteractionLayer(canvas, mockRenderer, logicalScene);
    layer.dispose();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointerdown', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('pointerleave', expect.any(Function));
  });
});
