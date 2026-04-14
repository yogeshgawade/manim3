/**
 * ThreeDScene — 3D scene with perspective camera, lighting, and orbit controls.
 * Extends Scene, replaces orthographic camera with perspective.
 */

import * as THREE from 'three';
import { Scene, type SceneOptions } from './Scene';
import { Camera3D } from '../renderer/Camera3D';
import { UpdaterTrack } from '../animation/UpdaterTrack';
import { BillboardGroup } from '../mobjects/three/BillboardGroup';
import type { Mobject } from '../core/Mobject';
import type { Vec3 } from '../core/types';

export interface ThreeDSceneOptions extends SceneOptions {
  /** Camera field of view (default: 45) */
  fov?: number;
  /** Near clipping plane (default: 0.1) */
  near?: number;
  /** Far clipping plane (default: 1000) */
  far?: number;
  /** Initial camera position (default: [0, 0, 10]) */
  cameraPosition?: Vec3;
  /** Enable orbit controls (default: true) */
  orbitControls?: boolean;
}

/**
 * ThreeDScene extends Scene with 3D-specific features:
 * - Camera3D with perspective projection
 * - Orbit controls as UpdaterTrack (uses Scheduler, no separate rAF)
 * - Lighting configuration
 * - HUD support for billboard labels
 */
export class ThreeDScene extends Scene {
  private camera3D: Camera3D;
  private lights: THREE.Light[] = [];
  private isDragging = false;
  private isPanning = false;
  private previousMouse: { x: number; y: number } | null = null;
  
  // HUD / Fixed-in-frame support
  private hudScene: THREE.Scene;
  private hudCamera: THREE.OrthographicCamera;
  private fixedMobjects: Set<Mobject> = new Set();

  constructor(container: HTMLElement, options: ThreeDSceneOptions = {}) {
    super(container, { ...options, interactive: options.interactive ?? true });

    const {
      fov = 45,
      near = 0.1,
      far = 1000,
      cameraPosition = [0, 0, 10],
      orbitControls = true,
    } = options;

    // Get renderer size for camera setup
    const { width, height } = this.getRendererSize();

    // Create Camera3D
    this.camera3D = new Camera3D(fov, width / height, near, far);
    this.camera3D.setPosition(cameraPosition);

    // Replace renderer's camera with our perspective camera
    const perspectiveCamera = this.camera3D.getCamera();
    (this.renderer as any).camera = perspectiveCamera;

    // Setup HUD scene for fixed-in-frame mobjects
    // Use world units (like manim-web) not pixels for consistent positioning
    this.hudScene = new THREE.Scene();
    const frameWidth = (options as any).frameWidth ?? 14;
    const frameHeight = (options as any).frameHeight ?? 8;
    const halfW = frameWidth / 2;
    const halfH = frameHeight / 2;
    this.hudCamera = new THREE.OrthographicCamera(
      -halfW, halfW,
      halfH, -halfH,
      0.1, 1000
    );
    this.hudCamera.position.z = 10;

    // Setup default lighting
    this._setupDefaultLighting();

    // Setup orbit controls as UpdaterTrack (not separate rAF!)
    if (orbitControls) {
      this._setupOrbitControls();
    }
  }

  // ── Camera Control ────────────────────────────────────────────────────

  /**
   * Override add() to auto-register billboard updaters.
   */
  override add(...mobjects: Mobject[]): this {
    super.add(...mobjects);
    
    // Auto-add updater for BillboardGroup instances
    for (const mob of mobjects) {
      if (mob instanceof BillboardGroup) {
        const updater = new UpdaterTrack(mob, () => {
          const camPos = this.getCameraPosition();
          mob.setCameraPosition(camPos);
          mob.updateBillboardRotation();
          mob.markDirty();
        });
        this.scheduler['addUpdater']?.(updater);
      }
      // Also check family members (in case billboard is nested)
      for (const familyMob of mob.getFamily()) {
        if (familyMob instanceof BillboardGroup) {
          const updater = new UpdaterTrack(familyMob, () => {
            const camPos = this.getCameraPosition();
            familyMob.setCameraPosition(camPos);
            familyMob.updateBillboardRotation();
            familyMob.markDirty();
          });
          this.scheduler['addUpdater']?.(updater);
        }
      }
    }
    return this;
  }

