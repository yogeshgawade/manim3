/**
 * Scene — 2D scene coordinating Scheduler, Renderer, LogicalScene, InteractionLayer.
 * Thin wiring layer — all heavy logic delegated to subsystems.
 */

import { Scheduler, TimelineBuilder } from '../scheduler/Scheduler';
import { Renderer, type RendererOptions } from '../renderer/Renderer';
import { LogicalScene } from './LogicalScene';
import { InteractionLayer } from './InteractionLayer';
import { GroupTrack, parallel } from '../animation/GroupTrack';
import type { AnimationTrack } from '../animation/AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { MobjectState, TimePosition } from '../core/types';

export interface SceneOptions extends RendererOptions {
  /** Enable dev tools panel */
  devTools?: boolean;
  /** Enable interaction layer */
  interactive?: boolean;
}

export class Scene {
  protected logicalScene = new LogicalScene();
  private _scheduler = new Scheduler();
  protected renderer: Renderer;
  protected interaction?: InteractionLayer;
  protected canvas: HTMLCanvasElement;

  private initialStates = new Map<string, MobjectState>();

  constructor(container: HTMLElement, options: SceneOptions = {}) {
    const { devTools, interactive = true, ...rendererOpts } = options;

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    container.appendChild(this.canvas);

    // Initialize subsystems
    this.renderer = new Renderer(this.canvas, rendererOpts);

    // Wire Scheduler → Renderer
    this._scheduler.onFrameReady = () => {
      this._renderFrame();
    };

    // Setup interaction
    if (interactive) {
      this.interaction = new InteractionLayer(this.canvas, this.renderer, this.logicalScene);
    }

    // Dev tools
    if (devTools) {
      // Inspector will be implemented in later phase
      console.log('[Scene] DevTools enabled (placeholder)');
    }
  }

  // ── Mobject Management ─────────────────────────────────────────────────

  add(...mobjects: Mobject[]): this {
    this.logicalScene.add(...mobjects);
    // Capture initial states for reset functionality
    for (const mob of mobjects) {
      this.initialStates.set(mob.id, mob.captureState());
      // Also capture for all children in the family
      for (const familyMob of mob.getFamily()) {
        if (!this.initialStates.has(familyMob.id)) {
          this.initialStates.set(familyMob.id, familyMob.captureState());
        }
      }
    }
    return this;
  }

  remove(...mobjects: Mobject[]): this {
    this.logicalScene.remove(...mobjects);
    return this;
  }

  /**
   * Add mobjects to the foreground layer (rendered on top of all regular mobjects).
   * Useful for HUD elements, zoom displays, etc.
   */
  addForeground(...mobjects: Mobject[]): this {
    this.logicalScene.addForeground(...mobjects);
    // Capture initial states for foreground mobjects too
    for (const mob of mobjects) {
      this.initialStates.set(mob.id, mob.captureState());
      for (const familyMob of mob.getFamily()) {
        if (!this.initialStates.has(familyMob.id)) {
          this.initialStates.set(familyMob.id, familyMob.captureState());
        }
      }
    }
    return this;
  }

  /**
   * Remove mobjects from the foreground layer.
   */
  removeForeground(...mobjects: Mobject[]): this {
    this.logicalScene.removeForeground(...mobjects);
    return this;
  }

  clear(): this {
    this.logicalScene.clear();
    return this;
  }

  getMobjects(): readonly Mobject[] {
    return this.logicalScene.getMobjects();
  }

  // ── Animation Playback ──────────────────────────────────────────────────

  /**
   * Play animation(s) and return a Promise that resolves on completion.
   * Uses the timeline builder for positioning at current end time.
   */
  async play(...tracks: AnimationTrack[]): Promise<void> {
    return new Promise((resolve) => {
      // Use scheduler's at('+=0') to schedule at current end time
      const builder = this._scheduler.at('+=0');
      builder.play(...tracks);

      // Resolve when complete
      this._scheduler.onComplete = () => {
        // Handle remover tracks
        for (const { track } of this._scheduler['_tracks'] ?? []) {
          if (track.remover) {
            this.logicalScene.remove(track.mobject);
          }
        }
        resolve();
      };

      this._scheduler.play();
    });
  }

  /** Wait for a duration (seconds). No animation, just delays. */
  async wait(duration: number = 1): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, duration * 1000);
    });
  }

  // ── Direct Scheduler Control ───────────────────────────────────────────

  /** Seek to a specific time (synchronous, for scrubbing) */
  seek(t: number): void {
    // First restore all mobjects to initial states
    for (const mob of this.logicalScene.getAllMobjects()) {
      const initialState = this.initialStates.get(mob.id);
      if (initialState) {
        mob.restoreState(initialState);
      } else {
        // Dynamically added mob (e.g. morph clone) — treat opacity=0 as initial state
        mob.opacity = 0;
        mob.markDirty();
      }
    }
    // Then apply tracks at the seek time
    this._scheduler.seek(t);
    this._renderFrame();
  }

  pause(): void {
    this._scheduler.pause();
  }

  resume(): void {
    this._scheduler.resume();
  }

  reset(): void {
    this._scheduler.reset();
    // Restore all mobjects to their initial captured states
    for (const mob of this.logicalScene.getAllMobjects()) {
      const initialState = this.initialStates.get(mob.id);
      if (initialState) {
        mob.restoreState(initialState);
      } else {
        mob.opacity = 0;
        mob.markDirty();
      }
    }
  }

  // ── Timeline Builder ───────────────────────────────────────────────────

  /**
   * Add a bookmark at the current timeline position.
   * Can be referenced later with 'bookmark:name'.
   */
  addBookmark(name: string): this {
    this._scheduler.addBookmark(name, this._scheduler.lastTrackEndTime);
    return this;
  }

  /**
   * Access the scheduler for direct control (building timelines, checking state)
   */
  get scheduler(): Scheduler {
    return this._scheduler;
  }

  /**
   * Position the next animation at a specific time.
   * Supports: number (absolute), '+=' (relative), '<' (same as last start), 'bookmark:name'
   */
  at(position: TimePosition): TimelineBuilder {
    return this._scheduler.at(position);
  }

  // ── Rendering ───────────────────────────────────────────────────────────

  protected _renderFrame(): void {
    // Reconcile logical scene → render nodes
    this.renderer.reconcile(this.logicalScene.getAllMobjects());
    // Sync dirty nodes
    this.renderer.syncDirty(this.logicalScene.getAllMobjects());
    // Render
    this.renderer.render();
  }

  // ── Lifecycle ───────────────────────────────────────────────────────────

  resize(width: number, height: number): void {
    this.renderer.resize(width, height);
  }

  dispose(): void {
    this._scheduler.pause();
    this.interaction?.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
