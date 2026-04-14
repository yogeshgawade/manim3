import * as THREE from 'three';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js';
import { RenderNode } from './RenderNode';
import { Surface3D } from '../../mobjects/three/Surface3D';

// Shared clipping planes for sweep animations
const clipPlaneX = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0); // clips x > clipX
const clipPlaneY = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0); // clips y > clipY
const clipPlaneZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0); // clips z > clipZ

/**
 * Surface3DRenderNode — Renders Surface3D mobjects using Three.js.
 * Creates parametric geometry from the mobject's uvFunction.
 */
export class Surface3DRenderNode implements RenderNode {
  readonly mobjectId: string;
  readonly threeObject: THREE.Object3D;
  private mesh: THREE.Mesh;
  private material: THREE.MeshStandardMaterial;
  private geometry?: ParametricGeometry;

  constructor(mobject: Surface3D) {
    this.mobjectId = mobject.id;
    this.material = new THREE.MeshStandardMaterial({
      color: mobject.fillColor,
      opacity: mobject.opacity, // Use opacity for FadeTrack compatibility
      transparent: mobject.opacity < 1 || mobject.fillOpacity < 1,
      wireframe: mobject.wireframe,
      side: mobject.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    });

    this.mesh = new THREE.Mesh(this._createGeometry(mobject), this.material);
    this.threeObject = this.mesh;

    // Set initial transform
    this._syncTransform(mobject);
  }

  sync(mobject: Surface3D): void {
    // Check if geometry needs rebuild
    if (this._geometryNeedsRebuild(mobject)) {
      this.geometry?.dispose();
      this.mesh.geometry = this._createGeometry(mobject);
    }

    // Sync material properties
    this.material.color.set(mobject.fillColor);
    this.material.opacity = mobject.opacity; // Use opacity (animated by FadeTrack)
    this.material.transparent = mobject.opacity < 1 || mobject.fillOpacity < 1;
    this.material.wireframe = mobject.wireframe;
    this.material.side = mobject.doubleSided ? THREE.DoubleSide : THREE.FrontSide;

    // Sync clipping planes for sweep animations
    const planes: THREE.Plane[] = [];
    
    if (mobject.clipX !== undefined) {
      clipPlaneX.constant = mobject.clipX;
      planes.push(clipPlaneX);
    }
    if (mobject.clipY !== undefined) {
      clipPlaneY.constant = mobject.clipY;
      planes.push(clipPlaneY);
    }
    if (mobject.clipZ !== undefined) {
      clipPlaneZ.constant = mobject.clipZ;
      planes.push(clipPlaneZ);
    }
    
    this.material.clippingPlanes = planes.length > 0 ? planes : null;

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
    this.geometry?.dispose();
    this.material.dispose();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _createGeometry(mobject: Surface3D): ParametricGeometry {
    const [uMin, uMax] = mobject.uRange;
    const [vMin, vMax] = mobject.vRange;
    const uRange = uMax - uMin;
    const vRange = vMax - vMin;

    // Three.js ParametricGeometry expects u, v in [0, 1]
    const paramFunc = (u: number, v: number, target: THREE.Vector3) => {
      const uActual = uMin + u * uRange;
      const vActual = vMin + v * vRange;
      const [x, y, z] = mobject.evaluate(uActual, vActual);
      target.set(x, y, z);
    };

    const geometry = new ParametricGeometry(
      paramFunc,
      mobject.uResolution,
      mobject.vResolution
    );
    geometry.computeVertexNormals();

    // Handle checkerboard colors
    if (mobject.checkerboardColors) {
      const nonIndexed = geometry.toNonIndexed();
      geometry.dispose();

      const posAttr = nonIndexed.getAttribute('position');
      const colors = new Float32Array(posAttr.count * 3);
      const c1 = new THREE.Color(mobject.checkerboardColors[0]);
      const c2 = new THREE.Color(mobject.checkerboardColors[1]);

      // Each quad = 2 triangles = 6 vertices
      let vertexIdx = 0;
      for (let vi = 0; vi < mobject.vResolution; vi++) {
        for (let ui = 0; ui < mobject.uResolution; ui++) {
          const c = (ui + vi) % 2 === 0 ? c1 : c2;
          for (let k = 0; k < 6; k++) {
            colors[vertexIdx * 3] = c.r;
            colors[vertexIdx * 3 + 1] = c.g;
            colors[vertexIdx * 3 + 2] = c.b;
            vertexIdx++;
          }
        }
      }

      nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      this.material.vertexColors = true;

      return nonIndexed as ParametricGeometry;
    }

    this.material.vertexColors = false;
    return geometry;
  }

  private _geometryNeedsRebuild(mobject: Surface3D): boolean {
    // Check if stored geometry parameters changed
    const current = (this.mesh.userData as any)?.surfaceParams;
    const next = {
      uRange: [mobject.uRange[0], mobject.uRange[1]] as [number, number],
      vRange: [mobject.vRange[0], mobject.vRange[1]] as [number, number],
      uResolution: mobject.uResolution,
      vResolution: mobject.vResolution,
      checkerboard: mobject.checkerboardColors ? [mobject.checkerboardColors[0], mobject.checkerboardColors[1]] as [string, string] : undefined,
    };

    if (!current) {
      this.mesh.userData.surfaceParams = next;
      return true;
    }

    const needsRebuild =
      current.uResolution !== next.uResolution ||
      current.vResolution !== next.vResolution ||
      current.checkerboard !== next.checkerboard ||
      current.uRange[0] !== next.uRange[0] ||
      current.uRange[1] !== next.uRange[1] ||
      current.vRange[0] !== next.vRange[0] ||
      current.vRange[1] !== next.vRange[1];

    if (needsRebuild) {
      this.mesh.userData.surfaceParams = next;
    }

    return needsRebuild;
  }

  private _syncTransform(mobject: Surface3D): void {
    const pos = mobject.position;
    const rot = mobject.rotation;
    const scl = mobject.scale;
    this.mesh.position.set(pos[0], pos[1], pos[2]);
    this.mesh.rotation.set(rot[0], rot[1], rot[2]);
    this.mesh.scale.set(scl[0], scl[1], scl[2]);
  }
}
