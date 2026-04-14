/**
 * ZoomedScene — Scene with zoom/magnification capability.
 * Displays a zoomed view of a region in a separate floating window.
 * Ported from manim-web ZoomedScene with adaptations for manim-web-v2 architecture.
 */

import * as THREE from 'three';
import { Scene, type SceneOptions } from './Scene';
import { Mobject } from '../core/Mobject';
import { Rectangle } from '../mobjects/geometry/Rectangle';
import type { Vec3 } from '../core/types';

// Direction constants (defined locally since they're not exported from constants)
const UP: Vec3 = [0, 1, 0];
const DOWN: Vec3 = [0, -1, 0];
const LEFT: Vec3 = [-1, 0, 0];
const RIGHT: Vec3 = [1, 0, 0];
const UL: Vec3 = [-1, 1, 0];
const UR: Vec3 = [1, 1, 0];
const DL: Vec3 = [-1, -1, 0];
const DR: Vec3 = [1, -1, 0];
const ORIGIN: Vec3 = [0, 0, 0];

/**
 * Options for configuring a ZoomedScene.
 */
export interface ZoomedSceneOptions extends SceneOptions {
  /** Width of the zoom camera frame in world units. Defaults to 3. */
  cameraFrameWidth?: number;
  /** Height of the zoom camera frame in world units. Defaults to 3. */
  cameraFrameHeight?: number;
  /** Default zoom factor (frame.width / display.width). Defaults to 0.3. */
  zoomFactor?: number;
  /** Width of the zoomed display in world units. Defaults to 3. */
  displayWidth?: number;
  /** Height of the zoomed display in world units. Defaults to 3. */
  displayHeight?: number;
  /** Color of the camera frame border. Defaults to '#FFFF00' (yellow). */
  cameraFrameColor?: string;
  /** Color of the display frame border. Defaults to '#FFFF00' (yellow). */
  displayFrameColor?: string;
  /** Stroke width of camera frame. Defaults to 3. */
  cameraFrameStrokeWidth?: number;
  /** Stroke width of display frame. Defaults to 3. */
  displayFrameStrokeWidth?: number;
  /** Size of render target in pixels. Defaults to 512. */
  renderTargetSize?: number;
  /** Corner direction for zoomed display [x, y, z]. Defaults to UP+RIGHT [1,1,0]. */
  displayCorner?: Vec3;
  /** Buffer from corner edges. Defaults to 0.5. */
  displayCornerBuff?: number;
}

/**
 * Helper: the zoomed camera with its visible frame rectangle.
 */
class ZoomedCamera {
  /** The visible frame rectangle showing the zoom region */
  readonly frame: Rectangle;

  constructor(width: number, height: number, color: string, strokeWidth: number) {
    this.frame = new Rectangle({
      width,
      height,
      color,
      strokeWidth,
      fillOpacity: 0,
    });
  }
}

/**
 * A Mobject that displays a texture from a WebGLRenderTarget.
 * Used internally by ZoomedScene for the zoomed display.
 */
class ZoomedDisplay extends Mobject {
  /** The visible border of the display window */
  readonly displayFrame: Rectangle;
  
  private _width: number;
  private _height: number;

  constructor(
    width: number,
    height: number,
    color: string,
    strokeWidth: number,
  ) {
    super();
    this._width = width;
    this._height = height;

    // Create the display frame (visible border)
    this.displayFrame = new Rectangle({
      width,
      height,
      color,
      strokeWidth,
      fillOpacity: 0,
    });
    
    // Add frame as child so it transforms with parent
    this.add(this.displayFrame);
  }

  getWidth(): number {
    return this._width * this.scale[0];
  }

  getHeight(): number {
    return this._height * this.scale[1];
  }

  /**
   * Create a copy. Note: the actual texture reference is not cloned,
   * as ZoomedDisplay holds a render-target-backed reference.
   */
  copy(): this {
    const clone = new ZoomedDisplay(
      this._width,
      this._height,
      this.displayFrame.color,
      this.displayFrame.strokeWidth,
    ) as this;
    clone.position = [...this.position] as Vec3;
    clone.rotation = [...this.rotation] as Vec3;
    clone.scale = [...this.scale] as Vec3;
    clone.opacity = this.opacity;
    return clone;
  }
}

/**
 * Scene with zoom/magnification capability.
 * Displays a zoomed view of a region in a separate window.
 */
export class ZoomedScene extends Scene {
  /** The zoomed camera with its frame */
  readonly zoomedCamera!: ZoomedCamera;

  /** The zoomed display (texture + border) */
  readonly zoomedDisplay!: ZoomedDisplay;

  /** Whether zooming is currently active */
  private _zoomActive: boolean = false;

  /** Render target for zoomed view */
  private _zoomRenderTarget: THREE.WebGLRenderTarget;

  /** Default display position (for reset in clear()) */
  private _displayDefaultPos: Vec3;

