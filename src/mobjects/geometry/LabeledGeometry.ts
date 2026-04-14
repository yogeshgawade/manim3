import { Group } from '../../core/Group';
import { VMobject } from '../../core/VMobject';
import type { Vec3 } from '../../core/types';
import { Line, type LineOptions } from './Line';
import { Arrow, type ArrowOptions } from './Arrow';
import { Dot, type DotOptions } from './Dot';
import { Circle } from './Circle';
import { Polygram } from './Polygram';
import { Rectangle } from './Rectangle';
import { BLUE, WHITE, YELLOW, BLACK } from '../../constants/colors';

/**
 * Direction constants for label positioning
 */
export type LabelDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'UL' | 'UR' | 'DL' | 'DR';

/**
 * Convert direction string to vector
 */
function directionToVector(direction: LabelDirection): Vec3 {
  switch (direction) {
    case 'UP':
      return [0, 1, 0];
    case 'DOWN':
      return [0, -1, 0];
    case 'LEFT':
      return [-1, 0, 0];
    case 'RIGHT':
      return [1, 0, 0];
    case 'UL':
      return [-0.707, 0.707, 0];
    case 'UR':
      return [0.707, 0.707, 0];
    case 'DL':
      return [-0.707, -0.707, 0];
    case 'DR':
      return [0.707, -0.707, 0];
    default:
      throw new Error(`Unexpected direction: ${direction}`);
  }
}

/**
 * Options for creating a LabeledLine
 */
export interface LabeledLineOptions extends Omit<LineOptions, 'start' | 'end'> {
  /** Start point of the line. Default: [0, 0, 0] */
  start?: Vec3;
  /** End point of the line. Default: [1, 0, 0] */
  end?: Vec3;
  /** Text label to display (simple string). Default: '' */
  label?: string;
  /** Position of label along line (0 = start, 0.5 = midpoint, 1 = end). Default: 0.5 */
  labelPosition?: number;
  /** Offset distance from the line. Default: 0.2 */
  labelOffset?: number;
  /** Label color. Default: same as line color */
  labelColor?: string;
}

/**
 * LabeledLine - A line with a simple text label indicator
 *
 * Creates a line with a visual marker (dot) and optional label position indicator.
 * Note: Full text labels require the text mobject module.
 *
 * @example
 * ```typescript
 * // Create a labeled line
 * const line = new LabeledLine({
 *   start: [-2, 0, 0],
 *   end: [2, 0, 0],
 *   label: 'A',
 *   labelPosition: 0.5
 * });
 * ```
 */
export class LabeledLine extends Group {
  private _line: Line;
  private _label: string;
  private _labelPosition: number;
  private _labelOffset: number;
  private _marker: Dot | null = null;

  constructor(options: LabeledLineOptions = {}) {
    super();

    const {
      start = [0, 0, 0],
      end = [1, 0, 0],
      label = '',
      labelPosition = 0.5,
      labelOffset = 0.2,
      labelColor,
      color = BLUE,
      strokeWidth,
    } = options;

    this._label = label;
    this._labelPosition = labelPosition;
    this._labelOffset = labelOffset;

    // Create the line
    this._line = new Line({
      start,
      end,
      color,
      strokeWidth,
    });
    this.add(this._line);

    // Create a marker dot at the label position if label is provided
    if (label) {
      const markerPos = this._getLabelPosition();
      this._marker = new Dot({
        point: markerPos,
        radius: 0.05,
        color: labelColor ?? color,
      });
      this.add(this._marker);
    }
  }

  private _getLabelPosition(): Vec3 {
    const start = this._line.getStart();
    const end = this._line.getEnd();
    const t = this._labelPosition;

    // Calculate base position along the line
    const baseX = start[0] + (end[0] - start[0]) * t;
    const baseY = start[1] + (end[1] - start[1]) * t;
    const baseZ = start[2] + (end[2] - start[2]) * t;

    // Calculate perpendicular offset
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) {
      return [baseX, baseY + this._labelOffset, baseZ];
    }

    // Perpendicular direction (-dy, dx)
    const perpX = -dy / len * this._labelOffset;
    const perpY = dx / len * this._labelOffset;

