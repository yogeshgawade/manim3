import { VMobject } from '../../core/VMobject';
import type { Vec3 } from '../../core/types';
import { BLUE, DEFAULT_STROKE_WIDTH } from '../../constants/colors';

/**
 * Options for creating an Ellipse
 */
export interface EllipseOptions {
  /** Width of the ellipse (horizontal radius * 2). Default: 2 */
  width?: number;
  /** Height of the ellipse (vertical radius * 2). Default: 1 */
  height?: number;
  /** Stroke color as CSS color string. Default: Manim's blue (#58C4DD) */
  color?: string;
  /** Fill opacity from 0 to 1. Default: 0 */
  fillOpacity?: number;
  /** Stroke width in pixels. Default: 4 (Manim's default) */
  strokeWidth?: number;
  /** Number of Bezier segments. Default: 4 */
  numSegments?: number;
}

/**
 * Ellipse - An elliptical VMobject
 *
 * Creates an ellipse defined by its width and height.
 *
 * @example
 * ```typescript
 * // Create a default ellipse
 * const ellipse = new Ellipse();
 *
 * // Create a circle-like ellipse
 * const circle = new Ellipse({ width: 2, height: 2 });
 *
 * // Create a tall ellipse
 * const tall = new Ellipse({ width: 1, height: 3, color: '#ff0000' });
 * ```
 */
export class Ellipse extends VMobject {
  protected _width: number;
  protected _height: number;
  protected _numSegments: number;

  constructor(options: EllipseOptions = {}) {
    super();

    const {
      width = 2,
      height = 1,
      color = BLUE,
      fillOpacity = 0,
      strokeWidth = DEFAULT_STROKE_WIDTH,
      numSegments = 4,
    } = options;

    this._width = width;
    this._height = height;
    this._numSegments = numSegments;

    this.color = color;
    this.fillOpacity = fillOpacity;
    this.strokeWidth = strokeWidth;

    this._generatePoints();
  }

  /**
   * Generate the ellipse points using Bezier curves
   * Uses the same kappa approximation as Circle
   */
  private _generatePoints(): void {
    const rx = this._width / 2;
    const ry = this._height / 2;
    const kappa = (4 / 3) * (Math.SQRT2 - 1);

    const points: number[][] = [];

    // Generate points for 4 quadrants
    // Right point (0 degrees)
    const p0: number[] = [rx, 0, 0];
    // Top point (90 degrees)
    const p1: number[] = [0, ry, 0];
    // Left point (180 degrees)
    const p2: number[] = [-rx, 0, 0];
    // Bottom point (270 degrees)
    const p3: number[] = [0, -ry, 0];

    // Segment 1: Right to Top
    points.push(p0);
    points.push([rx, ry * kappa, 0]);
    points.push([rx * kappa, ry, 0]);
    points.push(p1);

    // Segment 2: Top to Left
    points.push([-rx * kappa, ry, 0]);
    points.push([-rx, ry * kappa, 0]);
    points.push(p2);

    // Segment 3: Left to Bottom
    points.push([-rx, -ry * kappa, 0]);
    points.push([-rx * kappa, -ry, 0]);
    points.push(p3);

    // Segment 4: Bottom to Right (close)
    points.push([rx * kappa, -ry, 0]);
    points.push([rx, -ry * kappa, 0]);
    points.push([...p0]);

    this.setPoints3D(points);
  }

  /**
   * Get the width of the ellipse
   */
  getWidth(): number {
    return this._width;
  }

  /**
   * Set the width of the ellipse
   */
  setWidth(value: number): this {
    this._width = value;
    this._generatePoints();
    return this;
  }

  /**
   * Get the height of the ellipse
   */
  getHeight(): number {
    return this._height;
  }

  /**
   * Set the height of the ellipse
   */
  setHeight(value: number): this {
    this._height = value;
    this._generatePoints();
    return this;
  }

  /**
   * Get the horizontal radius
   */
  getRx(): number {
    return this._width / 2;
  }

  /**
   * Get the vertical radius
   */
  getRy(): number {
    return this._height / 2;
  }

  /**
   * Get the area of the ellipse
   */
  getArea(): number {
    return Math.PI * this.getRx() * this.getRy();
  }

  /**
   * Get the approximate circumference (Ramanujan approximation)
   */
  getCircumference(): number {
    const a = this.getRx();
    const b = this.getRy();
    const h = Math.pow(a - b, 2) / Math.pow(a + b, 2);
    return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
  }

  /**
   * Get a point on the ellipse at a given angle (in radians)
   * @param angle Angle in radians from the positive x-axis
   */
  pointAtAngle(angle: number): Vec3 {
    return [
      this.getRx() * Math.cos(angle),
      this.getRy() * Math.sin(angle),
      0,
    ];
  }

  /**
   * Create a copy of this Ellipse
   */
  copy(): this {
    const clone = new Ellipse({
      width: this._width,
      height: this._height,
      numSegments: this._numSegments,
      color: this.color,
      fillOpacity: this.fillOpacity,
      strokeWidth: this.strokeWidth,
    });
    return clone as this;
  }
}
