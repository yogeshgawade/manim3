import { VMobject } from '../../core/VMobject';
import type { Vec3 } from '../../core/types';
import { BLUE, DEFAULT_STROKE_WIDTH } from '../../constants/colors';

/**
 * Options for creating an AnnularSector
 */
export interface AnnularSectorOptions {
  /** Inner radius of the sector. Default: 0.5 */
  innerRadius?: number;
  /** Outer radius of the sector. Default: 1 */
  outerRadius?: number;
  /** Start angle in radians. Default: 0 */
  startAngle?: number;
  /** Arc angle (span) in radians. Default: PI/2 */
  angle?: number;
  /** Stroke color as CSS color string. Default: Manim's blue (#58C4DD) */
  color?: string;
  /** Fill opacity from 0 to 1. Default: 0.5 */
  fillOpacity?: number;
  /** Stroke width in pixels. Default: 4 (Manim's default) */
  strokeWidth?: number;
  /** Center position. Default: [0, 0, 0] */
  center?: Vec3;
  /** Number of Bezier segments for approximation. Default: 8 */
  numComponents?: number;
}

/**
 * AnnularSector - A pie slice of an annulus (ring)
 *
 * Creates a sector of an annulus, like a slice of a donut.
 *
 * @example
 * ```typescript
 * // Create a quarter donut slice
 * const slice = new AnnularSector({
 *   innerRadius: 0.5,
 *   outerRadius: 1.5,
 *   startAngle: 0,
 *   angle: Math.PI / 2
 * });
 *
 * // Create a half ring
 * const halfRing = new AnnularSector({
 *   innerRadius: 0.3,
 *   outerRadius: 1,
 *   angle: Math.PI,
 *   fillOpacity: 0.8
 * });
 * ```
 */
export class AnnularSector extends VMobject {
  private _innerRadius: number;
  private _outerRadius: number;
  private _startAngle: number;
  private _angle: number;
  private _centerPoint: Vec3;
  private _numComponents: number;

  constructor(options: AnnularSectorOptions = {}) {
    super();

    const {
      innerRadius = 0.5,
      outerRadius = 1,
      startAngle = 0,
      angle = Math.PI / 2,
      color = BLUE,
      fillOpacity = 0.5,
      strokeWidth = DEFAULT_STROKE_WIDTH,
      center = [0, 0, 0],
      numComponents = 8,
    } = options;

    this._innerRadius = innerRadius;
    this._outerRadius = outerRadius;
    this._startAngle = startAngle;
    this._angle = angle;
    this._centerPoint = [...center];
    this._numComponents = numComponents;

    this.color = color;
    this.fillOpacity = fillOpacity;
    this.strokeWidth = strokeWidth;

    this._generatePoints();
  }

