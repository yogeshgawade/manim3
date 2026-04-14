import { VMobject } from '../../core/VMobject';
import type { Vec3 } from '../../core/types';
import { BLUE, DEFAULT_STROKE_WIDTH } from '../../constants/colors';

/**
 * Options for creating an Arc
 */
export interface ArcOptions {
  /** Radius of the arc. Default: 1 */
  radius?: number;
  /** Start angle in radians. Default: 0 */
  startAngle?: number;
  /** End angle in radians. Default: PI/2 (90 degrees) */
  endAngle?: number;
  /** Number of Bezier segments. Default: 8 */
  numSegments?: number;
  /** Stroke color as CSS color string. Default: Manim's blue (#58C4DD) */
  color?: string;
  /** Fill opacity from 0 to 1. Default: 0 */
  fillOpacity?: number;
  /** Stroke width in pixels. Default: 4 (Manim's default) */
  strokeWidth?: number;
}

/**
 * Arc - A circular arc VMobject
 *
 * Creates a circular arc from a start angle to an end angle.
 *
 * @example
 * ```typescript
 * // Create a 90-degree arc
 * const arc = new Arc();
 *
 * // Create a semicircle
 * const semicircle = new Arc({ startAngle: 0, endAngle: Math.PI });
 *
 * // Create a 3/4 circle arc
 * const arc3_4 = new Arc({ startAngle: 0, endAngle: 1.5 * Math.PI, radius: 2 });
 * ```
 */
export class Arc extends VMobject {
  protected _radius: number;
  protected _startAngle: number;
  protected _endAngle: number;
  protected _numSegments: number;

  constructor(options: ArcOptions = {}) {
    super();

    const {
      radius = 1,
      startAngle = 0,
      endAngle = Math.PI / 2,
      numSegments = 8,
      color = BLUE,
      fillOpacity = 0,
      strokeWidth = DEFAULT_STROKE_WIDTH,
    } = options;

    this._radius = radius;
    this._startAngle = startAngle;
    this._endAngle = endAngle;
    this._numSegments = numSegments;

    this.color = color;
    this.fillOpacity = fillOpacity;
    this.strokeWidth = strokeWidth;

    this._generatePoints();
  }

  /**
   * Generate the arc points using Bezier curves
   */
  private _generatePoints(): void {
    const points: number[][] = [];
    const totalAngle = this._endAngle - this._startAngle;

    // Kappa constant for cubic Bezier circle approximation
    const kappa = (4 / 3) * Math.tan(totalAngle / (4 * this._numSegments));

    for (let i = 0; i <= this._numSegments; i++) {
      const t = i / this._numSegments;
      const angle = this._startAngle + t * totalAngle;

      const x = this._radius * Math.cos(angle);
      const y = this._radius * Math.sin(angle);

      if (i === 0) {
        // First anchor point
        points.push([x, y, 0]);
      } else {
        // Calculate control points
        const prevT = (i - 1) / this._numSegments;
        const prevAngle = this._startAngle + prevT * totalAngle;

        const segmentAngle = totalAngle / this._numSegments;
        const controlAngle1 = prevAngle + segmentAngle * 0.5;
        const controlAngle2 = angle - segmentAngle * 0.5;

        const k = kappa * this._radius;

        // Add control points and anchor
        points.push([
          this._radius * Math.cos(prevAngle) - k * Math.sin(prevAngle),
          this._radius * Math.sin(prevAngle) + k * Math.cos(prevAngle),
          0,
        ]);
        points.push([
          this._radius * Math.cos(angle) + k * Math.sin(angle),
          this._radius * Math.sin(angle) - k * Math.cos(angle),
          0,
        ]);
        points.push([x, y, 0]);
      }
    }

    this.setPoints3D(points);
  }

  /**
   * Get the radius of the arc
   */
  getRadius(): number {
    return this._radius;
  }

  /**
   * Set the radius of the arc
   */
  setRadius(value: number): this {
    this._radius = value;
    this._generatePoints();
    return this;
  }

  /**
   * Get the start angle
   */
  getStartAngle(): number {
    return this._startAngle;
  }

  /**
   * Set the start angle
   */
  setStartAngle(value: number): this {
    this._startAngle = value;
    this._generatePoints();
    return this;
  }

  /**
   * Get the end angle
   */
  getEndAngle(): number {
    return this._endAngle;
  }

  /**
   * Set the end angle
   */
  setEndAngle(value: number): this {
    this._endAngle = value;
    this._generatePoints();
    return this;
  }

  /**
   * Get the arc angle (end - start)
   */
  getArcAngle(): number {
    return this._endAngle - this._startAngle;
  }

  /**
   * Get the arc length
   */
  getArcLength(): number {
    return this._radius * Math.abs(this.getArcAngle());
  }

