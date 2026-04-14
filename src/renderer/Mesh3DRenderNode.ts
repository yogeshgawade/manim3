import * as THREE from 'three';
import { RenderNode } from './RenderNode';
import type { Mobject } from '../core/Mobject';
import { Cube, Box3D } from '../mobjects/three/Cube';
import { Sphere } from '../mobjects/three/Sphere';
import { Cylinder, Cone } from '../mobjects/three/Cylinder';
import { Torus } from '../mobjects/three/Torus';
import { Tetrahedron, Octahedron, Icosahedron, Dodecahedron, Polyhedron } from '../mobjects/three/Polyhedra';
import { Prism } from '../mobjects/three/Polyhedra';
import { Dot3D } from '../mobjects/three/Dot3D';

/**
 * Mesh3DRenderNode — Renders simple 3D mesh primitives using THREE.js.
 *
 * Handles Cube, Box3D, Sphere, Cylinder, Cone, Torus, Polyhedra, Prism, and Dot3D.
 * Each mobject type maps to a corresponding Three.js geometry.
 */
export class Mesh3DRenderNode implements RenderNode {
  readonly mobjectId: string;
  readonly threeObject: THREE.Object3D;
  private mesh: THREE.Mesh;
  private material: THREE.MeshStandardMaterial;
  private geometryType: string;

  constructor(mobject: Mobject) {
    this.mobjectId = mobject.id;
    this.geometryType = this._getGeometryType(mobject);

    // Create material
    const color = (mobject as any).fillColor ?? (mobject as any).color ?? '#ffffff';
    const opacity = (mobject as any).fillOpacity ?? (mobject as any).opacity ?? 1;
    const wireframe = (mobject as any).wireframe ?? false;

    this.material = new THREE.MeshStandardMaterial({
      color,
      opacity,
      transparent: opacity < 1,
      wireframe,
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.1,
    });

    // Create geometry based on type
    const geometry = this._createGeometry(mobject);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.threeObject = this.mesh;

    // Sync initial transform
    this._syncTransform(mobject);
  }

  sync(mobject: Mobject): void {
    const color = (mobject as any).fillColor ?? (mobject as any).color ?? '#ffffff';
    const opacity = (mobject as any).fillOpacity ?? (mobject as any).opacity ?? 1;
    const wireframe = (mobject as any).wireframe ?? false;

    // Sync material
    this.material.color.set(color);
    this.material.opacity = opacity;
    this.material.transparent = opacity < 1;
    this.material.wireframe = wireframe;

    // Check if geometry needs rebuild
    const newGeometryType = this._getGeometryType(mobject);
    if (this.geometryType !== newGeometryType || this._geometryParamsChanged(mobject)) {
      this.geometryType = newGeometryType;
      this.mesh.geometry.dispose();
      this.mesh.geometry = this._createGeometry(mobject);
    }

    // Sync transform
    this._syncTransform(mobject);
  }