  /** Dedicated orthographic camera for zoom render pass */
  private _zoomCamera: THREE.OrthographicCamera;

  /** The plane mesh showing the zoomed texture */
  private _imageMesh: THREE.Mesh;

  /** Cached bounds objects to avoid per-frame allocations */
  private _frameBounds = new THREE.Box3();
  private _frameSize = new THREE.Vector3();

  constructor(container: HTMLElement, options: ZoomedSceneOptions = {}) {
    super(container, options);

    const displayWidth = options.displayWidth ?? 3;
    const displayHeight = options.displayHeight ?? 3;
    const zoomFactor = options.zoomFactor ?? 0.3;
    const cameraFrameWidth = options.cameraFrameWidth ?? displayWidth * zoomFactor;
    const cameraFrameHeight = options.cameraFrameHeight ?? displayHeight * zoomFactor;
    const cameraFrameColor = options.cameraFrameColor ?? '#FFFF00';
    const displayFrameColor = options.displayFrameColor ?? '#FFFF00';
    const cameraFrameStrokeWidth = options.cameraFrameStrokeWidth ?? 3;
    const displayFrameStrokeWidth = options.displayFrameStrokeWidth ?? 3;
    const renderTargetSize = options.renderTargetSize ?? 512;

    // Create render target
    this._zoomRenderTarget = new THREE.WebGLRenderTarget(renderTargetSize, renderTargetSize, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      generateMipmaps: false,
    });

