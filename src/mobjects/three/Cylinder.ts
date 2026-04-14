import { Mobject } from '../../core/Mobject';
import type { Vec3, MobjectState } from '../../core/types';

/**
 * Options for creating a Cylinder
 */
export interface CylinderOptions {
  /** Radius of the cylinder. Default: 1 */
  radius?: number;
  /** Height of the cylinder. Default: 2 */
  height?: number;
  /** Radius at the top (overrides radius if set). Default: same as radius */
  radiusTop?: number;
  /** Radius at the bottom (overrides radius if set). Default: same as radius */
  radiusBottom?: number;
  /** Center position [x, y, z]. Default: [0, 0, 0] */
  center?: Vec3;
  /** Color as CSS color string. Default: '#ffffff' */
  color?: string;
  /** Opacity from 0 to 1. Default: 1 */
  opacity?: number;
  /** Number of radial segments. Default: 32 */
  radialSegments?: number;
  /** Whether ends are open. Default: false */
  openEnded?: boolean;
  /** Whether to render as wireframe. Default: false */
  wireframe?: boolean;
}

/**
 * Cylinder - A 3D cylindrical mesh
 *
 * Creates a cylinder with configurable radius, height, and material properties.
 * Supports different top and bottom radii for creating truncated cones.
 *
 * @example
 * ```typescript
 * // Create a default cylinder
 * const cylinder = new Cylinder();
 *
 * // Create a red cylinder
 * const redCylinder = new Cylinder({
 *   radius: 0.5,
 *   height: 3,
 *   color: '#ff0000'
 * });
 *
 * // Create a truncated cone
 * const cone = new Cylinder({
 *   radiusTop: 0.5,
 *   radiusBottom: 1,
 *   height: 2
 * });
 * ```
 */
export class Cylinder extends Mobject {
  radiusTop: number;
  radiusBottom: number;
  height: number;
  radialSegments: number;
  openEnded: boolean;
  wireframe: boolean;
  fillColor: string;
  fillOpacity: number;

  constructor(options: CylinderOptions = {}) {
    super();

    const radius = options.radius ?? 1;
    this.radiusTop = options.radiusTop ?? radius;
    this.radiusBottom = options.radiusBottom ?? radius;
    this.height = options.height ?? 2;
    this.radialSegments = options.radialSegments ?? 32;
    this.openEnded = options.openEnded ?? false;
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
   * Get the radius at the top
   */
  getRadiusTop(): number {
    return this.radiusTop;
  }

  /**
   * Set the radius at the top
   */
  setRadiusTop(value: number): this {
    this.radiusTop = value;
    this.markDirty();
    return this;
  }

  /**
   * Get the radius at the bottom
   */
  getRadiusBottom(): number {
    return this.radiusBottom;
  }

  /**
   * Set the radius at the bottom
   */
  setRadiusBottom(value: number): this {
    this.radiusBottom = value;
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
   * Get whether ends are open
   */
  isOpenEnded(): boolean {
    return this.openEnded;
  }

  /**
   * Set whether ends are open
   */
  setOpenEnded(value: boolean): this {
    this.openEnded = value;
    this.markDirty();
    return this;
  }

  /**
   * Get the lateral surface area of the cylinder
   */
  getLateralSurfaceArea(): number {
    const slantHeight = Math.sqrt(
      this.height * this.height + Math.pow(this.radiusBottom - this.radiusTop, 2),
    );
    return Math.PI * (this.radiusTop + this.radiusBottom) * slantHeight;
  }

  /**
   * Get the total surface area of the cylinder (including caps)
   */
  getSurfaceArea(): number {
    const lateral = this.getLateralSurfaceArea();
    if (this.openEnded) {
      return lateral;
    }
    const topArea = Math.PI * this.radiusTop * this.radiusTop;
    const bottomArea = Math.PI * this.radiusBottom * this.radiusBottom;
    return lateral + topArea + bottomArea;
  }

  /**
   * Get the volume of the cylinder
   */
  getVolume(): number {
    return (
      ((Math.PI * this.height) / 3) *
      (this.radiusTop * this.radiusTop +
        this.radiusTop * this.radiusBottom +
        this.radiusBottom * this.radiusBottom)
    );
  }

  // ── State Management ─────────────────────────────────────────────────────

  override captureState(): MobjectState {
    const base = super.captureState();
    return {
      ...base,
      extra: {
        ...base.extra,
        radiusTop: this.radiusTop,
        radiusBottom: this.radiusBottom,
        height: this.height,
        radialSegments: this.radialSegments,
        openEnded: this.openEnded,
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
      this.radiusTop = extra.radiusTop;
      this.radiusBottom = extra.radiusBottom;
      this.height = extra.height;
      this.radialSegments = extra.radialSegments;
      this.openEnded = extra.openEnded;
      this.wireframe = extra.wireframe;
      this.fillColor = extra.fillColor;
      this.fillOpacity = extra.fillOpacity;
    }
    this.markDirty();
    return this;
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new Cylinder({
      radiusTop: this.radiusTop,
      radiusBottom: this.radiusBottom,
      height: this.height,
      center: [...this.position],
      color: this.fillColor,
      opacity: this.fillOpacity,
      radialSegments: this.radialSegments,
      openEnded: this.openEnded,
      wireframe: this.wireframe,
    });
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}

/**
 * Options for creating a Cone
 */
export interface ConeOptions {
  /** Radius of the cone base. Default: 1 */
  radius?: number;
  /** Height of the cone. Default: 2 */
  height?: number;
  /** Center position [x, y, z]. Default: [0, 0, 0] */
  center?: Vec3;
  /** Color as CSS color string. Default: '#ffffff' */
  color?: string;
  /** Opacity from 0 to 1. Default: 1 */
  opacity?: number;
  /** Number of radial segments. Default: 32 */
  radialSegments?: number;
  /** Whether base is open. Default: false */
  openEnded?: boolean;
  /** Whether to render as wireframe. Default: false */
  wireframe?: boolean;
}

/**
 * Cone - A 3D cone mesh (cylinder with top radius = 0)
 *
 * Creates a cone using Cylinder with the top radius set to 0.
 *
 * @example
 * ```typescript
 * // Create a default cone
 * const cone = new Cone();
 *
 * // Create a tall red cone
 * const tallCone = new Cone({
 *   radius: 0.5,
 *   height: 4,
 *   color: '#ff0000'
 * });
 * ```
 */
export class Cone extends Cylinder {
  constructor(options: ConeOptions = {}) {
    super({
      radiusTop: 0,
      radiusBottom: options.radius ?? 1,
      height: options.height ?? 2,
      center: options.center,
      color: options.color,
      opacity: options.opacity,
      radialSegments: options.radialSegments,
      openEnded: options.openEnded,
      wireframe: options.wireframe,
    });
  }

  /**
   * Get the base radius
   */
  getRadius(): number {
    return this.radiusBottom;
  }

  /**
   * Set the base radius
   */
  setRadius(value: number): this {
    this.radiusBottom = value;
    this.markDirty();
    return this;
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new Cone({
      radius: this.radiusBottom,
      height: this.height,
      center: [...this.position],
      color: this.fillColor,
      opacity: this.fillOpacity,
      radialSegments: this.radialSegments,
      openEnded: this.openEnded,
      wireframe: this.wireframe,
    });
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}