  setHoverHighlight(active: boolean): void {
    if (active) {
      this.material.emissive.setHex(0x333333);
    } else {
      this.material.emissive.setHex(0x000000);
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _getGeometryType(mobject: Mobject): string {
    if (mobject instanceof Box3D) return 'box3d';
    if (mobject instanceof Cube) return 'cube';
    if (mobject instanceof Sphere) return 'sphere';
    if (mobject instanceof Cone) return 'cone';
    if (mobject instanceof Cylinder) return 'cylinder';
    if (mobject instanceof Torus) return 'torus';
    if (mobject instanceof Tetrahedron) return 'tetrahedron';
    if (mobject instanceof Octahedron) return 'octahedron';
    if (mobject instanceof Icosahedron) return 'icosahedron';
    if (mobject instanceof Dodecahedron) return 'dodecahedron';
    if (mobject instanceof Prism) return 'prism';
    if (mobject instanceof Dot3D) return 'dot3d';
    return 'unknown';
  }

  private _createGeometry(mobject: Mobject): THREE.BufferGeometry {
    if (mobject instanceof Box3D) {
      return new THREE.BoxGeometry(mobject.width, mobject.height, mobject.depth);
    }
    if (mobject instanceof Cube) {
      return new THREE.BoxGeometry(mobject.sideLength, mobject.sideLength, mobject.sideLength);
    }
    if (mobject instanceof Sphere) {
      return new THREE.SphereGeometry(mobject.radius, mobject.resolution, mobject.resolution);
    }
    if (mobject instanceof Cone) {
      // Cone is a Cylinder with top radius = 0
      return new THREE.ConeGeometry(mobject.radiusBottom, mobject.height, mobject.radialSegments, 1, mobject.openEnded);
    }
    if (mobject instanceof Cylinder) {
      return new THREE.CylinderGeometry(
        mobject.radiusTop,
        mobject.radiusBottom,
        mobject.height,
        mobject.radialSegments,
        1,
        mobject.openEnded
      );
    }
    if (mobject instanceof Torus) {
      return new THREE.TorusGeometry(
        mobject.radius,
        mobject.tubeRadius,
        mobject.radialSegments,
        mobject.tubularSegments,
        mobject.arc
      );
    }
    if (mobject instanceof Tetrahedron) {
      return new THREE.TetrahedronGeometry(mobject.getRadius(), mobject.detail);
    }
    if (mobject instanceof Octahedron) {
      return new THREE.OctahedronGeometry(mobject.getRadius(), mobject.detail);
    }
    if (mobject instanceof Icosahedron) {
      return new THREE.IcosahedronGeometry(mobject.getRadius(), mobject.detail);
    }
    if (mobject instanceof Dodecahedron) {
      return new THREE.DodecahedronGeometry(mobject.getRadius(), mobject.detail);
    }
    if (mobject instanceof Prism) {
      // Prism uses CylinderGeometry with flat top/bottom and specified sides
      return new THREE.CylinderGeometry(mobject.radius, mobject.radius, mobject.height, mobject.sides, 1, false);
    }
    if (mobject instanceof Dot3D) {
      return new THREE.SphereGeometry(mobject.radius, mobject.resolution, mobject.resolution);
    }
    return new THREE.BoxGeometry(1, 1, 1);
  }

  private _geometryParamsChanged(mobject: Mobject): boolean {
    const current = this.mesh.userData.geometryParams;
    const next = this._extractGeometryParams(mobject);

    if (!current) {
      this.mesh.userData.geometryParams = next;
      return true;
    }

    // Compare all keys
    for (const key of Object.keys(next)) {
      if ((current as any)[key] !== (next as any)[key]) {
        this.mesh.userData.geometryParams = next;
        return true;
      }
    }

    return false;
  }

  private _extractGeometryParams(mobject: Mobject): Record<string, number> {
    if (mobject instanceof Box3D) {
      return { width: mobject.width, height: mobject.height, depth: mobject.depth };
    }
    if (mobject instanceof Cube) {
      return { sideLength: mobject.sideLength };
    }
    if (mobject instanceof Sphere) {
      return { radius: mobject.radius, resolution: mobject.resolution };
    }
    if (mobject instanceof Cone) {
      return { radiusBottom: mobject.radiusBottom, height: mobject.height, radialSegments: mobject.radialSegments };
    }
    if (mobject instanceof Cylinder) {
      return {
        radiusTop: mobject.radiusTop,
        radiusBottom: mobject.radiusBottom,
        height: mobject.height,
        radialSegments: mobject.radialSegments,
        openEnded: mobject.openEnded ? 1 : 0,
      };
    }
    if (mobject instanceof Torus) {
      return {
        radius: mobject.radius,
        tubeRadius: mobject.tubeRadius,
        radialSegments: mobject.radialSegments,
        tubularSegments: mobject.tubularSegments,
        arc: mobject.arc,
      };
    }
    if (mobject instanceof Polyhedron) {
      return { sideLength: mobject.sideLength, detail: mobject.detail };
    }
    if (mobject instanceof Prism) {
      return { radius: mobject.radius, height: mobject.height, sides: mobject.sides };
    }
    if (mobject instanceof Dot3D) {
      return { radius: mobject.radius, resolution: mobject.resolution };
    }
    return {};
  }

  private _syncTransform(mobject: Mobject): void {
    const pos = mobject.position;
    const rot = mobject.rotation;
    const scl = mobject.scale;
    this.mesh.position.set(pos[0], pos[1], pos[2]);
    this.mesh.rotation.set(rot[0], rot[1], rot[2]);
    this.mesh.scale.set(scl[0], scl[1], scl[2]);
  }
}
