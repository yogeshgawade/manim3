/**
 * InteractionLayer — Raycaster bridge for mouse/touch events.
 * Maps pointer events to Mobject handlers. Never modifies Mobject state directly.
 */

import * as THREE from 'three';
import type { Renderer } from '../renderer/Renderer';
import type { LogicalScene } from './LogicalScene';
import type { Mobject } from '../core/Mobject';
import type { Vec2 } from '../core/types';

export interface InteractionLayerOptions {
  /** Enable hover highlighting via shader uniform (default: true) */
  hoverHighlight?: boolean;
}

export class InteractionLayer {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private logicalScene: LogicalScene;
  private raycaster = new THREE.Raycaster();
  private hoveredId: string | null = null;
  private isDragging = false;
  private lastPointerPos: Vec2 = [0, 0];
  private options: Required<InteractionLayerOptions>;

  constructor(
    canvas: HTMLCanvasElement,
    renderer: Renderer,
    logicalScene: LogicalScene,
    options: InteractionLayerOptions = {}
  ) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.logicalScene = logicalScene;
    this.options = {
      hoverHighlight: true,
      ...options,
    };

    this._bindEvents();
  }

  // ── Event Binding ─────────────────────────────────────────────────────

  private _bindEvents(): void {
    this.canvas.addEventListener('pointermove', this._onPointerMove);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('pointerup', this._onPointerUp);
    this.canvas.addEventListener('pointerleave', this._onPointerLeave);
  }

  dispose(): void {
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.canvas.removeEventListener('pointerup', this._onPointerUp);
    this.canvas.removeEventListener('pointerleave', this._onPointerLeave);
  }

  // ── Event Handlers ──────────────────────────────────────────────────────

  private _onPointerMove = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Handle drag
    if (this.isDragging && this.hoveredId) {
      const delta: Vec2 = [x - this.lastPointerPos[0], y - this.lastPointerPos[1]];
      const mob = this._getMobjectById(this.hoveredId);
      if (mob?.handlers.onDrag) {
        mob.handlers.onDrag(delta, e);
      }
    }

    this.lastPointerPos = [x, y];

    // Handle hover
    const hit = this._raycast(x, y);
    const hitId = hit?.id ?? null;

    if (hitId !== this.hoveredId) {
      // Hover out on previous
      if (this.hoveredId) {
        const oldMob = this._getMobjectById(this.hoveredId);
        if (oldMob) {
          oldMob.handlers.onHoverOut?.(e);
          if (this.options.hoverHighlight) {
            this.renderer.getRenderNode(this.hoveredId)?.setHoverHighlight(false);
          }
        }
      }

      // Hover in on new
      if (hit) {
        hit.handlers.onHover?.(e);
        if (this.options.hoverHighlight) {
          this.renderer.getRenderNode(hit.id)?.setHoverHighlight(true);
        }
        this.canvas.style.cursor = hit.handlers.onClick ? 'pointer' : 'default';
      } else {
        this.canvas.style.cursor = 'default';
      }

      this.hoveredId = hitId;
    }
  };

  private _onPointerDown = (e: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const hit = this._raycast(x, y);
    if (hit?.handlers.onClick) {
      hit.handlers.onClick(e);
    }

    if (hit?.handlers.onDrag) {
      this.isDragging = true;
      this.hoveredId = hit.id;
      this.canvas.setPointerCapture(e.pointerId);
    }
  };

  private _onPointerUp = (e: PointerEvent): void => {
    if (this.isDragging) {
      this.isDragging = false;
      const mob = this.hoveredId ? this._getMobjectById(this.hoveredId) : null;
      mob?.handlers.onDragEnd?.(e);
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if capture was not set
      }
    }
  };

  private _onPointerLeave = (): void => {
    if (this.hoveredId) {
      const mob = this._getMobjectById(this.hoveredId);
      if (mob) {
        mob.handlers.onHoverOut?.({} as PointerEvent);
        if (this.options.hoverHighlight) {
          this.renderer.getRenderNode(this.hoveredId)?.setHoverHighlight(false);
        }
      }
      this.hoveredId = null;
      this.canvas.style.cursor = 'default';
    }
  };

  // ── Raycasting ─────────────────────────────────────────────────────────

  private _raycast(ndcX: number, ndcY: number): Mobject | null {
    const allMobs = this.logicalScene.getAllMobjects();

    // Find interactive mobjects with render nodes
    for (const mob of allMobs) {
      if (!mob.interactive && !mob.handlers.onClick && !mob.handlers.onHover) {
        continue;
      }

      const node = this.renderer.getRenderNode(mob.id);
      if (!node) continue;

      this.raycaster.setFromCamera({ x: ndcX, y: ndcY }, (this.renderer as any).camera);

      const intersects = this.raycaster.intersectObject(node.threeObject, true);
      if (intersects.length > 0) {
        return mob;
      }
    }

    return null;
  }

  private _getMobjectById(id: string): Mobject | undefined {
    return this.logicalScene.getAllMobjects().find(m => m.id === id);
  }
}
