import { VMobject } from '../../core/VMobject';
import type { Vec3 } from '../../core/types';
import { BLUE, DEFAULT_STROKE_WIDTH } from '../../constants/colors';

/**
 * Control points for a cubic Bezier curve
 */
export type CubicBezierPoints = [Vec3, Vec3, Vec3, Vec3];

/**
 * Options for creating a CubicBezier
 */
export interface CubicBezierOptions {
  /** The four control points [p0, p1, p2, p3] */
  points: CubicBezierPoints;
  /** Stroke color as CSS color string. Default: Manim's blue (#58C4DD) */
  color?: string;
  /** Stroke width in pixels. Default: 4 (Manim's default) */
  strokeWidth?: number;
}

/**
 * CubicBezier - A single cubic Bezier curve segment
 *
 * Creates a cubic Bezier curve defined by four control points:
 * - p0: Start anchor point
 * - p1: First control point (influences curve near start)
 * - p2: Second control point (influences curve near end)
 * - p3: End anchor point
 *
 * @example
 * ```typescript
 * // Create a simple S-curve
 * const bezier = new CubicBezier({
 *   points: [
 *     [0, 0, 0],
 *     [1, 1, 0],
 *     [2, -1, 0],
 *     [3, 0, 0]
 *   ]
 * });
 *
 * // Get a point at parameter t
 * const midpoint = bezier.pointAtT(0.5);
 * ```
 */
export class CubicBezier extends VMobject {
  private _controlPoints: CubicBezierPoints;

  constructor(options: CubicBezierOptions) {
    super();

    const { points, color = BLUE, strokeWidth = DEFAULT_STROKE_WIDTH } = options;

    // Deep copy the control points
    this._controlPoints = [
      [...points[0]] as Vec3,
      [...points[1]] as Vec3,
      [...points[2]] as Vec3,
      [...points[3]] as Vec3,
    ];

    this.color = color;
    this.fillOpacity = 0;
    this.strokeWidth = strokeWidth;

    this._generatePoints();
  }

  /**
   * Generate the Bezier curve points
   */
  private _generatePoints(): void {
    this.setPoints3D([
      [...this._controlPoints[0]],
      [...this._controlPoints[1]],
      [...this._controlPoints[2]],
      [...this._controlPoints[3]],
    ]);
  }

  /**
   * Get the control points
   */
  getControlPoints(): CubicBezierPoints {
    return [
      [...this._controlPoints[0]] as Vec3,
      [...this._controlPoints[1]] as Vec3,
      [...this._controlPoints[2]] as Vec3,
      [...this._controlPoints[3]] as Vec3,
    ];
  }

  /**
   * Set the control points
   */
  setControlPoints(points: CubicBezierPoints): this {
    this._controlPoints = [
      [...points[0]] as Vec3,
      [...points[1]] as Vec3,
      [...points[2]] as Vec3,
      [...points[3]] as Vec3,
    ];
    this._generatePoints();
    return this;
  }

  /**
   * Get a specific control point by index (0-3)
   */
  getControlPoint(index: 0 | 1 | 2 | 3): Vec3 {
    return [...this._controlPoints[index]] as Vec3;
  }

  /**
   * Set a specific control point by index (0-3)
   */
  setControlPoint(index: 0 | 1 | 2 | 3, point: Vec3): this {
    this._controlPoints[index] = [...point] as Vec3;
    this._generatePoints();
    return this;
  }

  /**
   * Evaluate the curve at parameter t (0 to 1)
   * @param t Parameter value from 0 (start) to 1 (end)
   * @returns Point on the curve at parameter t
   */
  pointAtT(t: number): Vec3 {
    const [p0, p1, p2, p3] = this._controlPoints;

    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    // Cubic Bezier formula: B(t) = (1-t)^3*P0 + 3*(1-t)^2*t*P1 + 3*(1-t)*t^2*P2 + t^3*P3
    return [
      mt3 * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t3 * p3[0],
      mt3 * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t3 * p3[1],
      mt3 * p0[2] + 3 * mt2 * t * p1[2] + 3 * mt * t2 * p2[2] + t3 * p3[2],
    ];
  }

  /**
   * Get the tangent vector at parameter t (0 to 1)
   * @param t Parameter value from 0 (start) to 1 (end)
   * @returns Tangent vector at parameter t (not normalized)
   */
  tangentAtT(t: number): Vec3 {
    const [p0, p1, p2, p3] = this._controlPoints;

    const t2 = t * t;
    const mt = 1 - t;
    const mt2 = mt * mt;

    // Derivative of cubic Bezier: B'(t) = 3*(1-t)^2*(P1-P0) + 6*(1-t)*t*(P2-P1) + 3*t^2*(P3-P2)
    const a = 3 * mt2;
    const b = 6 * mt * t;
    const c = 3 * t2;

    return [
      a * (p1[0] - p0[0]) + b * (p2[0] - p1[0]) + c * (p3[0] - p2[0]),
      a * (p1[1] - p0[1]) + b * (p2[1] - p1[1]) + c * (p3[1] - p2[1]),
      a * (p1[2] - p0[2]) + b * (p2[2] - p1[2]) + c * (p3[2] - p2[2]),
    ];
  }

  /**
   * Get the normalized tangent vector at parameter t
   * @param t Parameter value from 0 (start) to 1 (end)
   * @returns Normalized tangent vector at parameter t
   */
  normalizedTangentAtT(t: number): Vec3 {
    const tangent = this.tangentAtT(t);
    const length = Math.sqrt(
      tangent[0] * tangent[0] + tangent[1] * tangent[1] + tangent[2] * tangent[2],
    );

    if (length < 1e-10) {
      return [1, 0, 0]; // Default direction for degenerate case
    }

    return [tangent[0] / length, tangent[1] / length, tangent[2] / length];
  }

  /**
   * Get the normal vector at parameter t (perpendicular to tangent in XY plane)
   * @param t Parameter value from 0 (start) to 1 (end)
   * @returns Normal vector at parameter t
   */
  normalAtT(t: number): Vec3 {
    const tangent = this.normalizedTangentAtT(t);
    // Rotate 90 degrees in XY plane
    return [-tangent[1], tangent[0], 0];
  }

  /**
   * Get the start point (p0)
   */
  getStart(): Vec3 {
    return [...this._controlPoints[0]] as Vec3;
  }

  /**
   * Get the end point (p3)
   */
  getEnd(): Vec3 {
    return [...this._controlPoints[3]] as Vec3;
  }

  /**
   * Approximate the arc length of the curve using numerical integration
   * @param numSamples Number of samples for approximation. Default: 50
   */
  getApproximateLength(numSamples: number = 50): number {
    let length = 0;
    let prevPoint = this.pointAtT(0);

    for (let i = 1; i <= numSamples; i++) {
      const t = i / numSamples;
      const point = this.pointAtT(t);

      const dx = point[0] - prevPoint[0];
      const dy = point[1] - prevPoint[1];
      const dz = point[2] - prevPoint[2];

      length += Math.sqrt(dx * dx + dy * dy + dz * dz);
      prevPoint = point;
    }

    return length;
  }

  /**
   * Create a copy of this CubicBezier
   */
  copy(): this {
    const clone = new CubicBezier({
      points: this.getControlPoints(),
      color: this.color,
      strokeWidth: this.strokeWidth,
    });
    return clone as this;
  }
}
