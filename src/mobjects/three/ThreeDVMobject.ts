import { VMobject } from '../../core/VMobject';
import type { Vec3, MobjectState } from '../../core/types';

/**
 * Options for creating a ThreeDVMobject
 */
export interface ThreeDVMobjectOptions {
  /** Initial points in 3D space. Default: [] */
  points?: number[][];
  /** Color as CSS color string. Default: '#ffffff' */
  color?: string;
  /** Opacity from 0 to 1. Default: 1 */
  opacity?: number;
  /** Fill opacity from 0 to 1. Default: 0.5 */
  fillOpacity?: number;
  /** Stroke width. Default: 4 */
  strokeWidth?: number;
  /** Whether this is a closed path. Default: false */
  closePath?: boolean;
}

/**
 * ThreeDVMobject - Base class for 3D vector mobjects
 *
 * Extends VMobject with proper 3D support, allowing paths and shapes
 * to exist fully in 3D space with proper Z-coordinate handling.
 * This is useful for creating 3D curves, paths, and shapes that
 * aren't restricted to a plane.
 *
 * @example
 * ```typescript
 * // Create a 3D path
 * const path = new ThreeDVMobject({
 *   points: [
 *     [0, 0, 0],
 *     [1, 0, 0],
 *     [1, 1, 0.5],
 *     [1, 1, 1]
 *   ],
 *   color: '#00ff00',
 *   strokeWidth: 3
 * });
 *
 * // Create a 3D spiral
 * const spiralPoints: number[][] = [];
 * for (let t = 0; t <= 4 * Math.PI; t += 0.1) {
 *   spiralPoints.push([
 *     Math.cos(t),
 *     Math.sin(t),
 *     t / (4 * Math.PI)
 *   ]);
 * }
 * const spiral = new ThreeDVMobject({
 *   points: spiralPoints,
 *   color: '#ff00ff'
 * });
 * ```
 */
export class ThreeDVMobject extends VMobject {
  closePath: boolean;

  constructor(options: ThreeDVMobjectOptions = {}) {
    super();

    this.closePath = options.closePath ?? false;
    this.color = options.color ?? '#ffffff';
    this.opacity = options.opacity ?? 1;
    this.fillOpacity = options.fillOpacity ?? 0.5;
    this.strokeWidth = options.strokeWidth ?? 4;

    if (options.points && options.points.length > 0) {
      this.setPoints3D(options.points);
    }
  }

  /**
   * Set whether the path should be closed
   */
  setClosePath(value: boolean): this {
    this.closePath = value;
    this.markDirty();
    return this;
  }

  /**
   * Get whether the path is closed
   */
  isClosedPath(): boolean {
    return this.closePath;
  }

  /**
   * Add a 3D point to the path
   * @param point - The 3D point [x, y, z]
   */
  addPoint3D(point: number[]): this {
    this.points3D.push([...point]);
    this.markDirty();
    return this;
  }

  /**
   * Add a cubic Bezier curve segment in 3D
   * @param handle1 - First control point
   * @param handle2 - Second control point
   * @param anchor - End anchor point
   */
  addCubicBezierCurveTo(handle1: number[], handle2: number[], anchor: number[]): this {
    this.points3D.push([...handle1], [...handle2], [...anchor]);
    this.markDirty();
    return this;
  }

  /**
   * Add a line segment in 3D (creates degenerate Bezier)
   * @param end - End point
   */
  addLineTo(end: number[]): this {
    if (this.points3D.length === 0) {
      this.points3D.push([0, 0, 0]);
    }

    const start = this.points3D[this.points3D.length - 1];

    // Create a degenerate cubic Bezier (handles on the line)
    const handle1 = [
      start[0] + (end[0] - start[0]) / 3,
      start[1] + (end[1] - start[1]) / 3,
      start[2] + (end[2] - start[2]) / 3,
    ];
    const handle2 = [
      start[0] + (2 * (end[0] - start[0])) / 3,
      start[1] + (2 * (end[1] - start[1])) / 3,
      start[2] + (2 * (end[2] - start[2])) / 3,
    ];

    return this.addCubicBezierCurveTo(handle1, handle2, end);
  }

  /**
   * Start a new subpath at the given point
   * @param point - Starting point
   */
  startNewPath(point: number[]): this {
    this.points3D.push([...point]);
    this.markDirty();
    return this;
  }

  /**
   * Close the current path by connecting back to the start
   */
  closeCurrentPath(): this {
    if (this.points3D.length < 2) return this;

    const start = this.points3D[0];
    const end = this.points3D[this.points3D.length - 1];

    // If not already closed, add a line back to start
    const dist = Math.sqrt(
      Math.pow(end[0] - start[0], 2) +
        Math.pow(end[1] - start[1], 2) +
        Math.pow(end[2] - start[2], 2),
    );

    if (dist > 0.0001) {
      this.addLineTo(start);
    }

    this.closePath = true;
    return this;
  }

  /**
   * Get the center of this 3D VMobject based on its points
   */
  override getCenter(): Vec3 {
    if (this.points3D.length === 0) {
      return [...this.position] as Vec3;
    }

    // Calculate centroid of all 3D points
    let sumX = 0, sumY = 0, sumZ = 0;
    for (const point of this.points3D) {
      sumX += point[0];
      sumY += point[1];
      sumZ += point[2];
    }
    const count = this.points3D.length;

    return [
      this.position[0] + sumX / count,
      this.position[1] + sumY / count,
      this.position[2] + sumZ / count,
    ];
  }

  /**
   * Get the bounding box in 3D
   */
  getBounds3D(): { min: Vec3; max: Vec3 } {
    if (this.points3D.length === 0) {
      return {
        min: [...this.position] as Vec3,
        max: [...this.position] as Vec3,
      };
    }

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const point of this.points3D) {
      minX = Math.min(minX, point[0]);
      minY = Math.min(minY, point[1]);
      minZ = Math.min(minZ, point[2]);
      maxX = Math.max(maxX, point[0]);
      maxY = Math.max(maxY, point[1]);
      maxZ = Math.max(maxZ, point[2]);
    }

    return {
      min: [
        this.position[0] + minX,
        this.position[1] + minY,
        this.position[2] + minZ,
      ] as Vec3,
      max: [
        this.position[0] + maxX,
        this.position[1] + maxY,
        this.position[2] + maxZ,
      ] as Vec3,
    };
  }

  // ── State Management ─────────────────────────────────────────────────────

  override captureState(): MobjectState {
    const base = super.captureState();
    return {
      ...base,
      extra: {
        ...base.extra,
        closePath: this.closePath,
      },
    };
  }

  override restoreState(state: MobjectState): this {
    super.restoreState(state);
    const extra = state.extra as any;
    if (extra) {
      this.closePath = extra.closePath;
    }
    this.markDirty();
    return this;
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new ThreeDVMobject({
      points: this.points3D.map(p => [...p]),
      color: this.color,
      opacity: this.opacity,
      fillOpacity: this.fillOpacity,
      strokeWidth: this.strokeWidth,
      closePath: this.closePath,
    });
    copy.position = [...this.position];
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}
