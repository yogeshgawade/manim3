import * as THREE from 'three';
import { RenderNode } from './RenderNode';
import { Arrow3D } from '../mobjects/three/Arrow3D';

/**
 * Arrow3DRenderNode — Renders Arrow3D using THREE.js cylinder + cone.
 */
export class Arrow3DRenderNode implements RenderNode {
  readonly mobjectId: string;
  readonly threeObject: THREE.Object3D;
  private group: THREE.Group;
  private shaftMesh?: THREE.Mesh;
  private tipMesh?: THREE.Mesh;
  private shaftMaterial: THREE.MeshStandardMaterial;
  private tipMaterial: THREE.MeshStandardMaterial;

  constructor(mobject: Arrow3D) {
    this.mobjectId = mobject.id;
    this.group = new THREE.Group();
    this.threeObject = this.group;

    // Create materials (use Standard for emissive support)
    this.shaftMaterial = new THREE.MeshStandardMaterial({
      color: mobject.fillColor,
      opacity: mobject.fillOpacity,
      transparent: mobject.fillOpacity < 1,
      roughness: 0.5,
      metalness: 0.1,
    });

    this.tipMaterial = new THREE.MeshStandardMaterial({
      color: mobject.fillColor,
      opacity: mobject.fillOpacity,
      transparent: mobject.fillOpacity < 1,
      roughness: 0.5,
      metalness: 0.1,
    });

    // Create geometry
    this._createGeometry(mobject);

    // Set initial transform
    this._syncTransform(mobject);
  }

  sync(mobject: Arrow3D): void {
    // Check if geometry needs rebuild
    if (this._geometryNeedsRebuild(mobject)) {
      this._disposeGeometry();
      this._createGeometry(mobject);
    }

    // Sync material properties
    this.shaftMaterial.color.set(mobject.fillColor);
    this.shaftMaterial.opacity = mobject.opacity;
    this.shaftMaterial.transparent = mobject.opacity < 1 || mobject.fillOpacity < 1;

    this.tipMaterial.color.set(mobject.fillColor);
    this.tipMaterial.opacity = mobject.opacity;
    this.tipMaterial.transparent = mobject.opacity < 1 || mobject.fillOpacity < 1;

    // Sync transform
    this._syncTransform(mobject);
  }

  setHoverHighlight(active: boolean): void {
    if (active) {
      this.shaftMaterial.emissive?.setHex(0x333333);
      this.tipMaterial.emissive?.setHex(0x333333);
    } else {
      this.shaftMaterial.emissive?.setHex(0x000000);
      this.tipMaterial.emissive?.setHex(0x000000);
    }
  }

  dispose(): void {
    this._disposeGeometry();
    this.shaftMaterial.dispose();
    this.tipMaterial.dispose();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _createGeometry(mobject: Arrow3D): void {
    const [x0, y0, z0] = mobject.start;
    const [x1, y1, z1] = mobject.end;

    const start = new THREE.Vector3(x0, y0, z0);
    const end = new THREE.Vector3(x1, y1, z1);
    const dir = new THREE.Vector3().subVectors(end, start);
    const totalLength = dir.length();

    if (totalLength === 0) return;

    dir.normalize();

    // Shaft length (total - tip)
    const shaftLength = Math.max(0, totalLength - mobject.tipLength);

    // Create shaft (cylinder) - created along Y axis
    if (shaftLength > 0.001) {
      const shaftGeometry = new THREE.CylinderGeometry(
        mobject.shaftRadius,
        mobject.shaftRadius,
        shaftLength,
        mobject.radialSegments,
        1
      );

      this.shaftMesh = new THREE.Mesh(shaftGeometry, this.shaftMaterial);

      // Position at midpoint of shaft
      const shaftCenter = new THREE.Vector3().lerpVectors(start, end, shaftLength / totalLength / 2);
      this.shaftMesh.position.copy(shaftCenter);

      // Orient to point from start toward end
      this.shaftMesh.lookAt(end);
      this.shaftMesh.rotateX(Math.PI / 2); // Cylinder is Y-up, need to align with Z-forward

      this.group.add(this.shaftMesh);
    }

    // Create tip (cone) - created pointing up Y, base at origin
    const tipGeometry = new THREE.ConeGeometry(
      mobject.tipRadius,
      mobject.tipLength,
      mobject.radialSegments,
      1
    );
    // Shift geometry so base is at local origin, tip points up
    tipGeometry.translate(0, mobject.tipLength / 2, 0);

    this.tipMesh = new THREE.Mesh(tipGeometry, this.tipMaterial);

    // Position cone base at the point where shaft ends
    const tipBase = new THREE.Vector3().lerpVectors(start, end, 1 - mobject.tipLength / totalLength);
    this.tipMesh.position.copy(tipBase);

    // Orient cone to point from start toward end (same direction as arrow)
    const targetPoint = new THREE.Vector3().addVectors(tipBase, dir);
    this.tipMesh.lookAt(targetPoint);
    this.tipMesh.rotateX(Math.PI / 2); // Cone is Y-up, need to align with Z-forward

    this.group.add(this.tipMesh);

    // Store current parameters
    this.group.userData.arrowParams = {
      start: [...mobject.start] as [number, number, number],
      end: [...mobject.end] as [number, number, number],
      tipLength: mobject.tipLength,
      tipRadius: mobject.tipRadius,
      shaftRadius: mobject.shaftRadius,
      radialSegments: mobject.radialSegments,
    };
  }

  private _disposeGeometry(): void {
    if (this.shaftMesh) {
      this.shaftMesh.geometry.dispose();
      this.group.remove(this.shaftMesh);
      this.shaftMesh = undefined;
    }
    if (this.tipMesh) {
      this.tipMesh.geometry.dispose();
      this.group.remove(this.tipMesh);
      this.tipMesh = undefined;
    }
  }

  private _geometryNeedsRebuild(mobject: Arrow3D): boolean {
    const current = this.group.userData.arrowParams;
    if (!current) return true;

    return (
      current.start[0] !== mobject.start[0] ||
      current.start[1] !== mobject.start[1] ||
      current.start[2] !== mobject.start[2] ||
      current.end[0] !== mobject.end[0] ||
      current.end[1] !== mobject.end[1] ||
      current.end[2] !== mobject.end[2] ||
      current.tipLength !== mobject.tipLength ||
      current.tipRadius !== mobject.tipRadius ||
      current.shaftRadius !== mobject.shaftRadius ||
      current.radialSegments !== mobject.radialSegments
    );
  }

  private _syncTransform(mobject: Arrow3D): void {
    const pos = mobject.position;
    const rot = mobject.rotation;
    const scl = mobject.scale;
    this.group.position.set(pos[0], pos[1], pos[2]);
    this.group.rotation.set(rot[0], rot[1], rot[2]);
    this.group.scale.set(scl[0], scl[1], scl[2]);
  }
}
