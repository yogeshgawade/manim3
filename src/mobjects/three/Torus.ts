import { Mobject } from '../../core/Mobject';
import type { Vec3, MobjectState } from '../../core/types';

/**
 * Options for creating a Torus
 */
export interface TorusOptions {
  /** Major radius (distance from center of tube to center of torus). Default: 1 */
  radius?: number;
  /** Minor radius (radius of the tube). Default: 0.3 */
  tubeRadius?: number;
  /** Center position [x, y, z]. Default: [0, 0, 0] */
  center?: Vec3;
  /** Color as CSS color string. Default: '#ffffff' */
  color?: string;
  /** Opacity from 0 to 1. Default: 1 */
  opacity?: number;
  /** Number of radial segments. Default: 32 */
  radialSegments?: number;
  /** Number of tubular segments. Default: 64 */
  tubularSegments?: number;
  /** Central angle (arc). Default: 2*PI (full torus) */
  arc?: number;
  /** Whether to render as wireframe. Default: false */
  wireframe?: boolean;
}

/**
 * Torus - A 3D torus (donut shape) mesh
 *
 * Creates a torus with configurable major and minor radii, and material properties.
 *
 * @example
 * ```typescript
 * // Create a default torus
 * const torus = new Torus();
 *
 * // Create a red torus with larger tube
 * const redTorus = new Torus({
 *   radius: 2,
 *   tubeRadius: 0.5,
 *   color: '#ff0000'
 * });
 *
 * // Create a half-torus (arc)
 * const halfTorus = new Torus({
 *   arc: Math.PI
 * });
 * ```
 */
export class Torus extends Mobject {
  radius: number;
  tubeRadius: number;
  radialSegments: number;
  tubularSegments: number;
  arc: number;
  wireframe: boolean;
  fillColor: string;
  fillOpacity: number;

  constructor(options: TorusOptions = {}) {
    super();

    this.radius = options.radius ?? 1;
    this.tubeRadius = options.tubeRadius ?? 0.3;
    this.radialSegments = options.radialSegments ?? 32;
    this.tubularSegments = options.tubularSegments ?? 64;
    this.arc = options.arc ?? Math.PI * 2;
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
   * Get the major radius
   */
  getRadius(): number {
    return this.radius;
  }

  /**
   * Set the major radius
   */
  setRadius(value: number): this {
    this.radius = value;
    this.markDirty();
    return this;
  }

  /**
   * Get the tube radius
   */
  getTubeRadius(): number {
    return this.tubeRadius;
  }

  /**
   * Set the tube radius
   */
  setTubeRadius(value: number): this {
    this.tubeRadius = value;
    this.markDirty();
    return this;
  }

  /**
   * Get the arc angle
   */
  getArc(): number {
    return this.arc;
  }

  /**
   * Set the arc angle
   */
  setArc(value: number): this {
    this.arc = value;
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
   * Get the surface area of the torus
   */
  getSurfaceArea(): number {
    const arcFraction = this.arc / (Math.PI * 2);
    return 4 * Math.PI * Math.PI * this.radius * this.tubeRadius * arcFraction;
  }

  /**
   * Get the volume of the torus
   */
  getVolume(): number {
    const arcFraction = this.arc / (Math.PI * 2);
    return 2 * Math.PI * Math.PI * this.radius * this.tubeRadius * this.tubeRadius * arcFraction;
  }

  /**
   * Get a point on the torus surface
   * @param u Angle around the tube (0 to 2*PI)
   * @param v Angle around the torus (0 to 2*PI)
   */
  pointAtAngles(u: number, v: number): Vec3 {
    const x = (this.radius + this.tubeRadius * Math.cos(v)) * Math.cos(u);
    const y = (this.radius + this.tubeRadius * Math.cos(v)) * Math.sin(u);
    const z = this.tubeRadius * Math.sin(v);
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
        tubeRadius: this.tubeRadius,
        radialSegments: this.radialSegments,
        tubularSegments: this.tubularSegments,
        arc: this.arc,
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
      this.tubeRadius = extra.tubeRadius;
      this.radialSegments = extra.radialSegments;
      this.tubularSegments = extra.tubularSegments;
      this.arc = extra.arc;
      this.wireframe = extra.wireframe;
      this.fillColor = extra.fillColor;
      this.fillOpacity = extra.fillOpacity;
    }
    this.markDirty();
    return this;
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new Torus({
      radius: this.radius,
      tubeRadius: this.tubeRadius,
      center: [...this.position],
      color: this.fillColor,
      opacity: this.fillOpacity,
      radialSegments: this.radialSegments,
      tubularSegments: this.tubularSegments,
      arc: this.arc,
      wireframe: this.wireframe,
    });
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}
