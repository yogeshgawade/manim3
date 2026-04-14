import * as THREE from 'three';
import { RenderNode } from './RenderNode';
import type { ImageObject } from '../mobjects/image/ImageObject';

/**
 * ImageRenderNode — Renders ImageObject as a textured plane.
 *
 * Loads image from URL, applies filters (grayscale, invert, brightness, contrast),
 * and displays as a plane mesh in 3D space.
 */
export class ImageRenderNode implements RenderNode {
  readonly mobjectId: string;
  readonly threeObject: THREE.Object3D;
  private mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private geometry: THREE.PlaneGeometry;
  private textureLoader: THREE.TextureLoader;
  private texture: THREE.Texture | null = null;
  private originalImage: HTMLImageElement | null = null;

  // Track state for updates
  private currentSource: string = '';
  private currentFilters: string = '';

  constructor(mobject: ImageObject) {
    this.mobjectId = mobject.id;
    this.textureLoader = new THREE.TextureLoader();

    // Create material (texture will be set after loading)
    this.material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: mobject.opacity,
      side: mobject.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    });

    // Create geometry (dimensions will be updated after image loads)
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.threeObject = this.mesh;

    // Load texture
    this._loadTexture(mobject);

    // Sync initial transform
    this._syncTransform(mobject);
  }

  /**
   * Sync mobject state to Three.js objects
   */
  sync(mobject: ImageObject): void {
    // Check if source changed
    if (this.currentSource !== mobject.source) {
      this._loadTexture(mobject);
    }

    // Check if filters changed
    const filterKey = JSON.stringify(mobject.filters);
    if (this.currentFilters !== filterKey && this.texture && this.originalImage) {
      this.currentFilters = filterKey;
      this._applyFilters(mobject);
    }

    // Sync material properties
    this.material.opacity = mobject.opacity;
    this.material.transparent = mobject.opacity < 1;
    this.material.side = mobject.doubleSided ? THREE.DoubleSide : THREE.FrontSide;

    // Update geometry dimensions
    this._updateGeometry(mobject);

    // Sync transform
    this._syncTransform(mobject);
  }

  /**
   * Load texture from source URL
   */
  private _loadTexture(mobject: ImageObject): void {
    this.currentSource = mobject.source;
    this.currentFilters = JSON.stringify(mobject.filters);

    if (!mobject.source) {
      return;
    }

    this.textureLoader.load(
      mobject.source,
      (texture) => {
        // Store reference to original image for filter processing
        this.originalImage = texture.image as HTMLImageElement;

        // Get natural dimensions
        mobject.naturalWidth = this.originalImage?.width ?? 1;
        mobject.naturalHeight = this.originalImage?.height ?? 1;
        mobject.loaded = true;

        // Apply filters if needed
        const filters = mobject.filters;
        if (filters.grayscale || filters.invert || filters.brightness !== 1 || filters.contrast !== 1) {
          this._applyFilters(mobject);
        } else {
          this.texture = texture;
          this.material.map = this.texture;
        }

        // Update geometry with correct dimensions
        this._updateGeometry(mobject);
        this.material.needsUpdate = true;
      },
      undefined,
      (error) => {
        console.error('Failed to load image:', mobject.source, error);
        mobject.loaded = false;
      }
    );
  }

  /**
   * Apply image filters using canvas manipulation
   */
  private _applyFilters(mobject: ImageObject): void {
    if (!this.originalImage) return;

    const { grayscale, invert, brightness, contrast } = mobject.filters;

    // Create canvas for processing
    const canvas = document.createElement('canvas');
    canvas.width = this.originalImage.width;
    canvas.height = this.originalImage.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw original image
    ctx.drawImage(this.originalImage, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply filters to each pixel
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Brightness
      if (brightness !== undefined && brightness !== 1) {
        r *= brightness;
        g *= brightness;
        b *= brightness;
      }

      // Contrast
      if (contrast !== undefined && contrast !== 1) {
        r = ((r / 255 - 0.5) * contrast + 0.5) * 255;
        g = ((g / 255 - 0.5) * contrast + 0.5) * 255;
        b = ((b / 255 - 0.5) * contrast + 0.5) * 255;
      }

      // Grayscale
      if (grayscale) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = gray;
      }

      // Invert
      if (invert) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }

      // Clamp values
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    // Put modified data back
    ctx.putImageData(imageData, 0, 0);

    // Create new texture from canvas
    const newTexture = new THREE.CanvasTexture(canvas);
    newTexture.colorSpace = THREE.SRGBColorSpace;

    // Dispose old texture and use new one
    if (this.texture && this.texture !== newTexture) {
      this.texture.dispose();
    }
    this.texture = newTexture;
    this.material.map = this.texture;
  }

  /**
   * Update geometry based on display dimensions
   */
  private _updateGeometry(mobject: ImageObject): void {
    const dims = mobject.getDisplayDimensions();

    // Only recreate geometry if dimensions changed significantly
    const currentWidth = (this.geometry.parameters as any).width;
    const currentHeight = (this.geometry.parameters as any).height;

    if (Math.abs(currentWidth - dims.width) > 0.001 || Math.abs(currentHeight - dims.height) > 0.001) {
      this.geometry.dispose();
      this.geometry = new THREE.PlaneGeometry(dims.width, dims.height);
      this.mesh.geometry = this.geometry;
    }
  }

  /**
   * Sync transform (position, rotation, scale)
   */
  private _syncTransform(mobject: ImageObject): void {
    this.mesh.position.set(mobject.position[0], mobject.position[1], mobject.position[2]);
    this.mesh.rotation.set(mobject.rotation[0], mobject.rotation[1], mobject.rotation[2]);
    this.mesh.scale.set(mobject.scale[0], mobject.scale[1], mobject.scale[2]);
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
