import { VMobject } from '../../core/VMobject';
import { Group } from '../../core/Group';
import type { Vec3 } from '../../core/types';
import { Line } from './Line';
import { WHITE, BLUE, DEFAULT_STROKE_WIDTH } from '../../constants/colors';

/**
 * Options for creating an Angle
 */
export interface AngleOptions {
  /** Radius of the angle arc. Default: 0.5 */
  radius?: number;
  /** Quadrant for angle indicator (1, 2, 3, or 4). Default: auto-detect */
  quadrant?: 1 | 2 | 3 | 4;
  /** If true, display the reflex angle (other side). Default: false */
  otherAngle?: boolean;
  /** Stroke color. Default: WHITE */
  color?: string;
  /** Stroke width. Default: 4 */
  strokeWidth?: number;
}

/**
 * Input for Angle constructor - either two Lines or three points
 */
export type AngleInput =
  | { line1: Line; line2: Line }
  | { points: [Vec3, Vec3, Vec3] };

/**
 * Angle - Angle indicator between two lines
 *
 * Creates an arc to indicate the angle between two lines or three points.
 *
 * @example
 * ```typescript
 * // Using two lines
 * const line1 = new Line({ start: [0, 0, 0], end: [2, 0, 0] });
 * const line2 = new Line({ start: [0, 0, 0], end: [1, 1, 0] });
 * const angle = new Angle({ line1, line2 }, { radius: 0.5 });
 *
 * // Using three points (vertex at middle point)
 * const angle2 = new Angle(
 *   { points: [[2, 0, 0], [0, 0, 0], [1, 1, 0]] }
 * );
 * ```
 */
export class Angle extends VMobject {
  private _vertex: Vec3;
  private _startAngle: number;
  private _angleValue: number;
  private _radius: number;

  constructor(input: AngleInput, options: AngleOptions = {}) {
    super();

    const {
      radius = 0.5,
      quadrant,
      otherAngle = false,
      color = WHITE,
      strokeWidth = DEFAULT_STROKE_WIDTH,
    } = options;

    this._radius = radius;
    this.color = color;
    this.fillOpacity = 0;
    this.strokeWidth = strokeWidth;

    // Extract points from input
    let point1: Vec3;
    let vertex: Vec3;
    let point2: Vec3;

    if ('line1' in input && 'line2' in input) {
      // Two lines - find intersection point (vertex)
      const line1Start = input.line1.getStart();
      const line1End = input.line1.getEnd();
      const line2Start = input.line2.getStart();
      const line2End = input.line2.getEnd();

      // Find the best vertex (closest intersection point)
      const d1 = this._distance(line1Start, line2Start);
      const d2 = this._distance(line1Start, line2End);
      const d3 = this._distance(line1End, line2Start);
      const d4 = this._distance(line1End, line2End);

      const minDist = Math.min(d1, d2, d3, d4);

      if (minDist === d1) {
        vertex = line1Start;
        point1 = line1End;
        point2 = line2End;
      } else if (minDist === d2) {
        vertex = line1Start;
        point1 = line1End;
        point2 = line2Start;
      } else if (minDist === d3) {
        vertex = line1End;
        point1 = line1Start;
        point2 = line2End;
      } else {
        vertex = line1End;
        point1 = line1Start;
        point2 = line2Start;
      }
    } else {
      // Three points - vertex is the middle point
      [point1, vertex, point2] = input.points;
    }

    this._vertex = [...vertex];

    // Calculate angles from vertex to each point
    const angle1 = Math.atan2(point1[1] - vertex[1], point1[0] - vertex[0]);
    const angle2 = Math.atan2(point2[1] - vertex[1], point2[0] - vertex[0]);

    // Determine the angle span
    let deltaAngle = angle2 - angle1;

    // Handle quadrant selection
    if (quadrant !== undefined) {
      const adjustedAngle = this._adjustForQuadrant(angle1, deltaAngle, quadrant);
      this._startAngle = adjustedAngle.start;
      this._angleValue = adjustedAngle.delta;
    } else {
      // Always use the CCW (counterclockwise) arc from line1 to line2
      if (deltaAngle < 0) {
        deltaAngle += 2 * Math.PI;
      }

      this._startAngle = angle1;
      this._angleValue = deltaAngle;

      if (otherAngle) {
        // The other angle is the remaining arc (CW direction)
        this._angleValue = deltaAngle - 2 * Math.PI;
      }
    }

    this._generatePoints();
  }