  /**
   * Get a point on the arc at parameter t (0 = start, 1 = end)
   */
  pointAtT(t: number): Vec3 {
    const angle = this._startAngle + t * (this._endAngle - this._startAngle);
    return [
      this._radius * Math.cos(angle),
      this._radius * Math.sin(angle),
      0,
    ];
  }

  /**
   * Create a copy of this Arc
   */
  copy(): this {
    const clone = new Arc({
      radius: this._radius,
      startAngle: this._startAngle,
      endAngle: this._endAngle,
      numSegments: this._numSegments,
      color: this.color,
      fillOpacity: this.fillOpacity,
      strokeWidth: this.strokeWidth,
    });
    return clone as this;
  }
}

/**
 * Options for creating an ArcBetweenPoints
 */
export interface ArcBetweenPointsOptions {
  /** Start point of the arc. Default: [-1, 0, 0] */
  start?: Vec3;
  /** End point of the arc. Default: [1, 0, 0] */
  end?: Vec3;
  /** Angle in radians for the arc curvature. Default: PI/4 (45 degrees) */
  angle?: number;
  /** Stroke color as CSS color string. Default: Manim's blue (#58C4DD) */
  color?: string;
  /** Stroke width in pixels. Default: 4 (Manim's default) */
  strokeWidth?: number;
}

/**
 * ArcBetweenPoints - An arc between two points
 *
 * Creates a circular arc from a start point to an end point.
 *
 * @example
 * ```typescript
 * // Create an arc between two points
 * const arc = new ArcBetweenPoints({
 *   start: [-1, 0, 0],
 *   end: [1, 0, 0],
 *   angle: Math.PI / 4
 * });
 * ```
 */
export class ArcBetweenPoints extends VMobject {
  private _start: Vec3;
  private _end: Vec3;
  private _angle: number;

  constructor(options: ArcBetweenPointsOptions = {}) {
    super();

    const {
      start = [-1, 0, 0],
      end = [1, 0, 0],
      angle = Math.PI / 4,
      color = BLUE,
      strokeWidth = DEFAULT_STROKE_WIDTH,
    } = options;

    this._start = [...start];
    this._end = [...end];
    this._angle = angle;

    this.color = color;
    this.fillOpacity = 0;
    this.strokeWidth = strokeWidth;

    this._generatePoints();
  }

  /**
   * Generate the arc points
   */
  private _generatePoints(): void {
    // Calculate arc center and radius from start, end, and angle
    const [x1, y1, z1] = this._start;
    const [x2, y2, z2] = this._end;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const chordLength = Math.sqrt(dx * dx + dy * dy);

    if (chordLength < 1e-6) {
      // Start and end are the same, can't make an arc
      this.setPoints3D([]);
      return;
    }

    // Calculate radius from chord length and angle
    // chord = 2 * radius * sin(angle / 2)
    const radius = chordLength / (2 * Math.sin(this._angle / 2));

    // Calculate center point (perpendicular to chord)
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    // Distance from midpoint to center
    const midToCenter = Math.sqrt(radius * radius - (chordLength / 2) * (chordLength / 2));

    // Perpendicular direction
    const perpX = -dy / chordLength;
    const perpY = dx / chordLength;

    // Choose center on the side that creates the correct arc angle
    const centerX = midX + midToCenter * perpX;
    const centerY = midY + midToCenter * perpY;

    // Calculate start and end angles
    const startAngle = Math.atan2(y1 - centerY, x1 - centerX);
    const endAngle = Math.atan2(y2 - centerY, x2 - centerX);

    // Generate arc points
    const points: number[][] = [];
    const numSegments = 8;
    const totalAngle = endAngle - startAngle;

    // Ensure we go the right direction around the circle
    const actualAngle = this._angle > 0 ? totalAngle : totalAngle - Math.PI * 2;

    for (let i = 0; i <= numSegments; i++) {
      const t = i / numSegments;
      const angle = startAngle + t * actualAngle;

      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      if (i === 0) {
        points.push([x, y, z1]);
      } else {
        const prevT = (i - 1) / numSegments;
        const prevAngle = startAngle + prevT * actualAngle;
        const segmentAngle = actualAngle / numSegments;
        const k = (4 / 3) * Math.tan(segmentAngle / 4) * radius;

        points.push([
          centerX + radius * Math.cos(prevAngle) - k * Math.sin(prevAngle),
          centerY + radius * Math.sin(prevAngle) + k * Math.cos(prevAngle),
          z1,
        ]);
        points.push([
          centerX + radius * Math.cos(angle) + k * Math.sin(angle),
          centerY + radius * Math.sin(angle) - k * Math.cos(angle),
          z1,
        ]);
        points.push([x, y, z1]);
      }
    }

    this.setPoints3D(points);
  }

  /**
   * Create a copy of this ArcBetweenPoints
   */
  copy(): this {
    const clone = new ArcBetweenPoints({
      start: this._start,
      end: this._end,
      angle: this._angle,
      color: this.color,
      strokeWidth: this.strokeWidth,
    });
    return clone as this;
  }
}
