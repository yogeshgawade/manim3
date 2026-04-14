import { Mobject } from '../../core/Mobject';
import type { Vec3, MobjectState } from '../../core/types';

/**
 * Options for creating a Sphere
 */
export interface SphereOptions {
  /** Radius of the sphere. Default: 1 */
  radius?: number;
  /** Center position [x, y, z]. Default: [0, 0, 0] */
  center?: Vec3;
  /** Color as CSS color string. Default: '#ffffff' */
  color?: string;
  /** Opacity from 0 to 1. Default: 1 */
  opacity?: number;
  /** Number of segments for sphere geometry. Default: 32 */
  resolution?: number;
  /** Whether to render as wireframe. Default: false */
  wireframe?: boolean;
}

/**
 * Sphere - A 3D spherical mesh
 *
 * Creates a sphere with configurable radius, resolution, and material properties.
 *
 * @example
 * ```typescript
 * // Create a unit sphere
 * const sphere = new Sphere();
 *
 * // Create a red sphere with radius 2
 * const redSphere = new Sphere({ radius: 2, color: '#ff0000' });
 *
 * // Create a semi-transparent wireframe sphere
 * const wireframe = new Sphere({
 *   radius: 1.5,
 *   wireframe: true,
 *   opacity: 0.7
 * });
 * ```
 */
export class Sphere extends Mobject {
  radius: number;
  resolution: number;
  wireframe: boolean;
  fillColor: string;
  fillOpacity: number;

  constructor(options: SphereOptions = {}) {
    super();

    this.radius = options.radius ?? 1;
    this.resolution = options.resolution ?? 32;
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
   * Get the radius
   */
  getRadius(): number {
    return this.radius;
  }

  /**
   * Set the radius
   */
  setRadius(value: number): this {
    this.radius = value;
    this.markDirty();
    return this;
  }

  /**
   * Get the resolution (number of segments)
   */
  getResolution(): number {
    return this.resolution;
  }

  /**
   * Set the resolution
   */
  setResolution(value: number): this {
    this.resolution = value;
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
   * Get the surface area of the sphere
   */
  getSurfaceArea(): number {
    return 4 * Math.PI * this.radius * this.radius;
  }

  /**
   * Get the volume of the sphere
   */
  getVolume(): number {
    return (4 / 3) * Math.PI * Math.pow(this.radius, 3);
  }

  /**
   * Get a point on the sphere at given spherical coordinates
   * @param theta Azimuthal angle (0 to 2*PI)
   * @param phi Polar angle (0 to PI)
   */
  pointAtAngles(theta: number, phi: number): Vec3 {
    const x = this.radius * Math.sin(phi) * Math.cos(theta);
    const y = this.radius * Math.sin(phi) * Math.sin(theta);
    const z = this.radius * Math.cos(phi);
    return [
      x + this.position[0],
      y + this.position[1],
      z + this.position[2],
    ];
  }

  // ── State Management ─────────────────────────────────────────────────────

  override captureState(): MobjectState {
    const base = super.captureState();
    return {
      ...base,
      extra: {
        ...base.extra,
        radius: this.radius,
        resolution: this.resolution,
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
      this.radius = extra.radius;
      this.resolution = extra.resolution;
      this.wireframe = extra.wireframe;
      this.fillColor = extra.fillColor;
      this.fillOpacity = extra.fillOpacity;
    }
    this.markDirty();
    return this;
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new Sphere({
      radius: this.radius,
      center: [...this.position],
      color: this.fillColor,
      opacity: this.fillOpacity,
      resolution: this.resolution,
      wireframe: this.wireframe,
    });
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}
