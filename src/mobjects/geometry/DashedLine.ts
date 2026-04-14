import { VMobject } from '../../core/VMobject';
import { Group } from '../../core/Group';
import type { Vec3 } from '../../core/types';
import { Line } from './Line';
import { BLUE, DEFAULT_STROKE_WIDTH } from '../../constants/colors';

/**
 * Options for creating a DashedLine
 */
export interface DashedLineOptions {
  /** Start point of the line. Default: [0, 0, 0] */
  start?: Vec3;
  /** End point of the line. Default: [1, 0, 0] */
  end?: Vec3;
  /** Length of each dash. Default: 0.1 */
  dashLength?: number;
  /** Ratio of dash length to total (dash + gap). Default: 0.5 */
  dashRatio?: number;
  /** Stroke color as CSS color string. Default: Manim's blue (#58C4DD) */
  color?: string;
  /** Stroke width in pixels. Default: 4 (Manim's default) */
  strokeWidth?: number;
}

/**
 * DashedLine - A dashed line segment VMobject
 *
 * Creates a line made up of multiple small line segments with gaps between them.
 * The dashes are stored as children for proper rendering.
 *
 * @example
 * ```typescript
 * // Create a horizontal dashed line
 * const dashed = new DashedLine();
 *
 * // Create a dashed diagonal with custom dash length
 * const diagonal = new DashedLine({
 *   start: [-1, -1, 0],
 *   end: [1, 1, 0],
 *   dashLength: 0.2,
 *   dashRatio: 0.6
 * });
 * ```
 */
export class DashedLine extends Group {
  private _start: Vec3;
  private _end: Vec3;
  private _dashLength: number;
  private _dashRatio: number;
  private _dashes: Line[] = [];
  private _color: string;
  private _strokeWidth: number;

  constructor(options: DashedLineOptions = {}) {
    super();

    const {
      start = [0, 0, 0],
      end = [1, 0, 0],
      dashLength = 0.1,
      dashRatio = 0.5,
      color = BLUE,
      strokeWidth = DEFAULT_STROKE_WIDTH,
    } = options;

    this._start = [...start];
    this._end = [...end];
    this._dashLength = dashLength;
    this._dashRatio = Math.max(0, Math.min(1, dashRatio));
    this._color = color;
    this._strokeWidth = strokeWidth;

    this._generateDashes();
  }

  /**
   * Generate the dash segments along the line
   */
  private _generateDashes(): void {
    // Remove old dashes
    this._dashes = [];
    this.children = [];

    // Calculate line properties
    const dx = this._end[0] - this._start[0];
    const dy = this._end[1] - this._start[1];
    const dz = this._end[2] - this._start[2];
    const totalLength = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (totalLength < 1e-10) {
      // Degenerate case: start and end are the same
      return;
    }

    // Direction vector (normalized)
    const dirX = dx / totalLength;
    const dirY = dy / totalLength;
    const dirZ = dz / totalLength;

    // Calculate dash and gap lengths
    const dashLen = this._dashLength * this._dashRatio;
    const gapLen = this._dashLength * (1 - this._dashRatio);
    const cycleLen = dashLen + gapLen;

    // Generate dashes along the line
    let currentPos = 0;
    while (currentPos < totalLength) {
      const dashStart = currentPos;
      const dashEnd = Math.min(currentPos + dashLen, totalLength);

      if (dashEnd > dashStart) {
        const startPoint: Vec3 = [
          this._start[0] + dirX * dashStart,
          this._start[1] + dirY * dashStart,
          this._start[2] + dirZ * dashStart,
        ];
        const endPoint: Vec3 = [
          this._start[0] + dirX * dashEnd,
          this._start[1] + dirY * dashEnd,
          this._start[2] + dirZ * dashEnd,
        ];

        const dash = new Line({
          start: startPoint,
          end: endPoint,
          color: this._color,
          strokeWidth: this._strokeWidth,
        });

        this._dashes.push(dash);
        this.add(dash);
      }

      currentPos += cycleLen;
    }
  }

  /**
   * Get the individual dash segments
   */
  getDashes(): Line[] {
    return [...this._dashes];
  }

  /**
   * Get the start point of the dashed line
   */
  getStart(): Vec3 {
    return [...this._start];
  }

  /**
   * Set the start point of the dashed line
   */
  setStart(point: Vec3): this {
    this._start = [...point];
    this._generateDashes();
    return this;
  }

  /**
   * Get the end point of the dashed line
   */
  getEnd(): Vec3 {
    return [...this._end];
  }

  /**
   * Set the end point of the dashed line
   */
  setEnd(point: Vec3): this {
    this._end = [...point];
    this._generateDashes();
    return this;
  }

  /**
   * Get the dash length
   */
  getDashLength(): number {
    return this._dashLength;
  }

  /**
   * Set the dash length
   */
  setDashLength(length: number): this {
    this._dashLength = length;
    this._generateDashes();
    return this;
  }

  /**
   * Get the dash ratio
   */
  getDashRatio(): number {
    return this._dashRatio;
  }

  /**
   * Set the dash ratio
   */
  setDashRatio(ratio: number): this {
    this._dashRatio = Math.max(0, Math.min(1, ratio));
    this._generateDashes();
    return this;
  }

  /**
   * Get the total length of the line
   */
  getLength(): number {
    const dx = this._end[0] - this._start[0];
    const dy = this._end[1] - this._start[1];
    const dz = this._end[2] - this._start[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Create a copy of this DashedLine
   */
  copy(): this {
    const clone = new DashedLine({
      start: this._start,
      end: this._end,
      dashLength: this._dashLength,
      dashRatio: this._dashRatio,
      color: this._color,
      strokeWidth: this._strokeWidth,
    });
    return clone as this;
  }
}
