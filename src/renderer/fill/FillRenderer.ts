import * as THREE from 'three';
import type { VMobject } from '../../core/VMobject';
import { buildEarcutFillGeometry } from '../../utils/earcutFillGeometry';

export class FillRenderer {
  private _mesh: THREE.Mesh | null = null;
  private _material: THREE.MeshBasicMaterial;
  readonly group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this._material = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite:  false,
      side:        THREE.DoubleSide,
    });
  }

  update(mob: VMobject): void {
    // Get subpaths for proper hole support
    const subpaths = mob.getSubpathPoints();

    // No fill — hide and bail
    if (mob.fillOpacity <= 0 || subpaths.length === 0) {
      this.group.visible = false;
      return;
    }

    // Check if any subpath has enough points
    const hasValidSubpath = subpaths.some(sp => sp.points.length >= 3);
    if (!hasValidSubpath) {
      this.group.visible = false;
      return;
    }

    const fillColor = mob.fillColor ?? mob.color;
    this._material.color.set(fillColor);
    this._material.opacity = mob.opacity * mob.fillOpacity;
    this._material.transparent = this._material.opacity < 1;
    this._material.depthWrite  = this._material.opacity >= 1;
    this._material.needsUpdate = true;

    const geo = buildEarcutFillGeometry(subpaths);
    if (!geo) {
      this.group.visible = false;
      return;
    }

    if (this._mesh) {
      this._mesh.geometry.dispose();
      this._mesh.geometry = geo;
    } else {
      this._mesh = new THREE.Mesh(geo, this._material);
      this._mesh.position.z  = -0.001; // sits behind stroke
      this._mesh.frustumCulled = false;
      this.group.add(this._mesh);
    }

    this.group.visible = mob.visible;
  }

  dispose(): void {
    this._mesh?.geometry.dispose();
    this._material.dispose();
    this.group.clear();
    this._mesh = null;
  }
}
