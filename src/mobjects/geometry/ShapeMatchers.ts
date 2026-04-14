import { VMobject } from '../../core/VMobject';
import { Group } from '../../core/Group';
import type { Vec3 } from '../../core/types';
import { Rectangle } from './Rectangle';
import { Line } from './Line';
import { Dot } from './Dot';
import { BLACK, RED, DEFAULT_STROKE_WIDTH } from '../../constants/colors';

/**
 * Options for creating a BackgroundRectangle
 */
export interface BackgroundRectangleOptions {
  /** Padding around the mobject. Default: 0.2 */
  buff?: number;
  /** Background fill color. Default: BLACK (#000000) */
  color?: string;
  /** Fill opacity. Default: 0.75 */
  fillOpacity?: number;
  /** Stroke width. Default: 0 (no stroke) */
  strokeWidth?: number;
}

/**
 * BackgroundRectangle - A filled rectangle that appears behind a mobject
 *
 * Creates a rectangle sized to the bounding box of a mobject plus padding.
 * Useful for highlighting text or creating backgrounds for formulas.
 *
 * @example
 * ```typescript
 * const circle = new Circle({ radius: 1 });
 * const bg = new BackgroundRectangle(circle, { fillOpacity: 0.8 });
 * scene.add(bg, circle);
 * ```
 */
export class BackgroundRectangle extends Rectangle {
  private _target: VMobject | null = null;
  private _buff: number;

  constructor(mobject?: VMobject, options: BackgroundRectangleOptions = {}) {
    const { buff = 0.2, color = BLACK, fillOpacity = 0.75, strokeWidth = 0 } = options;

    // Calculate dimensions from mobject bounding box
    let width = 2;
    let height = 1;
    let center: Vec3 = [0, 0, 0];

    if (mobject) {
      const bounds = mobject.points3D;
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
    this._target = mobject || null;
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
    // Update dimensions based on target
    if (this._target) {
      const bounds = this._target.points3D;
      if (bounds.length > 0) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (const p of bounds) {
          minX = Math.min(minX, p[0]);
          maxX = Math.max(maxX, p[0]);
          minY = Math.min(minY, p[1]);
          maxY = Math.max(maxY, p[1]);
        }
        const width = (maxX - minX) + 2 * buff;
        const height = (maxY - minY) + 2 * buff;
        // Note: Would need to add setWidth/setHeight to Rectangle
      }
    }
    return this;
  }

