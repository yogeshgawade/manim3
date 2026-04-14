import { VMobject } from '../../core/VMobject';
import type { Vec3 } from '../../core/types';
import { BLUE, DEFAULT_STROKE_WIDTH } from '../../constants/colors';

/**
 * Options for creating a Dot
 */
export interface DotOptions {
  /** Point to place the dot at. Default: [0, 0, 0] */
  point?: Vec3;
  /** Radius of the dot. Default: 0.08 */
  radius?: number;
  /** Stroke/fill color as CSS color string. Default: Manim's blue (#58C4DD) */
  color?: string;
  /** Fill opacity from 0 to 1. Default: 1 */
  fillOpacity?: number;
}

/**
 * Dot - A small filled circle VMobject
 *
 * Creates a filled circular dot, useful for marking points.
 *
 * @example
 * ```typescript
 * // Create a dot at the origin
 * const dot = new Dot();
 *
 * // Create a red dot at a specific point
 * const redDot = new Dot({ point: [1, 1, 0], color: '#ff0000', radius: 0.1 });
 *
 * // Create a large blue dot
 * const bigDot = new Dot({ radius: 0.15, fillOpacity: 1 });
 * ```
 */
export class Dot extends VMobject {
  protected _radius: number;

  constructor(options: DotOptions = {}) {
    super();

    const {
      point = [0, 0, 0],
      radius = 0.08,
      color = BLUE,
      fillOpacity = 1,
    } = options;

    this._radius = radius;

    this.color = color;
    this.fillOpacity = fillOpacity;
    this.strokeWidth = 0; // Dots typically have no stroke

    // Use position for transform like all other mobjects
    this.position = [...point];
    this._generatePoints();
  }

  /**
   * Generate the dot as a small circle at origin
   * Position transform will place it at the correct location
   */
  private _generatePoints(): void {
    // Kappa constant for cubic Bezier circle approximation
    const kappa = (4 / 3) * (Math.SQRT2 - 1);
    const r = this._radius;
    // Generate at origin - position transform handles placement
    const cx = 0, cy = 0, cz = 0;

    const points: number[][] = [];

    // Right point
    const p0: number[] = [cx + r, cy, cz];
    // Top point
    const p1: number[] = [cx, cy + r, cz];
    // Left point
    const p2: number[] = [cx - r, cy, cz];
    // Bottom point
    const p3: number[] = [cx, cy - r, cz];

    // Segment 1: Right to Top
    points.push(p0);
    points.push([cx + r, cy + r * kappa, cz]);
    points.push([cx + r * kappa, cy + r, cz]);
    points.push(p1);

    // Segment 2: Top to Left
    points.push([cx - r * kappa, cy + r, cz]);
    points.push([cx - r, cy + r * kappa, cz]);
    points.push(p2);

    // Segment 3: Left to Bottom
    points.push([cx - r, cy - r * kappa, cz]);
    points.push([cx - r * kappa, cy - r, cz]);
    points.push(p3);

    // Segment 4: Bottom to Right
    points.push([cx + r * kappa, cy - r, cz]);
    points.push([cx + r, cy - r * kappa, cz]);
    points.push([...p0]);

    this.setPoints3D(points);
  }

  /**
   * Get center - returns position (consistent with all mobjects)
   */
  override getCenter(): Vec3 {
    return [...this.position];
  }

  /**
   * Get the radius of the dot
   */
  getRadius(): number {
    return this._radius;
  }

  /**
   * Set the radius of the dot
   */
  setRadius(value: number): this {
    this._radius = value;
    this._generatePoints();
    return this;
  }

  /**
   * Create a copy of this Dot
   */
  copy(): this {
    const clone = new Dot({
      point: this.position,
      radius: this._radius,
      color: this.color,
      fillOpacity: this.fillOpacity,
    });
    return clone as this;
  }
}

/**
 * SmallDot - A smaller dot variant
 */
export class SmallDot extends Dot {
  constructor(options: Omit<DotOptions, 'radius'> = {}) {
    super({ ...options, radius: 0.05 });
  }
}

/**
 * LargeDot - A larger dot variant
 */
export class LargeDot extends Dot {
  constructor(options: Omit<DotOptions, 'radius'> = {}) {
    super({ ...options, radius: 0.12 });
  }
}
