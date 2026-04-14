/**
 * MovingCameraScene — 2D scene with animated camera support.
 *
 * Extends Scene with a Camera2D whose viewport (frame) is a full Mobject.
 * This enables animations like:
 *
 *   scene.camera.frame.saveState();
 *   scene.camera.frame.generateTarget();
 *   scene.camera.frame.targetCopy!.scale(0.5);
 *   scene.camera.frame.targetCopy!.moveTo(dot.getCenter());
 *   await scene.play(new MoveToTarget(scene.camera.frame));
 *
 *   // Later...
 *   await scene.play(new Restore(scene.camera.frame));
 */

import { Scene, type SceneOptions } from './Scene';
import { Camera2D, type Camera2DOptions } from '../renderer/Camera2D';
import { Camera2DFrame } from '../mobjects/camera/Camera2DFrame';
import type { Vec3 } from '../core/types';

export interface MovingCameraSceneOptions extends SceneOptions {
  /** Camera configuration options */
  camera?: Camera2DOptions;
}

export class MovingCameraScene extends Scene {
  private _camera2D: Camera2D;
  private _cameraFrame: Camera2DFrame;

  constructor(container: HTMLElement, options: MovingCameraSceneOptions = {}) {
    super(container, options);

    // Create Camera2D with options
    this._camera2D = new Camera2D(options.camera);

    // Create the frame mobject that controls the camera
    this._cameraFrame = new Camera2DFrame(this._camera2D, true);

    // Replace renderer's camera with our Camera2D
    (this as any).renderer.camera = this._camera2D.getCamera();
  }

  // ── Camera Access ───────────────────────────────────────────────────────

  /**
   * Access the Camera2D instance.
   * Use this for direct camera manipulation.
   */
  get camera(): Camera2D {
    return this._camera2D;
  }

  /**
   * Access the Camera2DFrame mobject.
   * Use this for animating the camera viewport.
   */
  get cameraFrame(): Camera2DFrame {
    return this._cameraFrame;
  }

  // ── Camera Helpers ──────────────────────────────────────────────────────

  /**
   * Move camera to a specific position (immediate, no animation).
   * @param position - Target position [x, y, z]
   */
  moveCameraTo(position: Vec3): this {
    this._camera2D.moveTo(position);
    this._cameraFrame.moveTo([position[0], position[1], 0]);
    return this;
  }

  /**
   * Set camera zoom level by adjusting frame size.
   * @param zoom - Zoom level (1 = normal, 2 = 2x zoom in, 0.5 = zoom out)
   */
  setCameraZoom(zoom: number): this {
    const baseWidth = 14;
    const baseHeight = 8;
    this._camera2D.frameWidth = baseWidth / zoom;
    this._camera2D.frameHeight = baseHeight / zoom;
    this._cameraFrame.scale = [1 / zoom, 1 / zoom, 1];
    return this;
  }

  // ── Resize Override ─────────────────────────────────────────────────────

  /**
   * Override resize to update camera aspect ratio.
   */
  override resize(width: number, height: number): void {
    super.resize(width, height);
    const aspect = width / height;
    this._camera2D.setAspectRatio(aspect);
  }

  // ── Frame Mobject Support ───────────────────────────────────────────────

  /**
   * Override add to ensure camera frame is managed properly.
   * The camera frame is not added to the scene like regular mobjects.
   */
  override add(...mobjects: any[]): this {
    // Filter out the camera frame if someone tries to add it
    const filtered = mobjects.filter(m => m !== this._cameraFrame);
    return super.add(...filtered);
  }
}
