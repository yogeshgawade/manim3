import * as THREE from 'three';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry.js';
import { RenderNode } from './RenderNode';
import { TexturedSurface } from '../mobjects/three/TexturedSurface';

/**
 * TexturedSurfaceRenderNode — Renders TexturedSurface with texture mapping.
 *
 * Creates parametric geometry from the underlying surface's uvFunction
 * and applies one or two textures with optional day/night blending.
 */
export class TexturedSurfaceRenderNode implements RenderNode {
  readonly mobjectId: string;
  readonly threeObject: THREE.Object3D;
  private mesh: THREE.Mesh;
  private material: THREE.MeshStandardMaterial;
  private geometry?: ParametricGeometry;
  private textureLoader: THREE.TextureLoader;
  private primaryTexture: THREE.Texture | null = null;
  private darkTexture: THREE.Texture | null = null;

  constructor(mobject: TexturedSurface) {
    this.mobjectId = mobject.id;
    this.textureLoader = new THREE.TextureLoader();

    // Create material with texture
    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      opacity: mobject.opacity,
      transparent: mobject.opacity < 1 || mobject.fillOpacity < 1,
      side: mobject.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      roughness: 0.5,
      metalness: 0.1,
    });

    // Load textures
    this._loadTextures(mobject);

    // Create geometry
    this.geometry = this._createGeometry(mobject);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.threeObject = this.mesh;

    // Store surface params for change detection (now that mesh exists)
    const surface = mobject.surface;
    this.mesh.userData.surfaceParams = {
      uRange: [surface.uRange[0], surface.uRange[1]] as [number, number],
      vRange: [surface.vRange[0], surface.vRange[1]] as [number, number],
      uResolution: surface.uResolution,
      vResolution: surface.vResolution,
    };

    // Set initial transform
    this._syncTransform(mobject);
  }

  sync(mobject: TexturedSurface): void {
    // Check if geometry needs rebuild
    const surface = mobject.surface;
    if (this._geometryNeedsRebuild(surface)) {
      this.geometry?.dispose();
      this.mesh.geometry = this._createGeometry(mobject);
    }

    // Sync material properties
    this.material.opacity = mobject.opacity;
    this.material.transparent = mobject.opacity < 1 || mobject.fillOpacity < 1;
    this.material.side = mobject.doubleSided ? THREE.DoubleSide : THREE.FrontSide;

    // Update texture repeat/offset if changed
    const repeat = mobject.textureRepeat;
    const offset = mobject.textureOffset;

    if (this.primaryTexture) {
      this.primaryTexture.repeat.set(repeat[0], repeat[1]);
      this.primaryTexture.offset.set(offset[0], offset[1]);
    }
    if (this.darkTexture) {
      this.darkTexture.repeat.set(repeat[0], repeat[1]);
      this.darkTexture.offset.set(offset[0], offset[1]);
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
    this.geometry?.dispose();
    this.material.dispose();
    this.primaryTexture?.dispose();
    this.darkTexture?.dispose();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _loadTextures(mobject: TexturedSurface): void {
    // Load primary texture
    this.textureLoader.load(
      mobject.textureUrl,
      (texture) => {
        this.primaryTexture = texture;
        this.material.map = texture;
        this.material.needsUpdate = true;

        // Set texture repeat/offset
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(mobject.textureRepeat[0], mobject.textureRepeat[1]);
        texture.offset.set(mobject.textureOffset[0], mobject.textureOffset[1]);
      },
      undefined,
      (err) => {
        console.error('Failed to load primary texture:', err);
      }
    );

    // Load dark texture if provided
    if (mobject.darkTextureUrl) {
      this.textureLoader.load(
        mobject.darkTextureUrl,
        (texture) => {
          this.darkTexture = texture;
          // For now, we just replace the primary texture when both are loaded
          // Full day/night blending would require a custom shader
          // This is a simplified implementation
        },
        undefined,
        (err) => {
          console.error('Failed to load dark texture:', err);
        }
      );
    }
  }

  private _createGeometry(mobject: TexturedSurface): ParametricGeometry {
    const surface = mobject.surface;
    const [uMin, uMax] = surface.uRange;
    const [vMin, vMax] = surface.vRange;
    const uRange = uMax - uMin;
    const vRange = vMax - vMin;

    // Three.js ParametricGeometry expects u, v in [0, 1]
    const paramFunc = (u: number, v: number, target: THREE.Vector3) => {
      const uActual = uMin + u * uRange;
      const vActual = vMin + v * vRange;
      const [x, y, z] = surface.evaluate(uActual, vActual);
      target.set(x, y, z);
    };

    const geometry = new ParametricGeometry(
      paramFunc,
      surface.uResolution,
      surface.vResolution
    );
    geometry.computeVertexNormals();

    return geometry;
  }

  private _geometryNeedsRebuild(surface: import('../mobjects/three/Surface3D').Surface3D): boolean {
    const current = (this.mesh.userData as any)?.surfaceParams;
    const next = {
      uRange: [surface.uRange[0], surface.uRange[1]] as [number, number],
      vRange: [surface.vRange[0], surface.vRange[1]] as [number, number],
      uResolution: surface.uResolution,
      vResolution: surface.vResolution,
    };

    if (!current) {
      this.mesh.userData.surfaceParams = next;
      return true;
    }

    const needsRebuild =
      current.uResolution !== next.uResolution ||
      current.vResolution !== next.vResolution ||
      current.uRange[0] !== next.uRange[0] ||
      current.uRange[1] !== next.uRange[1] ||
      current.vRange[0] !== next.vRange[0] ||
      current.vRange[1] !== next.vRange[1];

    if (needsRebuild) {
      this.mesh.userData.surfaceParams = next;
    }

    return needsRebuild;
  }

  private _syncTransform(mobject: TexturedSurface): void {
    const pos = mobject.position;
    const rot = mobject.rotation;
    const scl = mobject.scale;
    this.mesh.position.set(pos[0], pos[1], pos[2]);
    this.mesh.rotation.set(rot[0], rot[1], rot[2]);
    this.mesh.scale.set(scl[0], scl[1], scl[2]);
  }
}
