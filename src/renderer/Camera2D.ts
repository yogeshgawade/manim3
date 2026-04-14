import * as THREE from 'three';
import type { Vec3 } from '../core/types';

/**
 * Options for configuring a Camera2D.
 */
export interface Camera2DOptions {
  /** Width of the visible frame in world units. Defaults to 14 (Manim standard). */
  frameWidth?: number;
  /** Height of the visible frame in world units. Defaults to 8 (Manim standard). */
  frameHeight?: number;
  /** Initial camera position [x, y, z]. Defaults to [0, 0, 10]. */
  position?: Vec3;
  /** Near clipping plane. Defaults to 0.1. */
  near?: number;
  /** Far clipping plane. Defaults to 1000. */
  far?: number;
}

/**
 * Camera2D — 2D orthographic camera with Manim-style frame dimensions.
 * Manages the viewport size (frame) and position independently.
 */
export class Camera2D {
  private _camera: THREE.OrthographicCamera;
  private _frameWidth: number;
  private _frameHeight: number;
  private _near: number;
  private _far: number;

  constructor(options: Camera2DOptions = {}) {
    const {
      frameWidth = 14,
      frameHeight = 8,
      position = [0, 0, 10],
      near = 0.1,
      far = 1000,
    } = options;

    this._frameWidth = frameWidth;
    this._frameHeight = frameHeight;
    this._near = near;
    this._far = far;

    const halfWidth = frameWidth / 2;
    const halfHeight = frameHeight / 2;

    this._camera = new THREE.OrthographicCamera(
      -halfWidth, // left
      halfWidth,  // right
      halfHeight, // top
      -halfHeight, // bottom
      near,
      far
    );

    this._camera.position.set(position[0], position[1], position[2]);
    this._camera.lookAt(position[0], position[1], 0);
  }

  // ── Getters ─────────────────────────────────────────────────────────────

  /** Get the frame width in world units. */
  get frameWidth(): number {
    return this._frameWidth;
  }

  /** Get the frame height in world units. */
  get frameHeight(): number {
    return this._frameHeight;
  }

  /** Get the camera position. */
  get position(): THREE.Vector3 {
    return this._camera.position.clone();
  }

  /** Get the underlying Three.js OrthographicCamera. */
  getCamera(): THREE.OrthographicCamera {
    return this._camera;
  }

  // ── Setters ─────────────────────────────────────────────────────────────

  /** Set the frame width in world units. */
  set frameWidth(width: number) {
    this._frameWidth = width;
    this._updateProjection();
  }

  /** Set the frame height in world units. */
  set frameHeight(height: number) {
    this._frameHeight = height;
    this._updateProjection();
  }

  // ── Methods ─────────────────────────────────────────────────────────────

  /**
   * Move the camera to a specific point.
   * @param point - Target position [x, y, z]
   */
  moveTo(point: Vec3): void {
    this._camera.position.set(point[0], point[1], point[2]);
    this._camera.lookAt(point[0], point[1], 0);
  }

  /**
   * Update the frame dimensions to match an aspect ratio.
   * Keeps frame height constant and adjusts width.
   * @param aspectRatio - Width / height ratio
   */
  setAspectRatio(aspectRatio: number): void {
    this._frameWidth = this._frameHeight * aspectRatio;
    this._updateProjection();
  }

  /**
   * Resize the camera frame.
   * @param width - New frame width in world units
   * @param height - New frame height in world units
   */
  resize(width: number, height: number): void {
    this._frameWidth = width;
    this._frameHeight = height;
    this._updateProjection();
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private _updateProjection(): void {
    const halfWidth = this._frameWidth / 2;
    const halfHeight = this._frameHeight / 2;

    this._camera.left = -halfWidth;
    this._camera.right = halfWidth;
    this._camera.top = halfHeight;
    this._camera.bottom = -halfHeight;

    this._camera.updateProjectionMatrix();
  }
}