  /**
   * Generate the annular sector as a single closed path.
   * Path: outer arc → end line → inner arc (backward) → start line → close
   */
  private _generatePoints(): void {
    const [cx, cy, cz] = this._centerPoint;
    const points: number[][] = [];

    const numSegments = Math.max(
      1,
      Math.ceil((Math.abs(this._angle) / (Math.PI / 2)) * (this._numComponents / 4)),
    );
    const segmentAngle = this._angle / numSegments;
    const kappa = (4 / 3) * Math.tan(segmentAngle / 4);

    // Helper to get point on circle
    const getPoint = (radius: number, angle: number) => ({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });

    // Helper to get tangent vector (counter-clockwise)
    const getTangent = (angle: number) => ({
      dx: -Math.sin(angle),
      dy: Math.cos(angle),
    });

    // 1. Outer arc (forward direction)
    for (let i = 0; i < numSegments; i++) {
      const theta1 = this._startAngle + i * segmentAngle;
      const theta2 = this._startAngle + (i + 1) * segmentAngle;

      const p0 = getPoint(this._outerRadius, theta1);
      const p3 = getPoint(this._outerRadius, theta2);
      const t1 = getTangent(theta1);
      const t2 = getTangent(theta2);

      const p1 = { x: p0.x + kappa * this._outerRadius * t1.dx, y: p0.y + kappa * this._outerRadius * t1.dy };
      const p2 = { x: p3.x - kappa * this._outerRadius * t2.dx, y: p3.y - kappa * this._outerRadius * t2.dy };

      if (i === 0) {
        points.push([p0.x, p0.y, cz]);  // Start anchor
      }
      points.push([p1.x, p1.y, cz]);  // CP1
      points.push([p2.x, p2.y, cz]);  // CP2
      points.push([p3.x, p3.y, cz]);  // End anchor (becomes next start)
    }

    // 2. Line from outer end to inner end
    const endAngle = this._startAngle + this._angle;
    const outerEnd = getPoint(this._outerRadius, endAngle);
    const innerEnd = getPoint(this._innerRadius, endAngle);

    // Line is already continuing from outerEnd (last point), so just add CPs and end
    const dx = innerEnd.x - outerEnd.x;
    const dy = innerEnd.y - outerEnd.y;
    points.push([outerEnd.x + dx / 3, outerEnd.y + dy / 3, cz]);  // CP1
    points.push([outerEnd.x + (2 * dx) / 3, outerEnd.y + (2 * dy) / 3, cz]);  // CP2
    points.push([innerEnd.x, innerEnd.y, cz]);  // End = innerEnd

    // 3. Inner arc (backward direction)
    for (let i = numSegments - 1; i >= 0; i--) {
      const theta1 = this._startAngle + (i + 1) * segmentAngle;  // End angle of segment (going backward)
      const theta2 = this._startAngle + i * segmentAngle;      // Start angle of segment (going backward)

      const p0 = getPoint(this._innerRadius, theta1);  // Start = innerEnd for first iteration
      const p3 = getPoint(this._innerRadius, theta2);
      const t1 = getTangent(theta1);
      const t2 = getTangent(theta2);

      // For backward arc, we negate tangents to go clockwise
      const p1 = { x: p0.x - kappa * this._innerRadius * t1.dx, y: p0.y - kappa * this._innerRadius * t1.dy };
      const p2 = { x: p3.x + kappa * this._innerRadius * t2.dx, y: p3.y + kappa * this._innerRadius * t2.dy };

      // p0 is already the last point (innerEnd from line, then previous segment end)
      points.push([p1.x, p1.y, cz]);  // CP1
      points.push([p2.x, p2.y, cz]);  // CP2
      points.push([p3.x, p3.y, cz]);  // End anchor
    }

    // 4. Line from inner start to outer start (close the shape)
    const innerStart = getPoint(this._innerRadius, this._startAngle);
    const outerStart = getPoint(this._outerRadius, this._startAngle);

    const dx2 = outerStart.x - innerStart.x;
    const dy2 = outerStart.y - innerStart.y;
    points.push([innerStart.x + dx2 / 3, innerStart.y + dy2 / 3, cz]);  // CP1
    points.push([innerStart.x + (2 * dx2) / 3, innerStart.y + (2 * dy2) / 3, cz]);  // CP2
    points.push([outerStart.x, outerStart.y, cz]);  // End = outerStart (closes to path start)

    this.setPoints3D(points);
  }

  /**
   * Get the inner radius
   */
  getInnerRadius(): number {
    return this._innerRadius;
  }

  /**
   * Set the inner radius
   */
  setInnerRadius(value: number): this {
    this._innerRadius = value;
    this._generatePoints();
    return this;
  }

  /**
   * Get the outer radius
   */
  getOuterRadius(): number {
    return this._outerRadius;
  }

  /**
   * Set the outer radius
   */
  setOuterRadius(value: number): this {
    this._outerRadius = value;
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
   * Get the arc angle
   */
  getAngle(): number {
    return this._angle;
  }

  /**
   * Set the arc angle
   */
  setAngle(value: number): this {
    this._angle = value;
    this._generatePoints();
    return this;
  }

  /**
   * Get the center
   */
  getSectorCenter(): Vec3 {
    return [...this._centerPoint];
  }

  /**
   * Get the area of the sector
   */
  getArea(): number {
    return (
      (Math.abs(this._angle) / 2) *
      (this._outerRadius * this._outerRadius - this._innerRadius * this._innerRadius)
    );
  }

  /**
   * Create a copy of this AnnularSector
   */
  copy(): this {
    const clone = new AnnularSector({
      innerRadius: this._innerRadius,
      outerRadius: this._outerRadius,
      startAngle: this._startAngle,
      angle: this._angle,
      center: this._centerPoint,
      numComponents: this._numComponents,
      color: this.color,
      fillOpacity: this.fillOpacity,
      strokeWidth: this.strokeWidth,
    });
    return clone as this;
  }
}
