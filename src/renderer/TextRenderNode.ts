import * as THREE from 'three';
import { RenderNode } from './RenderNode';
import type { Text } from '../mobjects/text/Text';

/**
 * TextRenderNode - Renders Text mobject as a textured plane.
 *
 * Creates a Three.js plane mesh with a texture from the Text's canvas.
 * Handles dynamic updates when text content or styling changes.
 */
export class TextRenderNode implements RenderNode {
  readonly mobjectId: string;
  readonly threeObject: THREE.Object3D;
  private mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private geometry: THREE.PlaneGeometry;
  private texture: THREE.CanvasTexture | null = null;

  // Track dimensions to detect changes
  private currentWidth: number = 0;
  private currentHeight: number = 0;

  constructor(mobject: Text) {
    this.mobjectId = mobject.id;

    // Create material (texture will be set after canvas render)
    this.material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: mobject.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Create initial geometry (will be updated to match text dimensions)
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.threeObject = this.mesh;

    // Initial sync
    this.sync(mobject);
  }

  /**
   * Sync mobject state to Three.js objects
   */
  sync(mobject: Text): void {
    // Check if canvas needs texture update
    if (mobject.isCanvasDirty() || !this.texture) {
      this._updateTexture(mobject);
    }

    // Update material properties
    this.material.opacity = mobject.opacity;
    this.material.transparent = mobject.opacity < 1;

    // Update geometry if dimensions changed
    const dims = mobject.getDimensions();
    if (Math.abs(this.currentWidth - dims.width) > 0.001 ||
        Math.abs(this.currentHeight - dims.height) > 0.001) {
      this._updateGeometry(dims.width, dims.height);
    }

    // Sync transform
    this._syncTransform(mobject);
  }

  /**
   * Update texture from mobject's canvas
   */
  private _updateTexture(mobject: Text): void {
    const canvas = mobject.getCanvas();
    if (!canvas) return;

    // Dispose old texture if exists
    if (this.texture) {
      this.texture.dispose();
    }

    // Create new texture from canvas
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    // Apply texture to material
    this.material.map = this.texture;
    this.material.needsUpdate = true;

    // Mark canvas as clean
    mobject.markCanvasClean();
  }

  /**
   * Update geometry to match text dimensions
   */
  private _updateGeometry(width: number, height: number): void {
    this.currentWidth = width;
    this.currentHeight = height;

    // Dispose old geometry
    this.geometry.dispose();

    // Create new geometry with correct dimensions
    this.geometry = new THREE.PlaneGeometry(width, height);
    this.mesh.geometry = this.geometry;
  }

  /**
   * Sync transform (position, rotation, scale)
   */
  private _syncTransform(mobject: Text): void {
    this.mesh.position.set(
      mobject.position[0],
      mobject.position[1],
      mobject.position[2]
    );
    this.mesh.rotation.set(
      mobject.rotation[0],
      mobject.rotation[1],
      mobject.rotation[2]
    );
    this.mesh.scale.set(
      mobject.scale[0],
      mobject.scale[1],
      mobject.scale[2]
    );
  }

  /**
   * Set hover highlight
   */
  setHoverHighlight(active: boolean): void {
    if (active) {
      this.material.color.setHex(0xdddddd);
    } else {
      this.material.color.setHex(0xffffff);
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.texture) {
      this.texture.dispose();
    }
  }
}
