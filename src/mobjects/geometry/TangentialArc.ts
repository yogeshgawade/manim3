import { VMobject } from '../../core/VMobject';
import type { Vec3 } from '../../core/types';
import { Arc } from './Arc';
import { BLUE, DEFAULT_STROKE_WIDTH } from '../../constants/colors';

/**
 * Options for creating a TangentialArc
 */
export interface TangentialArcOptions {
  /** Start point of the arc. Default: [0, 0, 0] */
  start?: Vec3;
  /** Direction at the start point (tangent direction). Default: [1, 0, 0] */
  direction?: Vec3;
  /** Radius of the arc. Default: 1 */
  radius?: number;
  /** Arc angle in radians. Default: PI/2 */
  angle?: number;
  /** Stroke color as CSS color string. Default: Manim's blue (#58C4DD) */
  color?: string;
  /** Stroke width in pixels. Default: 4 (Manim's default) */
  strokeWidth?: number;
  /** Number of Bezier segments for approximation. Default: 8 */
  numComponents?: number;
}

/**
 * TangentialArc - An arc that is tangent to a given direction at its start
 *
 * Creates an arc that starts tangent to a given direction.
 *
 * @example
 * ```typescript
 * // Create an arc tangent to the x-axis
 * const tangentArc = new TangentialArc({
 *   start: [0, 0, 0],
 *   direction: [1, 0, 0],
 *   radius: 1,
 *   angle: Math.PI / 2
 * });
 *
 * // Create an arc tangent to a diagonal
 * const diagonalArc = new TangentialArc({
 *   start: [0, 0, 0],
 *   direction: [1, 1, 0],
 *   radius: 2,
 *   angle: Math.PI / 3
 * });
 * ```
 */
export class TangentialArc extends Arc {
  private _direction: Vec3;
  private _startPoint: Vec3;

  constructor(options: TangentialArcOptions = {}) {
    const {
      start = [0, 0, 0],
      direction = [1, 0, 0],
      radius = 1,
      angle = Math.PI / 2,
      color = BLUE,
      strokeWidth = DEFAULT_STROKE_WIDTH,
      numComponents = 8,
    } = options;

    // Normalize the direction
    const dirLen = Math.sqrt(
      direction[0] * direction[0] + direction[1] * direction[1] + direction[2] * direction[2],
    );
    const normDir: Vec3 = [
      direction[0] / dirLen,
      direction[1] / dirLen,
      direction[2] / dirLen,
    ];

    // Calculate the center perpendicular to the direction
    // For positive angle, center is to the left of the direction
    // For negative angle, center is to the right
    const sign = angle > 0 ? 1 : -1;
    const perpX = -sign * normDir[1];
    const perpY = sign * normDir[0];

    const centerX = start[0] + radius * perpX;
    const centerY = start[1] + radius * perpY;

    // Calculate the start angle on this circle
    const startAngle = Math.atan2(start[1] - centerY, start[0] - centerX);

    super({
      radius,
      startAngle,
      endAngle: startAngle + angle,
      color,
      strokeWidth,
      numSegments: numComponents,
    });

    this._direction = [...normDir];
    this._startPoint = [...start];
  }

  /**
   * Get the tangent direction at the start
   */
  getDirection(): Vec3 {
    return [...this._direction];
  }

  /**
   * Get the start point
   */
  getStartPoint(): Vec3 {
    return [...this._startPoint];
  }

  /**
   * Create a copy of this TangentialArc
   */
  copy(): this {
    const clone = new TangentialArc({
      start: this._startPoint,
      direction: this._direction,
      radius: this.getRadius(),
      angle: this.getEndAngle() - this.getStartAngle(),
      color: this.color,
      strokeWidth: this.strokeWidth,
      numComponents: 8,
    });
    return clone as this;
  }
}
