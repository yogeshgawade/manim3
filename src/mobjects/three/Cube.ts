import { Mobject } from '../../core/Mobject';
import type { Vec3, MobjectState } from '../../core/types';

/**
 * Options for creating a Cube
 */
export interface CubeOptions {
  /** Side length of the cube. Default: 1 */
  sideLength?: number;
  /** Center position [x, y, z]. Default: [0, 0, 0] */
  center?: Vec3;
  /** Color as CSS color string. Default: '#ffffff' */
  color?: string;
  /** Opacity from 0 to 1. Default: 1 */
  opacity?: number;
  /** Whether to render as wireframe. Default: false */
  wireframe?: boolean;
}

/**
 * Cube - A 3D cube mesh with equal side lengths
 *
 * Creates a cube with configurable size and material properties.
 *
 * @example
 * ```typescript
 * // Create a unit cube
 * const cube = new Cube();
 *
 * // Create a red cube with side length 2
 * const redCube = new Cube({ sideLength: 2, color: '#ff0000' });
 *
 * // Create a semi-transparent wireframe cube
 * const wireframe = new Cube({
 *   sideLength: 1.5,
 *   wireframe: true,
 *   opacity: 0.7
 * });
 * ```
 */
export class Cube extends Mobject {
  sideLength: number;
  wireframe: boolean;
  fillColor: string;
  fillOpacity: number;

  constructor(options: CubeOptions = {}) {
    super();

    this.sideLength = options.sideLength ?? 1;
    this.wireframe = options.wireframe ?? false;
    this.fillColor = options.color ?? '#ffffff';
    this.color = this.fillColor;
    this.fillOpacity = options.opacity ?? 1;
    this.opacity = options.opacity ?? 1;

    const center = options.center ?? [0, 0, 0];
    this.position = [...center];

    this.markDirty();
  }

  /**
   * Get the side length
   */
  getSideLength(): number {
    return this.sideLength;
  }

  /**
   * Set the side length
   */
  setSideLength(value: number): this {
    this.sideLength = value;
    this.markDirty();
    return this;
  }

  /**
   * Get whether wireframe mode is enabled
   */
  isWireframe(): boolean {
    return this.wireframe;
  }

  /**
   * Set wireframe mode
   */
  setWireframe(value: boolean): this {
    this.wireframe = value;
    this.markDirty();
    return this;
  }

  /**
   * Get the surface area of the cube
   */
  getSurfaceArea(): number {
    return 6 * this.sideLength * this.sideLength;
  }

  /**
   * Get the volume of the cube
   */
  getVolume(): number {
    return Math.pow(this.sideLength, 3);
  }

  // ── State Management ─────────────────────────────────────────────────────

  override captureState(): MobjectState {
    const base = super.captureState();
    return {
      ...base,
      extra: {
        ...base.extra,
        sideLength: this.sideLength,
        wireframe: this.wireframe,
        fillColor: this.fillColor,
        fillOpacity: this.fillOpacity,
      },
    };
  }

  override restoreState(state: MobjectState): this {
    super.restoreState(state);
    const extra = state.extra as any;
    if (extra) {
      this.sideLength = extra.sideLength;
      this.wireframe = extra.wireframe;
      this.fillColor = extra.fillColor;
      this.fillOpacity = extra.fillOpacity;
    }
    this.markDirty();
    return this;
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new Cube({
      sideLength: this.sideLength,
      center: [...this.position],
      color: this.fillColor,
      opacity: this.fillOpacity,
      wireframe: this.wireframe,
    });
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}

/**
 * Options for creating a Box3D
 */
export interface Box3DOptions {
  /** Width (x dimension). Default: 1 */
  width?: number;
  /** Height (y dimension). Default: 1 */
  height?: number;
  /** Depth (z dimension). Default: 1 */
  depth?: number;
  /** Center position [x, y, z]. Default: [0, 0, 0] */
  center?: Vec3;
  /** Color as CSS color string. Default: '#ffffff' */
  color?: string;
  /** Opacity from 0 to 1. Default: 1 */
  opacity?: number;
  /** Whether to render as wireframe. Default: false */
  wireframe?: boolean;
}

/**
 * Box3D - A 3D box mesh with non-uniform dimensions
 *
 * Creates a box with configurable width, height, depth, and material properties.
 *
 * @example
 * ```typescript
 * // Create a rectangular box
 * const box = new Box3D({ width: 2, height: 1, depth: 3 });
 *
 * // Create a colored box
 * const coloredBox = new Box3D({
 *   width: 1,
 *   height: 2,
 *   depth: 0.5,
 *   color: '#00ff00'
 * });
 * ```
 */
export class Box3D extends Mobject {
  width: number;
  height: number;
  depth: number;
  wireframe: boolean;
  fillColor: string;
  fillOpacity: number;

  constructor(options: Box3DOptions = {}) {
    super();

    this.width = options.width ?? 1;
    this.height = options.height ?? 1;
    this.depth = options.depth ?? 1;
    this.wireframe = options.wireframe ?? false;
    this.fillColor = options.color ?? '#ffffff';
    this.color = this.fillColor;
    this.fillOpacity = options.opacity ?? 1;
    this.opacity = options.opacity ?? 1;

    const center = options.center ?? [0, 0, 0];
    this.position = [...center];

    this.markDirty();
  }

  /**
   * Get the width
   */
  getWidth(): number {
    return this.width;
  }

  /**
   * Set the width
   */
  setWidth(value: number): this {
    this.width = value;
    this.markDirty();
    return this;
  }

  /**
   * Get the height
   */
  getHeight(): number {
    return this.height;
  }

  /**
   * Set the height
   */
  setHeight(value: number): this {
    this.height = value;
    this.markDirty();
    return this;
  }

  /**
   * Get the depth
   */
  getDepth(): number {
    return this.depth;
  }

  /**
   * Set the depth
   */
  setDepth(value: number): this {
    this.depth = value;
    this.markDirty();
    return this;
  }

  /**
   * Get whether wireframe mode is enabled
   */
  isWireframe(): boolean {
    return this.wireframe;
  }

  /**
   * Set wireframe mode
   */
  setWireframe(value: boolean): this {
    this.wireframe = value;
    this.markDirty();
    return this;
  }

  /**
   * Get the surface area of the box
   */
  getSurfaceArea(): number {
    return 2 * (this.width * this.height + this.height * this.depth + this.depth * this.width);
  }

  /**
   * Get the volume of the box
   */
  getVolume(): number {
    return this.width * this.height * this.depth;
  }

  // ── State Management ─────────────────────────────────────────────────────

  override captureState(): MobjectState {
    const base = super.captureState();
    return {
      ...base,
      extra: {
        ...base.extra,
        width: this.width,
        height: this.height,
        depth: this.depth,
        wireframe: this.wireframe,
        fillColor: this.fillColor,
        fillOpacity: this.fillOpacity,
      },
    };
  }

  override restoreState(state: MobjectState): this {
    super.restoreState(state);
    const extra = state.extra as any;
    if (extra) {
      this.width = extra.width;
      this.height = extra.height;
      this.depth = extra.depth;
      this.wireframe = extra.wireframe;
      this.fillColor = extra.fillColor;
      this.fillOpacity = extra.fillOpacity;
    }
    this.markDirty();
    return this;
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new Box3D({
      width: this.width,
      height: this.height,
      depth: this.depth,
      center: [...this.position],
      color: this.fillColor,
      opacity: this.fillOpacity,
      wireframe: this.wireframe,
    });
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}
