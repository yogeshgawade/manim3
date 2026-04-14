/**
 * Camera2DFrame — a VMobject that represents the Camera2D viewport.
 *
 * In Python Manim, `self.camera.frame` is a VGroup whose position and
 * scale control what the viewer sees. ManimWeb mirrors that API:
 *
 *   scene.camera.frame.saveState();
 *   scene.camera.frame.generateTarget();
 *   scene.camera.frame.targetCopy!.scale(0.5);
 *   (scene.camera.frame.targetCopy as Camera2DFrame).moveTo(dot.getCenter());
 *   await scene.play(new MoveToTarget(scene.camera.frame));
 *   // later...
 *   await scene.play(new Restore(scene.camera.frame));
 *
 * Internally the frame stores the camera state in its Mobject transform
 * (position → camera center, scaleVector → zoom level) and syncs it back
 * to the underlying Camera2D whenever it changes.
 */

import { VMobject } from '../../core/VMobject';
import type { Mobject } from '../../core/Mobject';
import type { Vec3 } from '../../core/types';
import * as THREE from 'three';

/**
 * Duck-type interface for Camera2D, used to avoid circular imports.
 * Camera2DFrame only needs frame dimensions, position, and moveTo.
 */
interface Camera2DLike {
  frameWidth: number;
  frameHeight: number;
  position: THREE.Vector3;
  moveTo(point: Vec3): void;
}

export class Camera2DFrame extends VMobject {
  private _camera: Camera2DLike;
  private _baseFrameWidth: number;
  private _baseFrameHeight: number;
  private _isPrimary: boolean;

  /**
   * @param camera     The Camera2D this frame controls
   * @param isPrimary  If true, changes to this frame sync to the camera.
   *                   Copies created by copy() / generateTarget() are
   *                   non-primary so they don't affect the camera directly.
   */
  constructor(camera: Camera2DLike, isPrimary = true) {
    super();
    this._camera = camera;
    this._isPrimary = isPrimary;
    this._baseFrameWidth = camera.frameWidth;
    this._baseFrameHeight = camera.frameHeight;

    // Invisible — the frame never renders on screen
    this.opacity = 0;
    this.fillOpacity = 0;
    this.strokeWidth = 0;

    // Give it a small set of dummy Bezier points so that
    // VMobject operations (alignPoints, copy, Transform) work.
    this.setPoints3D([
      [0, 0, 0],
      [0.33, 0, 0],
      [0.66, 0, 0],
      [1, 0, 0],
      [1, 0.33, 0],
      [1, 0.66, 0],
      [1, 1, 0],
      [0.66, 1, 0],
      [0.33, 1, 0],
      [0, 1, 0],
      [0, 0.66, 0],
      [0, 0.33, 0],
      [0, 0, 0],
    ]);

    if (isPrimary) {
      // Initialize position from the current camera center
      const pos = camera.position;
      this.position = [pos.x, pos.y, 0];
    }
  }

  // ── Sync helpers ──────────────────────────────────────────────

  /** Push the current Mobject transform (position + scale) to Camera2D. */
  private _syncToCamera(): void {
    this._camera.frameWidth = this._baseFrameWidth * this.scale[0];
    this._camera.frameHeight = this._baseFrameHeight * this.scale[1];
    this._camera.moveTo([this.position[0], this.position[1], this._camera.position.z]);
  }

  /**
   * Override markDirty so every transform change propagates to the camera.
   * This is called by moveTo, scale, shift, and by Transform.interpolate().
   */
  override markDirty(): void {
    super.markDirty();
    if (this._isPrimary) {
      this._syncToCamera();
    }
  }

  // ── Mobject overrides ─────────────────────────────────────────

  override getCenter(): Vec3 {
    return [this.position[0], this.position[1], this.position[2]];
  }

  /**
   * Move the camera viewport so it is centered on `target`.
   * Accepts a [x,y,z] point or a Mobject.
   */
  override moveTo(target: Vec3 | Mobject): this {
    if (Array.isArray(target)) {
      this.position = [target[0], target[1], target[2] ?? 0];
      this.markDirty();
      return this;
    }
    // Mobject target — center on its getCenter()
    const pt = (target as Mobject).getCenter();
    this.position = [pt[0], pt[1], 0];
    this.markDirty();
    return this;
  }

  // ── Copy / clone ──────────────────────────────────────────────

  protected _createCopy(): Camera2DFrame {
    const copy = new Camera2DFrame(this._camera, false);
    copy._baseFrameWidth = this._baseFrameWidth;
    copy._baseFrameHeight = this._baseFrameHeight;
    copy.position = [...this.position] as Vec3;
    copy.scale = [...this.scale] as Vec3;
    copy.rotation = [...this.rotation] as Vec3;
    copy.opacity = this.opacity;
    copy.fillOpacity = this.fillOpacity;
    copy.strokeWidth = this.strokeWidth;
    if (this.points3D.length > 0) copy.setPoints3D(this.points3D.map(p => [...p]));
    return copy;
  }
}
