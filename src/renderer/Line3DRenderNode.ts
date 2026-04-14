import * as THREE from 'three';
import { RenderNode } from './RenderNode';
import { Line3D } from '../mobjects/three/Line3D';

/**
 * Line3DRenderNode — Renders Line3D using THREE.js Line.
 */
export class Line3DRenderNode implements RenderNode {
  readonly mobjectId: string;
  readonly threeObject: THREE.Object3D;
  private line: THREE.Line;
  private geometry: THREE.BufferGeometry;
  private material: THREE.LineBasicMaterial;

  constructor(mobject: Line3D) {
    this.mobjectId = mobject.id;

    // Create geometry
    this.geometry = this._createGeometry(mobject);

    // Create material
    this.material = new THREE.LineBasicMaterial({
      color: mobject.strokeColor,
      opacity: mobject.strokeOpacity,
      transparent: mobject.strokeOpacity < 1,
      linewidth: mobject.lineWidth, // Note: WebGL line width may not work on all platforms
    });

    // Create line
    this.line = new THREE.Line(this.geometry, this.material);
    this.threeObject = this.line;

    // Set initial transform
    this._syncTransform(mobject);
  }

  sync(mobject: Line3D): void {
    // Check if geometry needs rebuild
    if (this._geometryNeedsRebuild(mobject)) {
      this.geometry.dispose();
      this.geometry = this._createGeometry(mobject);
      this.line.geometry = this.geometry;
    }

    // Sync material properties
    this.material.color.set(mobject.strokeColor);
    this.material.opacity = mobject.opacity;
    this.material.transparent = mobject.opacity < 1 || mobject.strokeOpacity < 1;
    this.material.linewidth = mobject.lineWidth;

    // Sync transform
    this._syncTransform(mobject);
  }

  setHoverHighlight(active: boolean): void {
    // Lines don't support hover highlight with basic material
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _createGeometry(mobject: Line3D): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    const [x0, y0, z0] = mobject.start;
    const [x1, y1, z1] = mobject.end;

    const vertices = new Float32Array([
      x0, y0, z0,
      x1, y1, z1,
    ]);

    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    // Store current parameters
    geometry.userData.lineParams = {
      start: [...mobject.start] as [number, number, number],
      end: [...mobject.end] as [number, number, number],
    };

    return geometry;
  }

  private _geometryNeedsRebuild(mobject: Line3D): boolean {
    const current = this.geometry.userData.lineParams;
    if (!current) return true;

    return (
      current.start[0] !== mobject.start[0] ||
      current.start[1] !== mobject.start[1] ||
      current.start[2] !== mobject.start[2] ||
      current.end[0] !== mobject.end[0] ||
      current.end[1] !== mobject.end[1] ||
      current.end[2] !== mobject.end[2]
    );
  }

  private _syncTransform(mobject: Line3D): void {
    const pos = mobject.position;
    const rot = mobject.rotation;
    const scl = mobject.scale;
    this.line.position.set(pos[0], pos[1], pos[2]);
    this.line.rotation.set(rot[0], rot[1], rot[2]);
    this.line.scale.set(scl[0], scl[1], scl[2]);
  }
}
