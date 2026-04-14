import * as THREE from 'three';
import type { Vec3 } from '../core/types';

/**
 * Camera3D — Perspective camera for 3D scenes.
 * Manages position, target (lookAt), and spherical coordinates for orbit.
 */
export class Camera3D {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private spherical: { radius: number; phi: number; theta: number } = {
    radius: 10,
    phi: Math.PI / 3,
    theta: Math.PI / 4,
  };

  constructor(fov: number, aspect: number, near: number, far: number) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this._updateFromSpherical();
  }

  // ── Getters ─────────────────────────────────────────────────────────────

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getPosition(): Vec3 {
    const p = this.camera.position;
    return [p.x, p.y, p.z];
  }

  getTarget(): Vec3 {
    return [this.target.x, this.target.y, this.target.z];
  }

  getSpherical(): { radius: number; phi: number; theta: number } {
    return { ...this.spherical };
  }

  // ── Setters ─────────────────────────────────────────────────────────────

  setPosition(pos: Vec3): void {
    this.camera.position.set(...pos);
    this._updateSphericalFromPosition();
  }

  setTarget(target: Vec3): void {
    this.target.set(...target);
    this.camera.lookAt(this.target);
  }

  lookAt(target: Vec3): void {
    this.setTarget(target);
  }

  // ── Spherical Control ────────────────────────────────────────────────────

  setSpherical(radius: number, phi: number, theta: number): void {
    this.spherical = { radius, phi, theta };
    this._updateFromSpherical();
  }

  /**
   * Orbit by changing phi (vertical) and theta (horizontal) angles.
   * @param deltaPhi Change in phi angle (radians)
   * @param deltaTheta Change in theta angle (radians)
   */
  orbit(deltaPhi: number, deltaTheta: number): void {
    this.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.spherical.phi + deltaPhi));
    this.spherical.theta += deltaTheta;
    this._updateFromSpherical();
  }

  /**
   * Zoom by changing the radius (distance from target).
   * @param delta Change in radius (negative = zoom in)
   */
  zoom(delta: number): void {
    this.spherical.radius = Math.max(2, Math.min(100, this.spherical.radius + delta));
    this._updateFromSpherical();
  }

  /**
   * Pan the camera and target by offset in camera space.
   * @param deltaX Horizontal offset (right is positive)
   * @param deltaY Vertical offset (up is positive)
   */
  pan(deltaX: number, deltaY: number): void {
    // Get camera direction and orientation vectors
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(direction, up).normalize();
    const actualUp = new THREE.Vector3().crossVectors(right, direction).normalize();

    // Calculate pan offset
    const offset = new THREE.Vector3()
      .addScaledVector(right, -deltaX)
      .addScaledVector(actualUp, deltaY);

    // Move both target and camera position
    this.target.add(offset);
    this.camera.position.add(offset);
    this.camera.lookAt(this.target);
  }

  // ─️ Update Helpers ──────────────────────────────────────────────────────

  private _updateFromSpherical(): void {
    const { radius, phi, theta } = this.spherical;
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  private _updateSphericalFromPosition(): void {
    const pos = this.camera.position;
    this.spherical.radius = pos.distanceTo(this.target);
    this.spherical.phi = Math.acos(pos.y / this.spherical.radius);
    this.spherical.theta = Math.atan2(pos.z, pos.x);
  }

  // ── Resize ───────────────────────────────────────────────────────────────

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  // ── Animation Support ───────────────────────────────────────────────────

  lerpPosition(to: Vec3, alpha: number): void {
    const start = this.camera.position.clone();
    const end = new THREE.Vector3(...to);
    this.camera.position.lerpVectors(start, end, alpha);
    this._updateSphericalFromPosition();
  }

  lerpTarget(to: Vec3, alpha: number): void {
    const start = this.target.clone();
    const end = new THREE.Vector3(...to);
    this.target.lerpVectors(start, end, alpha);
    this.camera.lookAt(this.target);
  }
}