  /**
   * Move camera to new position and/or target.
   * Uses AnimationTrack system, not separate rAF.
   */
  moveCamera(options: {
    position?: Vec3;
    target?: Vec3;
    duration?: number;
    ease?: (t: number) => number;
  }): Promise<void> {
    const { position, target, duration = 1, ease = (t) => t } = options;

    return new Promise((resolve) => {
      const startPos = this.camera3D.getPosition();
      const startTarget = this.camera3D.getTarget();
      const endPos = position ?? startPos;
      const endTarget = target ?? startTarget;

      let elapsed = 0;

      // Create temporary mobject for animation
      const animMob = { id: 'camera-anim' } as Mobject;

      // Add updater to Scheduler (uses single rAF)
      const updater = new UpdaterTrack(animMob, (_, dt) => {
        elapsed += dt;
        const alpha = Math.min(elapsed / duration, 1);
        const eased = ease(alpha);

        // Lerp position
        const lerpedPos: Vec3 = [
          startPos[0] + (endPos[0] - startPos[0]) * eased,
          startPos[1] + (endPos[1] - startPos[1]) * eased,
          startPos[2] + (endPos[2] - startPos[2]) * eased,
        ];
        this.camera3D.setPosition(lerpedPos);

        // Lerp target
        const lerpedTarget: Vec3 = [
          startTarget[0] + (endTarget[0] - startTarget[0]) * eased,
          startTarget[1] + (endTarget[1] - startTarget[1]) * eased,
          startTarget[2] + (endTarget[2] - startTarget[2]) * eased,
        ];
        this.camera3D.setTarget(lerpedTarget);

        // Trigger render
        (this as any)._renderFrame();

        if (alpha >= 1) {
          this.scheduler['removeUpdater']?.(updater);
          resolve();
        }
      });

      this.scheduler['addUpdater']?.(updater);
    });
  }

  setCamera(position: Vec3, target: Vec3 = [0, 0, 0]): void {
    this.camera3D.setPosition(position);
    this.camera3D.setTarget(target);
    (this as any)._renderFrame();
  }

  getCameraPosition(): Vec3 {
    return this.camera3D.getPosition();
  }

  getCameraTarget(): Vec3 {
    return this.camera3D.getTarget();
  }

  // ── Spherical Control ────────────────────────────────────────────────────

  orbit(deltaPhi: number, deltaTheta: number): void {
    this.camera3D.orbit(deltaPhi, deltaTheta);
    (this as any)._renderFrame();
  }

  zoom(delta: number): void {
    this.camera3D.zoom(delta);
    (this as any)._renderFrame();
  }

  // ── Lighting ────────────────────────────────────────────────────────────────

  addLight(light: THREE.Light): this {
    (this.renderer as any).threeScene.add(light);
    this.lights.push(light);
    return this;
  }

  removeLight(light: THREE.Light): this {
    (this.renderer as any).threeScene.remove(light);
    this.lights = this.lights.filter(l => l !== light);
    return this;
  }

  clearLights(): this {
    for (const light of this.lights) {
      (this.renderer as any).threeScene.remove(light);
    }
    this.lights = [];
    return this;
  }

