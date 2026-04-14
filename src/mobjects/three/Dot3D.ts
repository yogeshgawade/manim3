import { Mobject } from '../../core/Mobject';
import type { Vec3, MobjectState } from '../../core/types';

/**
 * Options for creating a Dot3D
 */
export interface Dot3DOptions {
  /** Position [x, y, z]. Default: [0, 0, 0] */
  point?: Vec3;
  /** Radius of the dot. Default: 0.05 */
  radius?: number;
  /** Color as CSS color string. Default: '#ffffff' */
  color?: string;
  /** Opacity from 0 to 1. Default: 1 */
  opacity?: number;
  /** Number of segments for the sphere geometry. Default: 16 */
  resolution?: number;
}

/**
 * Dot3D - A small 3D sphere representing a point in space
 *
 * Useful for marking specific points, vertices, or creating point clouds.
 *
 * @example
 * ```typescript
 * // Create a dot at origin
 * const dot = new Dot3D();
 *
 * // Create a red dot at specific position
 * const redDot = new Dot3D({
 *   point: [1, 2, 3],
 *   radius: 0.1,
 *   color: '#ff0000'
 * });
 *
 * // Create multiple dots for a point cloud
 * const points: Vec3[] = [[0,0,0], [1,0,0], [0,1,0], [0,0,1]];
 * const dots = points.map(p => new Dot3D({ point: p, radius: 0.05, color: '#ffff00' }));
 * ```
 */
export class Dot3D extends Mobject {
  point: Vec3;
  radius: number;
  resolution: number;
  fillColor: string;
  fillOpacity: number;

  constructor(options: Dot3DOptions = {}) {
    super();

    this.point = options.point ?? [0, 0, 0];
    this.radius = options.radius ?? 0.05;
    this.resolution = options.resolution ?? 16;
    this.fillColor = options.color ?? '#ffffff';
    this.color = this.fillColor;
    this.fillOpacity = options.opacity ?? 1;
    this.opacity = options.opacity ?? 1;

    // Position is the point location
    this.position = [...this.point];

    this.markDirty();
  }

  /**
   * Get the point position
   */
  getPoint(): Vec3 {
    return [...this.point];
  }

  /**
   * Set the point position
   */
  setPoint(value: Vec3): this {
    this.point = [...value];
    this.position = [...value];
    this.markDirty();
    return this;
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

  // ── State Management ─────────────────────────────────────────────────────

  override captureState(): MobjectState {
    const base = super.captureState();
    return {
      ...base,
      extra: {
        ...base.extra,
        point: [...this.point] as Vec3,
        radius: this.radius,
        resolution: this.resolution,
        fillColor: this.fillColor,
        fillOpacity: this.fillOpacity,
      },
    };
  }

  override restoreState(state: MobjectState): this {
    super.restoreState(state);
    const extra = state.extra as any;
    if (extra) {
      this.point = [...extra.point] as Vec3;
      this.radius = extra.radius;
      this.resolution = extra.resolution;
      this.fillColor = extra.fillColor;
      this.fillOpacity = extra.fillOpacity;
      this.position = [...this.point];
    }
    this.markDirty();
    return this;
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new Dot3D({
      point: [...this.point],
      radius: this.radius,
      color: this.fillColor,
      opacity: this.fillOpacity,
      resolution: this.resolution,
    });
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}
