import { Mobject } from '../../core/Mobject';
import type { Vec3 } from '../../core/types';

/**
 * Image filter options for visual effects
 */
export interface ImageFilterOptions {
  /** Apply grayscale filter. Default: false */
  grayscale?: boolean;
  /** Invert colors. Default: false */
  invert?: boolean;
  /** Brightness multiplier (1 = normal). Default: 1 */
  brightness?: number;
  /** Contrast multiplier (1 = normal). Default: 1 */
  contrast?: number;
}

/**
 * Options for creating an ImageObject
 */
export interface ImageObjectOptions {
  /** Image source: URL or base64 data URI */
  source: string;
  /** Width of the image in scene units. Default: auto-calculated from aspect ratio */
  width?: number;
  /** Height of the image in scene units. Default: auto-calculated from aspect ratio */
  height?: number;
  /** If both width and height specified, whether to scale to fit within bounds preserving aspect ratio. Default: true */
  scaleToFit?: boolean;
  /** Center position [x, y, z]. Default: [0, 0, 0] */
  center?: Vec3;
  /** Opacity from 0 to 1. Default: 1 */
  opacity?: number;
  /** Image filter options */
  filters?: ImageFilterOptions;
  /** Whether to render both sides. Default: false */
  doubleSided?: boolean;
}

/**
 * ImageObject - Display images as mobjects in 2D/3D space
 *
 * Creates an image plane that can be positioned, scaled, rotated, and animated.
 * Supports loading from URLs or base64 data, with optional filters.
 *
 * @example
 * ```typescript
 * // Load from URL
 * const image = new ImageObject({
 *   source: 'https://example.com/image.png',
 *   width: 4,
 * });
 *
 * // With filters
 * const filtered = new ImageObject({
 *   source: 'https://example.com/photo.jpg',
 *   width: 5,
 *   filters: { grayscale: true, brightness: 1.2 },
 * });
 * ```
 */
export class ImageObject extends Mobject {
  source: string;
  width: number | undefined;
  height: number | undefined;
  scaleToFit: boolean;
  filters: ImageFilterOptions;
  doubleSided: boolean;

  // Internal state (managed by render node)
  naturalWidth: number = 1;
  naturalHeight: number = 1;
  loaded: boolean = false;

  constructor(options: ImageObjectOptions) {
    super();

    this.source = options.source;
    this.width = options.width;
    this.height = options.height;
    this.scaleToFit = options.scaleToFit ?? true;
    this.position = [...(options.center ?? [0, 0, 0])] as Vec3;
    this.opacity = options.opacity ?? 1;
    this.filters = {
      grayscale: options.filters?.grayscale ?? false,
      invert: options.filters?.invert ?? false,
      brightness: options.filters?.brightness ?? 1,
      contrast: options.filters?.contrast ?? 1,
    };
    this.doubleSided = options.doubleSided ?? false;
  }

  /**
   * Set a new image source
   */
  setSource(source: string): this {
    this.source = source;
    this.loaded = false;
    this.markDirty();
    return this;
  }

  /**
   * Set the display width (height calculated from aspect ratio)
   */
  setWidth(width: number): this {
    this.width = width;
    this.height = undefined;
    this.markDirty();
    return this;
  }

  /**
   * Set the display height (width calculated from aspect ratio)
   */
  setHeight(height: number): this {
    this.height = height;
    this.width = undefined;
    this.markDirty();
    return this;
  }

  /**
   * Set both width and height
   */
  setSize(width: number, height: number, scaleToFit: boolean = true): this {
    this.width = width;
    this.height = height;
    this.scaleToFit = scaleToFit;
    this.markDirty();
    return this;
  }

  /**
   * Set filter options
   */
  setFilters(filters: Partial<ImageFilterOptions>): this {
    this.filters = { ...this.filters, ...filters };
    this.markDirty();
    return this;
  }

  /**
   * Set grayscale filter
   */
  setGrayscale(enabled: boolean): this {
    return this.setFilters({ grayscale: enabled });
  }

  /**
   * Set invert filter
   */
  setInvert(enabled: boolean): this {
    return this.setFilters({ invert: enabled });
  }

  /**
   * Set brightness
   */
  setBrightness(value: number): this {
    return this.setFilters({ brightness: value });
  }

  /**
   * Set contrast
   */
  setContrast(value: number): this {
    return this.setFilters({ contrast: value });
  }

  /**
   * Scale to fit within a bounding box
   */
  scaleToFitBox(maxWidth: number, maxHeight: number): this {
    this.width = maxWidth;
    this.height = maxHeight;
    this.scaleToFit = true;
    this.markDirty();
    return this;
  }

  /**
   * Get calculated display dimensions
   */
  getDisplayDimensions(): { width: number; height: number } {
    const aspectRatio = this.naturalWidth / this.naturalHeight;

    if (this.width !== undefined && this.height !== undefined) {
      if (this.scaleToFit) {
        const boxAspect = this.width / this.height;
        if (aspectRatio > boxAspect) {
          return { width: this.width, height: this.width / aspectRatio };
        } else {
          return { width: this.height * aspectRatio, height: this.height };
        }
      } else {
        return { width: this.width, height: this.height };
      }
    } else if (this.width !== undefined) {
      return { width: this.width, height: this.width / aspectRatio };
    } else if (this.height !== undefined) {
      return { width: this.height * aspectRatio, height: this.height };
    } else {
      // Default: use natural dimensions scaled to scene units
      const scale = 0.01;
      return {
        width: this.naturalWidth * scale,
        height: this.naturalHeight * scale,
      };
    }
  }

  /**
   * Get aspect ratio of the image
   */
  getAspectRatio(): number {
    return this.naturalWidth / this.naturalHeight;
  }

  /**
   * Copy method for the ImageObject
   */
  copy(): this {
    const copy = new ImageObject({
      source: this.source,
      width: this.width,
      height: this.height,
      scaleToFit: this.scaleToFit,
      center: [...this.position] as Vec3,
      opacity: this.opacity,
      filters: { ...this.filters },
      doubleSided: this.doubleSided,
    }) as ImageObject;

    copy.rotation = [...this.rotation] as Vec3;
    copy.scale = [...this.scale] as Vec3;
    copy.naturalWidth = this.naturalWidth;
    copy.naturalHeight = this.naturalHeight;
    copy.loaded = this.loaded;

    return copy as this;
  }
}