  setLighting(options: {
    ambient?: boolean;
    ambientIntensity?: number;
    directional?: boolean;
    directionalIntensity?: number;
    point?: Vec3[];
  }): this {
    this.clearLights();

    const {
      ambient = true,
      ambientIntensity = 0.4,
      directional = true,
      directionalIntensity = 1,
      point = [],
    } = options;

    if (ambient) {
      const ambientLight = new THREE.AmbientLight(0xffffff, ambientIntensity);
      this.addLight(ambientLight);
    }

    if (directional) {
      const dirLight = new THREE.DirectionalLight(0xffffff, directionalIntensity);
      dirLight.position.set(5, 10, 7);
      this.addLight(dirLight);
    }

    for (const pos of point) {
      const pointLight = new THREE.PointLight(0xffffff, 1, 100);
      pointLight.position.set(...pos);
      this.addLight(pointLight);
    }

    return this;
  }

  // ── HUD / Fixed Layer ─────────────────────────────────────────────────────

  /**
   * Add mobjects that stay fixed in frame (screen space).
   * These objects don't move with camera - they stay at the same screen position.
   * Position is in screen pixels (0,0 is center).
   */
  addFixedInFrameMobjects(...mobjects: Mobject[]): this {
    for (const mob of mobjects) {
      this.fixedMobjects.add(mob);
      (mob as any).isFixedInFrame = true;
      
      // Add to logical scene for animation/tracking
      this.logicalScene.add(mob);
      
      // Create initial state for reset functionality
      this['initialStates'].set(mob.id, mob.captureState());
      for (const familyMob of mob.getFamily()) {
        if (!this['initialStates'].has(familyMob.id)) {
          this['initialStates'].set(familyMob.id, familyMob.captureState());
        }
      }
    }
    // Trigger a render to show immediately
    this._renderFrame();
    return this;
  }

  /**
   * Remove mobjects from the fixed-in-frame set.
   */
  removeFixedInFrameMobjects(...mobjects: Mobject[]): this {
    for (const mob of mobjects) {
      this.fixedMobjects.delete(mob);
      (mob as any).isFixedInFrame = false;
      
      // Remove from HUD scene
      const node = (this.renderer as any).getRenderNode(mob.id);
      if (node) {
        this.hudScene.remove(node.threeObject);
      }
    }
    this._renderFrame();
    return this;
  }

  /**
   * @deprecated Use addFixedInFrameMobjects instead
   */
  addHUD(...mobjects: Mobject[]): this {
    return this.addFixedInFrameMobjects(...mobjects);
  }

  // ── Resize Override ─────────────────────────────────────────────────────────

  override resize(width: number, height: number): void {
    super.resize(width, height);
    this.camera3D.setAspect(width / height);
    
    // HUD camera stays in world units - no resize needed
    // This ensures fixed-in-frame mobjects stay at consistent world positions
  }

  // ── Rendering Override ────────────────────────────────────────────────────

  /**
   * Override render to do two-pass: main scene + HUD overlay.
   * Fixed-in-frame mobjects are rendered in the HUD pass with an orthographic camera.
   */
  protected override _renderFrame(): void {
    // First: reconcile all mobjects (creates render nodes)
    const allMobjects = this.logicalScene.getAllMobjects();
    this.renderer.reconcile(allMobjects);

    // Get the three.js renderer and scenes
    const threeRenderer = (this.renderer as any)['threeRenderer'] as THREE.WebGLRenderer;
    const mainCamera = (this.renderer as any)['camera'] as THREE.Camera;
    const mainScene = (this.renderer as any)['threeScene'] as THREE.Scene;

    // Move fixed mobject nodes from main scene to HUD scene
    for (const mob of this.fixedMobjects) {
      const node = (this.renderer as any).getRenderNode(mob.id);
      if (node && node.threeObject.parent === mainScene) {
        mainScene.remove(node.threeObject);
        this.hudScene.add(node.threeObject);
      }
      // Also handle family members
      for (const familyMob of mob.getFamily()) {
        if (familyMob === mob) continue;
        const familyNode = (this.renderer as any).getRenderNode(familyMob.id);
        if (familyNode && familyNode.threeObject.parent === mainScene) {
          mainScene.remove(familyNode.threeObject);
          this.hudScene.add(familyNode.threeObject);
        }
      }
    }

    // Sync dirty mobjects
    this.renderer.syncDirty(allMobjects);
    // Also sync fixed mobjects that might not be in the allMobjects list
    for (const mob of this.fixedMobjects) {
      if (mob.dirty) {
        const node = (this.renderer as any).getRenderNode(mob.id);
        if (node) {
          node.sync(mob);
          mob.dirty = false;
        }
      }
    }

    // Pass 1: main 3D scene (with clear)
    threeRenderer.autoClear = true;
    threeRenderer.render(mainScene, mainCamera);

    // Pass 2: HUD overlay (fixed-in-frame mobjects)
    if (this.fixedMobjects.size > 0) {
      // Render HUD scene on top (no clear)
      threeRenderer.autoClear = false;
      threeRenderer.render(this.hudScene, this.hudCamera);
      threeRenderer.autoClear = true;
    }
  }