  /**
   * Get the target mobject
   */
  getTarget(): VMobject | null {
    return this._target;
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

/**
 * Options for creating a Cross
 */
export interface CrossOptions {
  /** Size of the cross. Default: 0.5 */
  size?: number;
  /** Stroke color. Default: RED */
  color?: string;
  /** Stroke width. Default: 4 */
  strokeWidth?: number;
}

/**
 * Cross - An X-shaped marker
 *
 * Creates an X-shaped cross, useful for indicating
 * deletion or marking specific points.
 *
 * @example
 * ```typescript
 * const cross = new Cross({ size: 0.3, color: '#ff0000' });
 * cross.moveTo([2, 1, 0]);
 * ```
 */
export class Cross extends Group {
  private _line1: Line;
  private _line2: Line;
  private _size: number;

  constructor(options: CrossOptions = {}) {
    super();

    const { size = 0.5, color = RED, strokeWidth = DEFAULT_STROKE_WIDTH } = options;

    this._size = size;

    const half = size / 2;

    this._line1 = new Line({
      start: [-half, -half, 0],
      end: [half, half, 0],
      color,
      strokeWidth,
    });

    this._line2 = new Line({
      start: [-half, half, 0],
      end: [half, -half, 0],
      color,
      strokeWidth,
    });

    this.add(this._line1, this._line2);
  }

  /**
   * Get the size of the cross
   */
  getSize(): number {
    return this._size;
  }

  /**
   * Set the size of the cross
   */
  setSize(size: number): this {
    this._size = size;
    const half = size / 2;

    this._line1.setStart([-half, -half, 0]);
    this._line1.setEnd([half, half, 0]);

    this._line2.setStart([-half, half, 0]);
    this._line2.setEnd([half, -half, 0]);

    return this;
  }

  copy(): this {
    return new Cross({
      size: this._size,
      color: this._line1.color,
      strokeWidth: this._line1.strokeWidth,
    }) as this;
  }
}

/**
 * Options for creating a SurroundingRectangle
 */
export interface SurroundingRectangleOptions {
  /** Padding around the target. Default: 0.2 */
  buff?: number;
  /** Stroke color. Default: YELLOW */
  color?: string;
  /** Stroke width. Default: 2 */
  strokeWidth?: number;
  /** Fill opacity. Default: 0 */
  fillOpacity?: number;
}

/**
 * SurroundingRectangle - A rectangle that surrounds a mobject
 *
 * Creates a rectangle that tightly fits around a target mobject
 * with optional padding. Unlike BackgroundRectangle, this is
 * typically drawn as an outline.
 *
 * @example
 * ```typescript
 * const circle = new Circle({ radius: 1 });
 * const surround = new SurroundingRectangle(circle, { color: '#ffff00' });
 * scene.add(circle, surround);
 * ```
 */
export class SurroundingRectangle extends Rectangle {
  private _target: VMobject | null = null;
  private _buff: number;

  constructor(mobject?: VMobject, options: SurroundingRectangleOptions = {}) {
    const {
      buff = 0.2,
      color = '#ffff00',
      strokeWidth = 2,
      fillOpacity = 0,
    } = options;

    // Calculate dimensions from mobject
    let width = 2;
    let height = 1;
    let center: Vec3 = [0, 0, 0];

    if (mobject) {
      const bounds = mobject.points3D;
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
    this._target = mobject || null;
    this._buff = buff;
  }

  /**
   * Get the padding/buffer size
   */
  getBuff(): number {
    return this._buff;
  }

  /**
   * Get the target mobject
   */
  getTarget(): VMobject | null {
    return this._target;
  }

  copy(): this {
    return new SurroundingRectangle(this._target || undefined, {
      buff: this._buff,
      color: this.color,
      strokeWidth: this.strokeWidth,
      fillOpacity: this.fillOpacity,
    }) as this;
  }
}

/**
 * Grid matcher options
 */
export interface GridOptions {
  /** Width of the grid. Default: 10 */
  width?: number;
  /** Height of the grid. Default: 6 */
  height?: number;
  /** Number of columns. Default: 10 */
  numCols?: number;
  /** Number of rows. Default: 6 */
  numRows?: number;
  /** Line color. Default: '#666666' */
  color?: string;
  /** Line width. Default: 1 */
  strokeWidth?: number;
}

/**
 * Grid - A coordinate grid
 *
 * Creates a rectangular grid of lines, useful for backgrounds
 * or coordinate systems.
 *
 * @example
 * ```typescript
 * const grid = new Grid({
 *   width: 10,
 *   height: 10,
 *   numCols: 10,
 *   numRows: 10,
 *   color: '#444444'
 * });
 * ```
 */
export class Grid extends Group {
  private _width: number;
  private _height: number;
  private _numCols: number;
  private _numRows: number;
  private _lines: Line[] = [];

  constructor(options: GridOptions = {}) {
    super();

    const {
      width = 10,
      height = 6,
      numCols = 10,
      numRows = 6,
      color = '#666666',
      strokeWidth = 1,
    } = options;

    this._width = width;
    this._height = height;
    this._numCols = numCols;
    this._numRows = numRows;

    this._generateGrid(color, strokeWidth);
  }

  private _generateGrid(color: string, strokeWidth: number): void {
    const halfW = this._width / 2;
    const halfH = this._height / 2;

    // Vertical lines
    for (let i = 0; i <= this._numCols; i++) {
      const x = -halfW + (this._width / this._numCols) * i;
      const line = new Line({
        start: [x, -halfH, 0],
        end: [x, halfH, 0],
        color,
        strokeWidth,
      });
      this._lines.push(line);
      this.add(line);
    }

    // Horizontal lines
    for (let i = 0; i <= this._numRows; i++) {
      const y = -halfH + (this._height / this._numRows) * i;
      const line = new Line({
        start: [-halfW, y, 0],
        end: [halfW, y, 0],
        color,
        strokeWidth,
      });
      this._lines.push(line);
      this.add(line);
    }
  }

  /**
   * Get the grid width
   */
  getGridWidth(): number {
    return this._width;
  }

  /**
   * Get the grid height
   */
  getGridHeight(): number {
    return this._height;
  }

  /**
   * Get the number of columns
   */
  getNumCols(): number {
    return this._numCols;
  }

  /**
   * Get the number of rows
   */
  getNumRows(): number {
    return this._numRows;
  }

  /**
   * Get all grid lines
   */
  getLines(): Line[] {
    return [...this._lines];
  }

  copy(): this {
    return new Grid({
      width: this._width,
      height: this._height,
      numCols: this._numCols,
      numRows: this._numRows,
    }) as this;
  }
}