    return [baseX + perpX, baseY + perpY, baseZ];
  }

  /**
   * Get the label string
   */
  getLabel(): string {
    return this._label;
  }

  /**
   * Set the label string
   */
  setLabel(label: string): this {
    this._label = label;
    // Update marker
    if (this._marker) {
      this.remove(this._marker);
    }
    if (label) {
      const markerPos = this._getLabelPosition();
      this._marker = new Dot({
        point: markerPos,
        radius: 0.05,
        color: this._line.color,
      });
      this.add(this._marker);
    }
    return this;
  }

  /**
   * Get the label position along the line (0-1)
   */
  getLabelPosition(): number {
    return this._labelPosition;
  }

  /**
   * Set the label position along the line
   */
  setLabelPosition(position: number): this {
    this._labelPosition = position;
    if (this._marker) {
      this._marker.moveTo(this._getLabelPosition());
    }
    return this;
  }

  /**
   * Get the underlying line
   */
  getLine(): Line {
    return this._line;
  }

  copy(): this {
    const clone = new LabeledLine({
      start: this._line.getStart(),
      end: this._line.getEnd(),
      label: this._label,
      labelPosition: this._labelPosition,
      labelOffset: this._labelOffset,
      color: this._line.color,
      strokeWidth: this._line.strokeWidth,
    });
    return clone as this;
  }
}

/**
 * Options for creating a LabeledArrow
 */
export interface LabeledArrowOptions extends Omit<ArrowOptions, 'start' | 'end'> {
  /** Start point. Default: [0, 0, 0] */
  start?: Vec3;
  /** End point. Default: [1, 0, 0] */
  end?: Vec3;
  /** Label text. Default: '' */
  label?: string;
  /** Position along arrow (0-1). Default: 0.5 */
  labelPosition?: number;
  /** Offset from arrow. Default: 0.2 */
  labelOffset?: number;
}

/**
 * LabeledArrow - An arrow with a label marker
 */
export class LabeledArrow extends Group {
  private _arrow: Arrow;
  private _label: string;
  private _labelPosition: number;
  private _labelOffset: number;
  private _marker: Dot | null = null;

  constructor(options: LabeledArrowOptions = {}) {
    super();

    const {
      start = [0, 0, 0],
      end = [1, 0, 0],
      label = '',
      labelPosition = 0.5,
      labelOffset = 0.2,
      ...arrowOptions
    } = options;

    this._label = label;
    this._labelPosition = labelPosition;
    this._labelOffset = labelOffset;

    this._arrow = new Arrow({
      start,
      end,
      ...arrowOptions,
    });
    this.add(this._arrow);

    if (label) {
      const markerPos = this._getLabelPosition();
      this._marker = new Dot({
        point: markerPos,
        radius: 0.05,
        color: this._arrow.color,
      });
      this.add(this._marker);
    }
  }

  private _getLabelPosition(): Vec3 {
    const start = this._arrow.getStart();
    const end = this._arrow.getEnd();
    const t = this._labelPosition;

    const baseX = start[0] + (end[0] - start[0]) * t;
    const baseY = start[1] + (end[1] - start[1]) * t;
    const baseZ = start[2] + (end[2] - start[2]) * t;

    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) {
      return [baseX, baseY + this._labelOffset, baseZ];
    }

    const perpX = -dy / len * this._labelOffset;
    const perpY = dx / len * this._labelOffset;

    return [baseX + perpX, baseY + perpY, baseZ];
  }

  getLabel(): string { return this._label; }
  setLabel(label: string): this {
    this._label = label;
    if (this._marker) {
      this.remove(this._marker);
    }
    if (label) {
      this._marker = new Dot({
        point: this._getLabelPosition(),
        radius: 0.05,
        color: this._arrow.color,
      });
      this.add(this._marker);
    }
    return this;
  }

  getArrow(): Arrow { return this._arrow; }

  copy(): this {
    return new LabeledArrow({
      start: this._arrow.getStart(),
      end: this._arrow.getEnd(),
      label: this._label,
      labelPosition: this._labelPosition,
      labelOffset: this._labelOffset,
    }) as this;
  }
}

/**
 * Options for creating a LabeledDot
 */
export interface LabeledDotOptions extends Omit<DotOptions, 'position'> {
  /** Position. Default: [0, 0, 0] */
  position?: Vec3;
  /** Label text. Default: '' */
  label?: string;
  /** Label direction. Default: 'UP' */
  labelDirection?: LabelDirection;
  /** Label offset distance. Default: 0.3 */
  labelOffset?: number;
}