  override clear(): this {
    // Clear fixed mobjects from HUD scene
    for (const mob of this.fixedMobjects) {
      const node = (this.renderer as any).getRenderNode(mob.id);
      if (node) {
        this.hudScene.remove(node.threeObject);
      }
    }
    this.fixedMobjects.clear();
    
    // Clear remaining HUD scene children
    while (this.hudScene.children.length > 0) {
      this.hudScene.remove(this.hudScene.children[0]);
    }

    super.clear();
    return this;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private _setupDefaultLighting(): void {
    this.setLighting({
      ambient: true,
      ambientIntensity: 0.4,
      directional: true,
      directionalIntensity: 1,
    });
  }

  /**
   * Setup orbit controls as UpdaterTrack in Scheduler.
   * This uses the single rAF loop from Scheduler (Golden Rule #4).
   */
  private _setupOrbitControls(): void {
    const canvas = this['canvas'];

    // Prevent context menu on right-click
    canvas.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    });

    // Mouse events for orbit (left) and pan (right)
    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 0) {
        // Left button - orbit
        this.isDragging = true;
        this.previousMouse = { x: e.clientX, y: e.clientY };
      } else if (e.button === 2) {
        // Right button - pan
        this.isPanning = true;
        this.previousMouse = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('mouseup', (e: MouseEvent) => {
      if (e.button === 0) {
        this.isDragging = false;
      } else if (e.button === 2) {
        this.isPanning = false;
      }
      if (!this.isDragging && !this.isPanning) {
        this.previousMouse = null;
      }
    });

    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.isPanning = false;
      this.previousMouse = null;
    });

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.previousMouse) return;

      const deltaX = e.clientX - this.previousMouse.x;
      const deltaY = e.clientY - this.previousMouse.y;

      if (this.isDragging) {
        // Orbit: rotate around target
        this.camera3D.orbit(deltaY * -0.01, deltaX * -0.01);
      } else if (this.isPanning) {
        // Pan: move camera and target
        const panSpeed = 0.01;
        this.camera3D.pan(deltaX * -panSpeed, deltaY * panSpeed);
      }

      // Render immediately (works even when paused)
      (this as any)._renderFrame();

      this.previousMouse = { x: e.clientX, y: e.clientY };
    });

    // Wheel for zoom
    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      this.camera3D.zoom(e.deltaY * 0.01);
    }, { passive: false });

    // Add an updater to ensure frame renders while interacting
    const orbitUpdater = new UpdaterTrack({ id: 'orbit-updater' } as Mobject, () => {
      if (this.isDragging || this.isPanning) {
        (this as any)._renderFrame();
      }
    });
    this.scheduler['addUpdater']?.(orbitUpdater);
  }

  private getRendererSize(): { width: number; height: number } {
    const rect = this['canvas'].getBoundingClientRect();
    return { width: rect.width || 800, height: rect.height || 450 };
  }
}