  private _distance(p1: Vec3, p2: Vec3): number {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dz = p2[2] - p1[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private _adjustForQuadrant(
    startAngle: number,
    deltaAngle: number,
    quadrant: 1 | 2 | 3 | 4,
  ): { start: number; delta: number } {
    switch (quadrant) {
      case 1:
        if (deltaAngle < 0) {
          return { start: startAngle + deltaAngle, delta: -deltaAngle };
        }
        return { start: startAngle, delta: deltaAngle };
      case 2:
        if (deltaAngle > 0) {
          return { start: startAngle, delta: deltaAngle - 2 * Math.PI };
        }
        return { start: startAngle, delta: deltaAngle };
      case 3:
        if (deltaAngle > 0) {
          return { start: startAngle + deltaAngle, delta: 2 * Math.PI - deltaAngle };
        }
        return { start: startAngle, delta: deltaAngle };
      case 4:
        if (deltaAngle < 0) {
          return { start: startAngle, delta: deltaAngle + 2 * Math.PI };
        }
        return { start: startAngle, delta: deltaAngle };
      default:
        return { start: startAngle, delta: deltaAngle };
    }
  }

  private _generatePoints(): void {
    const points: number[][] = [];
    const [cx, cy, cz] = this._vertex;
    const r = this._radius;

    const totalAngle = this._angleValue;
    const numSegments = Math.max(1, Math.ceil((Math.abs(totalAngle) / (Math.PI / 2)) * 2));
    const segmentAngle = totalAngle / numSegments;
    const kappa = (4 / 3) * Math.tan(segmentAngle / 4);

    for (let i = 0; i < numSegments; i++) {
      const theta1 = this._startAngle + i * segmentAngle;
      const theta2 = this._startAngle + (i + 1) * segmentAngle;

      const x0 = cx + r * Math.cos(theta1);
      const y0 = cy + r * Math.sin(theta1);
      const x3 = cx + r * Math.cos(theta2);
      const y3 = cy + r * Math.sin(theta2);

      const dx1 = -Math.sin(theta1);
      const dy1 = Math.cos(theta1);
      const x1 = x0 + kappa * r * dx1;
      const y1 = y0 + kappa * r * dy1;

      const dx2 = -Math.sin(theta2);
      const dy2 = Math.cos(theta2);
      const x2 = x3 - kappa * r * dx2;
      const y2 = y3 - kappa * r * dy2;

      if (i === 0) {
        points.push([x0, y0, cz]);
      }
      points.push([x1, y1, cz]);
      points.push([x2, y2, cz]);
      points.push([x3, y3, cz]);
    }

    this.setPoints3D(points);
  }

  /**
   * Get the angle value in radians
   */
  getAngleValue(): number {
    return Math.abs(this._angleValue);
  }

  /**
   * Get the angle value in degrees
   */
  getAngleValueDegrees(): number {
    return Math.abs(this._angleValue) * (180 / Math.PI);
  }

  /**
   * Get the vertex point
   */
  getVertex(): Vec3 {
    return [...this._vertex];
  }

  /**
   * Get the radius of the angle arc
   */
  getRadius(): number {
    return this._radius;
  }

  /**
   * Set the radius of the angle arc
   */
  setRadius(radius: number): this {
    this._radius = radius;
    this._generatePoints();
    return this;
  }

  /**
   * Get the midpoint of the angle arc (useful for label positioning)
   */
  getArcMidpoint(): Vec3 {
    const midAngle = this._startAngle + this._angleValue / 2;
    return [
      this._vertex[0] + this._radius * Math.cos(midAngle),
      this._vertex[1] + this._radius * Math.sin(midAngle),
      this._vertex[2],
    ];
  }

  copy(): this {
    const startAngle = this._startAngle;
    const endAngle = this._startAngle + this._angleValue;

    const point1: Vec3 = [
      this._vertex[0] + Math.cos(startAngle),
      this._vertex[1] + Math.sin(startAngle),
      this._vertex[2],
    ];
    const point2: Vec3 = [
      this._vertex[0] + Math.cos(endAngle),
      this._vertex[1] + Math.sin(endAngle),
      this._vertex[2],
    ];

    const clone = new Angle(
      { points: [point1, this._vertex, point2] },
      {
        radius: this._radius,
        color: this.color,
        strokeWidth: this.strokeWidth,
      },
    );
    return clone as this;
  }
}

/**
 * Options for creating a RightAngle
 */
export interface RightAngleOptions {
  /** Size of the square indicator. Default: 0.3 */
  size?: number;
  /** Stroke color. Default: Manim's blue (#58C4DD) */
  color?: string;
  /** Stroke width. Default: 4 */
  strokeWidth?: number;
}

/**
 * RightAngle - 90 degree angle indicator (square corner)
 *
 * Creates a square marker to indicate a right angle between two lines
 * or three points.
 *
 * @example
 * ```typescript
 * // Using two perpendicular lines
 * const line1 = new Line({ start: [0, 0, 0], end: [2, 0, 0] });
 * const line2 = new Line({ start: [0, 0, 0], end: [0, 2, 0] });
 * const rightAngle = new RightAngle({ line1, line2 });
 *
 * // Using three points
 * const rightAngle2 = new RightAngle(
 *   { points: [[2, 0, 0], [0, 0, 0], [0, 2, 0]] },
 *   { size: 0.4 }
 * );
 * ```
 */
export class RightAngle extends VMobject {
  private _vertex: Vec3;
  private _size: number;
  private _angle1: number;
  private _angle2: number;

  constructor(input: AngleInput, options: RightAngleOptions = {}) {
    super();

    const { size = 0.3, color = BLUE, strokeWidth = DEFAULT_STROKE_WIDTH } = options;

    this._size = size;
    this.color = color;
    this.fillOpacity = 0;
    this.strokeWidth = strokeWidth;

    // Extract points from input (same logic as Angle)
    let point1: Vec3;
    let vertex: Vec3;
    let point2: Vec3;

    if ('line1' in input && 'line2' in input) {
      const line1Start = input.line1.getStart();
      const line1End = input.line1.getEnd();
      const line2Start = input.line2.getStart();
      const line2End = input.line2.getEnd();

      const d1 = this._distance(line1Start, line2Start);
      const d2 = this._distance(line1Start, line2End);
      const d3 = this._distance(line1End, line2Start);
      const d4 = this._distance(line1End, line2End);

      const minDist = Math.min(d1, d2, d3, d4);

      if (minDist === d1) {
        vertex = line1Start;
        point1 = line1End;
        point2 = line2End;
      } else if (minDist === d2) {
        vertex = line1Start;
        point1 = line1End;
        point2 = line2Start;
      } else if (minDist === d3) {
        vertex = line1End;
        point1 = line1Start;
        point2 = line2End;
      } else {
        vertex = line1End;
        point1 = line1Start;
        point2 = line2Start;
      }
    } else {
      [point1, vertex, point2] = input.points;
    }

    this._vertex = [...vertex];
    this._angle1 = Math.atan2(point1[1] - vertex[1], point1[0] - vertex[0]);
    this._angle2 = Math.atan2(point2[1] - vertex[1], point2[0] - vertex[0]);

    this._generatePoints();
  }

  private _distance(p1: Vec3, p2: Vec3): number {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dz = p2[2] - p1[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private _generatePoints(): void {
    const [vx, vy, vz] = this._vertex;
    const s = this._size;

    // Calculate the two corner points along each line direction
    const corner1: Vec3 = [
      vx + s * Math.cos(this._angle1),
      vy + s * Math.sin(this._angle1),
      vz,
    ];
    const corner2: Vec3 = [
      vx + s * Math.cos(this._angle2),
      vy + s * Math.sin(this._angle2),
      vz,
    ];

    // Calculate the outer corner of the square
    const outerCorner: Vec3 = [
      vx + s * Math.cos(this._angle1) + s * Math.cos(this._angle2),
      vy + s * Math.sin(this._angle1) + s * Math.sin(this._angle2),
      vz,
    ];

    // Create L-shaped path: corner1 -> outerCorner -> corner2
    const points: number[][] = [];

    // Line from corner1 to outerCorner
    this._addLinePoints(points, corner1, outerCorner);

    // Line from outerCorner to corner2
    this._addLinePoints(points, outerCorner, corner2);

    this.setPoints3D(points);
  }

  private _addLinePoints(points: number[][], start: Vec3, end: Vec3): void {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const dz = end[2] - start[2];

    if (points.length === 0) {
      points.push([...start]);
    }

    points.push([start[0] + dx / 3, start[1] + dy / 3, start[2] + dz / 3]);
    points.push([start[0] + (2 * dx) / 3, start[1] + (2 * dy) / 3, start[2] + (2 * dz) / 3]);
    points.push([...end]);
  }

  /**
   * Get the size of the right angle indicator
   */
  getSize(): number {
    return this._size;
  }

  /**
   * Set the size of the right angle indicator
   */
  setSize(size: number): this {
    this._size = size;
    this._generatePoints();
    return this;
  }

  copy(): this {
    const clone = new RightAngle(
      { points: [[0, 0, 0], this._vertex, [0, 0, 0]] },
      { size: this._size, color: this.color, strokeWidth: this.strokeWidth },
    );
    return clone as this;
  }
}

/**
 * Options for creating an Elbow
 */
export interface ElbowOptions {
  /** Width of the elbow. Default: 1 */
  width?: number;
  /** Height of the elbow. Default: 1 */
  height?: number;
  /** Rotation angle in radians. Default: 0 */
  angle?: number;
  /** Position of the corner. Default: [0, 0, 0] */
  position?: Vec3;
  /** Stroke color. Default: Manim's blue (#58C4DD) */
  color?: string;
  /** Stroke width. Default: 4 */
  strokeWidth?: number;
}

/**
 * Elbow - An L-shaped connector
 *
 * Creates an L-shaped path that can be used as a connector
 * between mobjects.
 *
 * @example
 * ```typescript
 * // Create a basic elbow
 * const elbow = new Elbow({ width: 2, height: 1 });
 *
 * // Rotated elbow
 * const rotated = new Elbow({
 *   width: 1.5,
 *   height: 1.5,
 *   angle: Math.PI / 4
 * });
 * ```
 */
export class Elbow extends VMobject {
  private _width: number;
  private _height: number;
  private _angle: number;
  private _cornerPosition: Vec3;

  constructor(options: ElbowOptions = {}) {
    super();

    const {
      width = 1,
      height = 1,
      angle = 0,
      position = [0, 0, 0],
      color = BLUE,
      strokeWidth = DEFAULT_STROKE_WIDTH,
    } = options;

    this._width = width;
    this._height = height;
    this._angle = angle;
    this._cornerPosition = [...position];

    this.color = color;
    this.fillOpacity = 0;
    this.strokeWidth = strokeWidth;

    this._generatePoints();
  }

  private _generatePoints(): void {
    const [cx, cy, cz] = this._cornerPosition;
    const w = this._width;
    const h = this._height;
    const angle = this._angle;

    // Calculate the two end points
    const end1: Vec3 = [
      cx + w * Math.cos(angle),
      cy + w * Math.sin(angle),
      cz,
    ];
    const end2: Vec3 = [
      cx - h * Math.sin(angle),
      cy + h * Math.cos(angle),
      cz,
    ];

    // Create L-shaped path: end1 -> corner -> end2
    const points: number[][] = [];

    // Line from end1 to corner
    const dx1 = cx - end1[0];
    const dy1 = cy - end1[1];
    const dz1 = cz - end1[2];
    points.push([...end1]);
    points.push([end1[0] + dx1 / 3, end1[1] + dy1 / 3, end1[2] + dz1 / 3]);
    points.push([end1[0] + (2 * dx1) / 3, end1[1] + (2 * dy1) / 3, end1[2] + (2 * dz1) / 3]);
    points.push([cx, cy, cz]);

    // Line from corner to end2
    const dx2 = end2[0] - cx;
    const dy2 = end2[1] - cy;
    const dz2 = end2[2] - cz;
    points.push([cx + dx2 / 3, cy + dy2 / 3, cz + dz2 / 3]);
    points.push([cx + (2 * dx2) / 3, cy + (2 * dy2) / 3, cz + (2 * dz2) / 3]);
    points.push([...end2]);

    this.setPoints3D(points);
  }

  /**
   * Get the width of the elbow
   */
  getWidth(): number {
    return this._width;
  }

  /**
   * Set the width of the elbow
   */
  setWidth(width: number): this {
    this._width = width;
    this._generatePoints();
    return this;
  }

  /**
   * Get the height of the elbow
   */
  getHeight(): number {
    return this._height;
  }

  /**
   * Set the height of the elbow
   */
  setHeight(height: number): this {
    this._height = height;
    this._generatePoints();
    return this;
  }

  /**
   * Get the rotation angle of the elbow
   */
  getAngle(): number {
    return this._angle;
  }

  /**
   * Set the rotation angle of the elbow
   */
  setAngle(angle: number): this {
    this._angle = angle;
    this._generatePoints();
    return this;
  }

  /**
   * Get the corner position
   */
  getCornerPosition(): Vec3 {
    return [...this._cornerPosition];
  }

  /**
   * Set the corner position
   */
  setCornerPosition(position: Vec3): this {
    this._cornerPosition = [...position];
    this._generatePoints();
    return this;
  }

  copy(): this {
    const clone = new Elbow({
      width: this._width,
      height: this._height,
      angle: this._angle,
      color: this.color,
      strokeWidth: this.strokeWidth,
      position: this._cornerPosition,
    });
    return clone as this;
  }
}

/**
 * Options for creating a TangentLine
 */
export interface TangentLineOptions {
  /** Parameter t (0-1) for where to place the tangent on the curve. Default: 0.5 */
  t?: number;
  /** Length of the tangent line. Default: 2 */
  length?: number;
  /** Stroke color. Default: Manim's blue (#58C4DD) */
  color?: string;
  /** Stroke width. Default: 4 */
  strokeWidth?: number;
}

/**
 * TangentLine - Tangent line to a curve at a specific point
 *
 * Creates a line tangent to a VMobject at the given parameter t (0-1).
 *
 * @example
 * // Create a tangent line to a circle at t=0.25
 * const circle = new Circle({ radius: 2 });
 * const tangent = new TangentLine(circle, { t: 0.25, length: 3 });
 */
export class TangentLine extends VMobject {
  private _vmobject: VMobject;
  private _t: number;
  private _length: number;
  private _tangentPoint: Vec3;
  private _tangentDirection: Vec3;

  constructor(vmobject: VMobject, options: TangentLineOptions = {}) {
    super();

    const {
      t = 0.5,
      length = 2,
      color = BLUE,
      strokeWidth = DEFAULT_STROKE_WIDTH,
    } = options;

    this._vmobject = vmobject;
    this._t = Math.max(0, Math.min(1, t));
    this._length = length;
    this.color = color;
    this.fillOpacity = 0;
    this.strokeWidth = strokeWidth;

    this._tangentPoint = [0, 0, 0];
    this._tangentDirection = [1, 0, 0];

    this._generatePoints();
  }

  private _generatePoints(): void {
    const points3D = this._vmobject.points3D;
    if (points3D.length < 2) {
      this._tangentPoint = [0, 0, 0];
      this._tangentDirection = [1, 0, 0];
      this._createLinePoints();
      return;
    }

    // Get the point on the curve at parameter t (approximate)
    const idx = Math.floor(this._t * (points3D.length - 1));
    this._tangentPoint = [...points3D[idx]] as Vec3;

    // Calculate tangent direction using adjacent points
    const prevIdx = Math.max(0, idx - 1);
    const nextIdx = Math.min(points3D.length - 1, idx + 1);
    const p1 = points3D[prevIdx];
    const p2 = points3D[nextIdx];

    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dz = p2[2] - p1[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (len > 0) {
      this._tangentDirection = [dx / len, dy / len, dz / len];
    } else {
      this._tangentDirection = [1, 0, 0];
    }

    this._createLinePoints();
  }

  private _createLinePoints(): void {
    const halfLength = this._length / 2;

    const start: Vec3 = [
      this._tangentPoint[0] - halfLength * this._tangentDirection[0],
      this._tangentPoint[1] - halfLength * this._tangentDirection[1],
      this._tangentPoint[2] - halfLength * this._tangentDirection[2],
    ];

    const end: Vec3 = [
      this._tangentPoint[0] + halfLength * this._tangentDirection[0],
      this._tangentPoint[1] + halfLength * this._tangentDirection[1],
      this._tangentPoint[2] + halfLength * this._tangentDirection[2],
    ];

    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const dz = end[2] - start[2];

    this.setPoints3D([
      [...start],
      [start[0] + dx / 3, start[1] + dy / 3, start[2] + dz / 3],
      [start[0] + (2 * dx) / 3, start[1] + (2 * dy) / 3, start[2] + (2 * dz) / 3],
      [...end],
    ]);
  }

  /**
   * Get the parameter t
   */
  getT(): number {
    return this._t;
  }

  /**
   * Set the parameter t and regenerate the tangent
   */
  setT(t: number): this {
    this._t = Math.max(0, Math.min(1, t));
    this._generatePoints();
    return this;
  }

  /**
   * Get the length of the tangent line
   */
  getLength(): number {
    return this._length;
  }

  /**
   * Set the length of the tangent line
   */
  setLength(length: number): this {
    this._length = length;
    this._generatePoints();
    return this;
  }

  /**
   * Get the point where the tangent touches the curve
   */
  getTangentPoint(): Vec3 {
    return [...this._tangentPoint];
  }

  /**
   * Get the tangent direction (unit vector)
   */
  getTangentDirection(): Vec3 {
    return [...this._tangentDirection];
  }

  copy(): this {
    const clone = new TangentLine(this._vmobject, {
      t: this._t,
      length: this._length,
      color: this.color,
      strokeWidth: this.strokeWidth,
    });
    return clone as this;
  }
}