/**
 * LabeledDot - A dot with a label marker
 */
export class LabeledDot extends Group {
  private _dot: Dot;
  private _label: string;
  private _labelDirection: LabelDirection;
  private _labelOffset: number;
  private _marker: Dot | null = null;

  constructor(options: LabeledDotOptions = {}) {
    super();

    const {
      point = [0, 0, 0],
      label = '',
      labelDirection = 'UP',
      labelOffset = 0.3,
      ...dotOptions
    } = options;

    this._label = label;
    this._labelDirection = labelDirection;
    this._labelOffset = labelOffset;

    this._dot = new Dot({
      point,
      ...dotOptions,
    });
    this.add(this._dot);

    if (label) {
      const markerPos = this._getLabelPosition();
      this._marker = new Dot({
        point: markerPos,
        radius: 0.03,
        color: YELLOW,
      });
      this.add(this._marker);
    }
  }

  private _getLabelPosition(): Vec3 {
    const center = this._dot.getCenter();
    const dir = directionToVector(this._labelDirection);
    return [
      center[0] + dir[0] * this._labelOffset,
      center[1] + dir[1] * this._labelOffset,
      center[2] + dir[2] * this._labelOffset,
    ];
  }

  getLabel(): string { return this._label; }
  setLabel(label: string): this {
    this._label = label;
    if (this._marker) {
      this.remove(this._marker);
    }
    if (label) {
      this._marker = new Dot({
        point: this._getLabelPosition(),
        radius: 0.03,
        color: YELLOW,
      });
      this.add(this._marker);
    }
    return this;
  }

  getDot(): Dot { return this._dot; }

  copy(): this {
    return new LabeledDot({
      point: this._dot.getCenter(),
      label: this._label,
      labelDirection: this._labelDirection,
      labelOffset: this._labelOffset,
    }) as this;
  }
}

/**
 * Options for BackgroundRectangle
 */
export interface BackgroundRectangleOptions {
  /** Padding around the target. Default: 0.2 */
  buff?: number;
  /** Fill color. Default: BLACK */
  color?: string;
  /** Fill opacity. Default: 0.75 */
  fillOpacity?: number;
  /** Stroke width. Default: 0 */
  strokeWidth?: number;
}

/**
 * BackgroundRectangle - Rectangle that appears behind a mobject
 *
 * Creates a rectangle sized to fit around a target mobject with padding.
 * Useful for highlighting content.
 *
 * @example
 * ```typescript
 * const circle = new Circle({ radius: 1 });
 * const bg = new BackgroundRectangle(circle, { buff: 0.3, fillOpacity: 0.8 });
 * scene.add(bg, circle);
 * ```
 */
export class BackgroundRectangle extends Rectangle {
  private _target: VMobject | null = null;
  private _buff: number;

  constructor(target?: VMobject, options: BackgroundRectangleOptions = {}) {
    const {
      buff = 0.2,
      color = BLACK,
      fillOpacity = 0.75,
      strokeWidth = 0,
    } = options;

    // Calculate dimensions from target if provided
    let width = 2;
    let height = 1;
    let center: Vec3 = [0, 0, 0];

    if (target) {
      const bounds = target.points3D;
      if (bounds.length > 0) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (const p of bounds) {
          minX = Math.min(minX, p[0]);
          maxX = Math.max(maxX, p[0]);
          minY = Math.min(minY, p[1]);
          maxY = Math.max(maxY, p[1]);
        }
        width = (maxX - minX) + 2 * buff;
        height = (maxY - minY) + 2 * buff;
        center = [(minX + maxX) / 2, (minY + maxY) / 2, 0];
      }
    }

    super({
      width,
      height,
      color,
      fillOpacity,
      strokeWidth,
    });

    this.position = center;
    this._target = target || null;
    this._buff = buff;
  }

  /**
   * Get the padding/buffer size
   */
  getBuff(): number {
    return this._buff;
  }

  /**
   * Set the padding/buffer size
   */
  setBuff(buff: number): this {
    this._buff = buff;
    // Would need to regenerate based on target
    return this;
  }

  copy(): this {
    return new BackgroundRectangle(this._target || undefined, {
      buff: this._buff,
      color: this.color,
      fillOpacity: this.fillOpacity,
      strokeWidth: this.strokeWidth,
    }) as this;
  }
}