    // Create dedicated camera for zoom render pass
    this._zoomCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000);
    this._zoomCamera.position.set(0, 0, 10);
    this._zoomCamera.lookAt(0, 0, 0);

    // Create zoomed camera frame
    this.zoomedCamera = new ZoomedCamera(
      cameraFrameWidth,
      cameraFrameHeight,
      cameraFrameColor,
      cameraFrameStrokeWidth,
    );

    // Create zoomed display with border
    this.zoomedDisplay = new ZoomedDisplay(
      displayWidth,
      displayHeight,
      displayFrameColor,
      displayFrameStrokeWidth,
    );

    // Create the actual texture mesh (separate from displayFrame for rendering)
    const geometry = new THREE.PlaneGeometry(displayWidth, displayHeight);
    const material = new THREE.MeshBasicMaterial({
      map: this._zoomRenderTarget.texture,
      side: THREE.FrontSide,
      depthTest: false,
      transparent: true,
    });
    this._imageMesh = new THREE.Mesh(geometry, material);
    this._imageMesh.position.z = -0.01; // Behind the frame

    // Position zoomed display at corner (default: upper-right, matching Python Manim)
    const corner = options.displayCorner ?? RIGHT;
    const cornerBuff = options.displayCornerBuff ?? 0.5;
    
    // Get frame dimensions from renderer camera
    const frameW = 8; // Default frustum * 2
    const frameH = 8;
    const dx = corner[0] !== 0 ? corner[0] * (frameW / 2 - cornerBuff - displayWidth / 2) : 0;
    const dy = corner[1] !== 0 ? corner[1] * (frameH / 2 - cornerBuff - displayHeight / 2) : 0;
    this._displayDefaultPos = [dx, dy, 0];
    this.zoomedDisplay.moveTo(this._displayDefaultPos);

    // Setup pre-render hook for dual-pass rendering
    this._setupPreRenderHook();
  }

  /**
   * Setup the pre-render hook that renders the zoom region to the render target
   * before the main scene render.
   */
  private _setupPreRenderHook(): void {
    this.renderer.preRenderHook = (threeRenderer, threeScene, mainCamera) => {
      if (!this._zoomActive) return;

      // Ensure image mesh is attached to display node
      this._syncImageMeshToDisplay();

      const frame = this.zoomedCamera.frame;
      const frameCenter = frame.getCenter();

      // Get frame bounds from the render node
      const frameNode = (this.renderer as any).renderNodeMap?.get(frame.id);
      if (!frameNode) return;

      const frameObj = frameNode.threeObject;
      this._frameBounds.setFromObject(frameObj);
      this._frameBounds.getSize(this._frameSize);

      // Get display node and temporarily hide it from the zoom render
      const displayNode = (this.renderer as any).renderNodeMap?.get(this.zoomedDisplay.id);
      const prevDisplayVisible = displayNode?.threeObject.visible ?? true;
      if (displayNode) displayNode.threeObject.visible = false;

      // Hide frame from zoom render
      const prevFrameVisible = frameObj.visible;
      frameObj.visible = false;

      // Update dedicated zoom camera to match frame region
      const hw = (this._frameSize.x > 0.001 ? this._frameSize.x : 1) / 2;
      const hh = (this._frameSize.y > 0.001 ? this._frameSize.y : 1) / 2;
      this._zoomCamera.left = -hw;
      this._zoomCamera.right = hw;
      this._zoomCamera.top = hh;
      this._zoomCamera.bottom = -hh;
      this._zoomCamera.updateProjectionMatrix();
      this._zoomCamera.position.set(frameCenter[0], frameCenter[1], 10);
      this._zoomCamera.lookAt(frameCenter[0], frameCenter[1], 0);

      // Render to zoom render target
      threeRenderer.setRenderTarget(this._zoomRenderTarget);
      threeRenderer.clear();
      threeRenderer.render(threeScene, this._zoomCamera);
      threeRenderer.setRenderTarget(null);

      // Restore viewport to full canvas size
      const viewportSize = new THREE.Vector2();
      threeRenderer.getSize(viewportSize);
      threeRenderer.setViewport(0, 0, viewportSize.x, viewportSize.y);

      // Restore visibility
      if (displayNode) displayNode.threeObject.visible = prevDisplayVisible;
      frameObj.visible = prevFrameVisible;
    };
  }

  /** Check if zooming is active */
  get isZoomActive(): boolean {
    return this._zoomActive;
  }

  /**
   * Activate zooming: adds camera frame and display to the scene.
   */
  activateZooming(): this {
    if (this._zoomActive) return this;
    this._zoomActive = true;

    this.add(this.zoomedCamera.frame);
    this.addForeground(this.zoomedDisplay);

    // Ensure render nodes exist and sync image mesh
    this._renderFrame();
    this._syncImageMeshToDisplay();

    return this;
  }

  /**
   * Deactivate zooming: removes camera frame and display from the scene.
   */
  deactivateZooming(): this {
    if (!this._zoomActive) return this;
    this._zoomActive = false;

    this.remove(this.zoomedCamera.frame);
    this.removeForeground(this.zoomedDisplay);
    return this;
  }

  /**
   * Sync the texture image mesh to the display's render node.
   * Called during pre-render hook when nodes are guaranteed to exist.
   */
  private _syncImageMeshToDisplay(): void {
    const displayNode = (this.renderer as any).renderNodeMap?.get(this.zoomedDisplay.id);
    if (displayNode && this._imageMesh) {
      // Only add if not already added
      if (!displayNode.threeObject.children.includes(this._imageMesh)) {
        displayNode.threeObject.add(this._imageMesh);
        this._imageMesh.renderOrder = 0;
        
        // Ensure frame renders on top
        displayNode.threeObject.traverse((child: THREE.Object3D) => {
          if (child !== this._imageMesh && child.type !== 'Scene') {
            child.renderOrder = 1;
          }
        });
      }
    }
  }

  /**
   * Get a pop-out animation configuration for the zoomed display.
   * Returns animation tracks that move the display from the camera frame
   * to its current position.
   * 
   * Usage:
   * ```typescript
   * await scene.play(
   *   moveTo(scene.zoomedDisplay, { 
   *     position: targetPos, 
   *     duration: 1,
   *     ease: smooth 
   *   })
   * );
   * ```
   * 
   * For reverse pop-out, use:
   * ```typescript
   * await scene.play(
   *   moveTo(scene.zoomedDisplay, { 
   *     position: framePos, 
   *     duration: 1,
   *     ease: (t) => smooth(1 - t) 
   *   })
   * );
   * ```
   */
  getDisplayTargetPosition(): Vec3 {
    return [...this.zoomedDisplay.position] as Vec3;
  }

  /**
   * Get the position of the camera frame center.
   * Useful for animating display to/from the frame.
   */
  getCameraFramePosition(): Vec3 {
    return this.zoomedCamera.frame.getCenter();
  }

  /**
   * Get the dimensions of the camera frame.
   */
  getCameraFrameDimensions(): { width: number; height: number } {
    // Get from the Rectangle's properties
    return {
      width: (this.zoomedCamera.frame as any)._width ?? 1,
      height: (this.zoomedCamera.frame as any)._height ?? 1,
    };
  }

  /**
   * Override clear to reset zoom state.
   */
  override clear(): this {
    this._zoomActive = false;
    
    // Reset frame and display transforms for clean re-play
    this.zoomedCamera.frame.moveTo([0, 0, 0]);
    this.zoomedCamera.frame.scale = [1, 1, 1];
    this.zoomedCamera.frame.opacity = 1;
    this.zoomedCamera.frame.markDirty();
    
    this.zoomedDisplay.moveTo(this._displayDefaultPos);
    this.zoomedDisplay.scale = [1, 1, 1];
    this.zoomedDisplay.opacity = 1;
    this.zoomedDisplay.displayFrame.opacity = 1;
    this.zoomedDisplay.markDirty();

    return super.clear();
  }

  /**
   * Handle window resize.
   */
  override resize(width: number, height: number): void {
    super.resize(width, height);
  }

  /**
   * Clean up all resources.
   */
  override dispose(): void {
    this.renderer.preRenderHook = null;
    if (this._zoomRenderTarget) {
      this._zoomRenderTarget.dispose();
    }
    super.dispose();
  }
}

// Re-export for convenience
export { UP, DOWN, LEFT, RIGHT, UL, UR, DL, DR, ORIGIN };
