/**
 * Matrix - Display mathematical matrices with brackets
 *
 * This module provides matrix mobject classes for displaying 2D arrays
 * of values with configurable brackets and styling.
 */

import { Mobject } from '../../core/Mobject';
import { VMobject } from '../../core/VMobject';
import { VGroup } from '../../core/VGroup';
import { MathTex } from '../text/MathTex';
import { DecimalNumber } from '../text/DecimalNumber';
import { Text } from '../text/Text';
import { WHITE } from '../../constants/colors';
import { DEFAULT_STROKE_WIDTH } from '../../constants/colors';
import type { Vec3 } from '../../core/types';

/**
 * Bracket type options for matrices
 */
export type BracketType = '[]' | '()' | '||' | '{}' | '<>' | '';

/**
 * Alignment options for elements within cells
 */
export type ElementAlignment = 'left' | 'center' | 'right';

/**
 * Options for creating a Matrix mobject
 */
export interface MatrixOptions {
  /** Type of brackets to use. Default: '[]' */
  bracketType?: BracketType;
  /** Vertical buffer between rows. Default: 0.8 */
  vBuff?: number;
  /** Horizontal buffer between columns. Default: 1.3 */
  hBuff?: number;
  /** Alignment of elements within cells. Default: 'center' */
  elementAlignment?: ElementAlignment;
  /** Bracket color. Default: WHITE */
  bracketColor?: string;
  /** Bracket stroke width. Default: DEFAULT_STROKE_WIDTH */
  bracketStrokeWidth?: number;
  /** Element color for auto-generated MathTex. Default: WHITE */
  elementColor?: string;
  /** Font size for elements. Default: 48 */
  fontSize?: number;
  /** Position. Default: [0, 0, 0] */
  position?: Vec3;
}

/**
 * Matrix - A mobject for displaying mathematical matrices
 *
 * Displays a 2D array of values with configurable brackets.
 * Entries can be strings, numbers, or Mobject instances.
 *
 * @example
 * ```typescript
 * // Create a simple 2x2 matrix
 * const matrix = new Matrix([
 *   [1, 2],
 *   [3, 4]
 * ]);
 *
 * // Create a matrix with parentheses
 * const parenMatrix = new Matrix([
 *   ['a', 'b'],
 *   ['c', 'd']
 * ], { bracketType: '()' });
 *
 * // Create a determinant (vertical bars)
 * const det = new Matrix([
 *   [1, 0],
 *   [0, 1]
 * ], { bracketType: '||' });
 * ```
 */
export class Matrix extends VGroup {
  protected _data: (string | number | Mobject)[][];
  protected _bracketType: BracketType;
  protected _vBuff: number;
  protected _hBuff: number;
  protected _elementAlignment: ElementAlignment;
  protected _bracketColor: string;
  protected _bracketStrokeWidth: number;
  protected _elementColor: string;
  protected _fontSize: number;

  /** Grid of entry mobjects */
  protected _entries: Mobject[][] = [];

  /** Rows as VGroups */
  protected _rows: VGroup[] = [];

  /** Columns as VGroups */
  protected _columns: VGroup[] = [];

  /** Left bracket mobject */
  protected _leftBracket: VMobject | null = null;

  /** Right bracket mobject */
  protected _rightBracket: VMobject | null = null;

  /** The bracket pair as a VGroup */
  protected _brackets: VGroup | null = null;

  /** The matrix content without brackets */
  protected _content: VGroup | null = null;

  /**
   * Stored cell dimensions from _layoutEntries().
   * Used by _getContentBounds() so we never rely on getCenter() for sizing —
   * getCenter() just returns this.position which is useless for size.
   */
  protected _cellWidth: number = 0;
  protected _cellHeight: number = 0;

  constructor(data: (string | number | Mobject)[][], options: MatrixOptions = {}) {
    super();

    const {
      bracketType = '[]',
      vBuff = 0.8,
      hBuff = 1.3,
      elementAlignment = 'center',
      bracketColor = WHITE,
      bracketStrokeWidth = DEFAULT_STROKE_WIDTH,
      elementColor = WHITE,
      fontSize = 48,
      position = [0, 0, 0],
    } = options;

    this._data = data;
    this._bracketType = bracketType;
    this._vBuff = vBuff;
    this._hBuff = hBuff;
    this._elementAlignment = elementAlignment;
    this._bracketColor = bracketColor;
    this._bracketStrokeWidth = bracketStrokeWidth;
    this._elementColor = elementColor;
    this._fontSize = fontSize;

    this.position = [...position];

    this._buildMatrix();
  }

  /**
   * Build the matrix mobject.
   *
   * Only creates entry mobjects and adds them to the scene graph here.
   * Layout and brackets are deferred to waitForRender() because MathTex
   * resets its own position to [0,0,0] after async rendering completes —
   * any moveTo() called before that gets wiped out.
   */
  protected _buildMatrix(): void {
    const numRows = this._data.length;
    if (numRows === 0) return;

    const numCols = Math.max(...this._data.map((row) => row.length));
    if (numCols === 0) return;

    // Create entry mobjects
    this._entries = [];
    this._rows = [];
    this._columns = Array.from({ length: numCols }, () => new VGroup());

    for (let i = 0; i < numRows; i++) {
      const rowEntries: Mobject[] = [];
      const rowGroup = new VGroup();

      for (let j = 0; j < numCols; j++) {
        const value = this._data[i]?.[j] ?? '';
        const entry = this._createEntry(value);

        rowEntries.push(entry);
        rowGroup.add(entry as VMobject);
      }

      this._entries.push(rowEntries);
      this._rows.push(rowGroup);
    }

    // Populate columns without reparenting (columns aren't in scene graph)
    for (let j = 0; j < numCols; j++) {
      for (let i = 0; i < this._entries.length; i++) {
        this._columns[j].children.push(this._entries[i][j] as VMobject);
      }
    }

    // Create content group and add to this
    this._content = new VGroup();
    for (const row of this._rows) {
      this._content.add(row);
    }
    this.add(this._content);

    // NOTE: _layoutEntries() and _createBrackets() are NOT called here.
    // They are called in waitForRender() after MathTex async rendering is done.
  }

  /**
   * Create a mobject for a single entry
   */
  protected _createEntry(value: string | number | Mobject): Mobject {
    if (value instanceof Mobject) {
      return value;
    }

    const latex = typeof value === 'number' ? String(value) : value;

    return new MathTex({
      latex,
      color: this._elementColor,
      fontSize: this._fontSize / 48,
    });
  }

  /**
   * Layout entries in a grid pattern (relative to this group's origin).
   * Three.js composes parent+child transforms, so entries only need their
   * grid offset — the Matrix group's own position handles world placement.
   */
  protected _layoutEntries(): void {
    const numRows = this._entries.length;
    if (numRows === 0) return;

    const numCols = this._entries[0].length;

    let maxCellWidth = 0;
    let maxCellHeight = 0;

    for (const row of this._entries) {
      for (const entry of row) {
        const bounds = this._getEntryBounds(entry);
        maxCellWidth = Math.max(maxCellWidth, bounds.width);
        maxCellHeight = Math.max(maxCellHeight, bounds.height);
      }
    }

    const cellWidth = maxCellWidth + this._hBuff * 0.3;
    const cellHeight = maxCellHeight + this._vBuff * 0.3;

    // Store for _getContentBounds() — never use getCenter() for sizing
    this._cellWidth = cellWidth;
    this._cellHeight = cellHeight;

    for (let i = 0; i < numRows; i++) {
      for (let j = 0; j < numCols; j++) {
        const entry = this._entries[i][j];
        // Grid offset relative to this group's origin (0,0,0)
        const x = (j - (numCols - 1) / 2) * cellWidth;
        const y = ((numRows - 1) / 2 - i) * cellHeight;
        entry.moveTo([x, y, 0]);
      }
    }
  }

  /**
   * Get bounds of an entry mobject (estimated, not from Three.js Box3)
   */
  protected _getEntryBounds(entry: Mobject): { width: number; height: number } {
    // For Text/DecimalNumber, use their reported dimensions
    if (entry instanceof Text) {
      const dims = entry.getDimensions();
      return dims;
    }

    // Collect all leaf VMobject points (works for MathTex after render)
    const allPoints: number[][] = [];
    const collect = (mob: Mobject) => {
      if (mob instanceof VMobject && !(mob instanceof VGroup) && mob.points3D.length > 0) {
        allPoints.push(...mob.points3D);
      }
      if ('children' in mob) {
        for (const child of (mob as VGroup).children) collect(child);
      }
    };
    collect(entry);

    if (allPoints.length > 0) {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      for (const p of allPoints) {
        minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
      }
      return { width: maxX - minX, height: maxY - minY };
    }

    // Fallback if no points yet
    return { width: 0.8, height: 0.6 };
  }

  /**
   * Create the bracket mobjects, placed at offsets relative to group origin.
   * Three.js parent-child transform handles world placement automatically.
   */
  protected _createBrackets(): void {
    if (this._bracketType === '') {
      this._brackets = null;
      return;
    }

    const contentBounds = this._getContentBounds();
    const height = contentBounds.height + this._vBuff * 0.5;
    const width = contentBounds.width;

    this._brackets = new VGroup();

    this._leftBracket = this._createBracketShape(this._bracketType, 'left', height);
    if (this._leftBracket) {
      this._leftBracket.moveTo([-(width / 2 + this._hBuff * 0.3), 0, 0]);
      this._brackets.add(this._leftBracket);
    }

    this._rightBracket = this._createBracketShape(this._bracketType, 'right', height);
    if (this._rightBracket) {
      this._rightBracket.moveTo([width / 2 + this._hBuff * 0.3, 0, 0]);
      this._brackets.add(this._rightBracket);
    }
  }

  /**
   * Create a bracket shape as a VMobject
   */
  protected _createBracketShape(
    type: BracketType,
    side: 'left' | 'right',
    height: number,
  ): VMobject {
    const bracket = new VMobject();
    bracket.color = this._bracketColor;
    bracket.strokeWidth = this._bracketStrokeWidth;
    bracket.fillOpacity = 0;

    const halfHeight = height / 2;
    const hookSize = height * 0.08;
    const sign = side === 'left' ? 1 : -1;
    const points = this._getBracketPoints(type, halfHeight, hookSize, sign);

    bracket.setPoints3D(this._pointsToLineBezier(points));

    return bracket;
  }

  /**
   * Generate points for a bracket shape
   * @param sign 1 for left side, -1 for right side
   */
  protected _getBracketPoints(
    type: BracketType,
    halfHeight: number,
    hookSize: number,
    sign: number,
  ): number[][] {
    const points: number[][] = [];

    switch (type) {
      case '[]':
        points.push(
          [sign * hookSize, halfHeight, 0],
          [0, halfHeight, 0],
          [0, -halfHeight, 0],
          [sign * hookSize, -halfHeight, 0],
        );
        break;

      case '()':
        this._addParenthesisPoints(points, halfHeight, hookSize, sign);
        break;

      case '||':
        points.push([0, halfHeight, 0], [0, -halfHeight, 0]);
        break;

      case '{}':
        this._addCurlyBracePoints(points, halfHeight, hookSize, sign);
        break;

      case '<>':
        points.push([sign * hookSize, halfHeight, 0], [0, 0, 0], [sign * hookSize, -halfHeight, 0]);
        break;

      default:
        throw new Error(`Unexpected bracket type: ${type}`);
    }

    return points;
  }

  /**
   * Add parenthesis curve points
   */
  private _addParenthesisPoints(
    points: number[][],
    halfHeight: number,
    hookSize: number,
    sign: number,
  ): void {
    const curveWidth = hookSize * 1.5;
    const numSegments = 20;

    for (let i = 0; i <= numSegments; i++) {
      const t = i / numSegments;
      const angle = Math.PI * (t - 0.5);
      const y = halfHeight * Math.sin(angle);
      const x = sign * curveWidth * (1 - Math.cos(angle));
      points.push([x, y, 0]);
    }
  }

  /**
   * Add curly brace points
   */
  private _addCurlyBracePoints(
    points: number[][],
    halfHeight: number,
    hookSize: number,
    sign: number,
  ): void {
    const curlyWidth = hookSize * 1.2;
    const midPointWidth = hookSize * 1.8;
    const numSegs = 10;

    for (let i = 0; i <= numSegs; i++) {
      const t = i / numSegs;
      const y = halfHeight - t * halfHeight;
      const x = sign * (curlyWidth + (midPointWidth - curlyWidth) * Math.sin((t * Math.PI) / 2));
      points.push([x, y, 0]);
    }

    for (let i = 1; i <= numSegs; i++) {
      const t = i / numSegs;
      const y = -t * halfHeight;
      const x = sign * (midPointWidth - (midPointWidth - curlyWidth) * Math.sin((t * Math.PI) / 2));
      points.push([x, y, 0]);
    }
  }

  /**
   * Convert a list of points to cubic Bezier control points for line segments
   */
  protected _pointsToLineBezier(points: number[][]): number[][] {
    if (points.length < 2) return [];

    const bezierPoints: number[][] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const dx = p1[0] - p0[0];
      const dy = p1[1] - p0[1];
      const dz = p1[2] - p0[2];

      if (i === 0) {
        bezierPoints.push([...p0]);
      }

      bezierPoints.push([p0[0] + dx / 3, p0[1] + dy / 3, p0[2] + dz / 3]);
      bezierPoints.push([p0[0] + (2 * dx) / 3, p0[1] + (2 * dy) / 3, p0[2] + (2 * dz) / 3]);
      bezierPoints.push([...p1]);
    }

    return bezierPoints;
  }

  /**
   * Get bounds of the content using stored cell dimensions.
   * Never calls getCenter() — that just returns this.position, not visual size.
   */
  protected _getContentBounds(): { width: number; height: number } {
    const numRows = this._entries.length;
    const numCols = this._entries[0]?.length ?? 0;

    // Get actual max entry size (same source of truth as _layoutEntries)
    let maxEntryWidth = 0;
    let maxEntryHeight = 0;
    for (const row of this._entries) {
      for (const entry of row) {
        const bounds = this._getEntryBounds(entry);
        maxEntryWidth = Math.max(maxEntryWidth, bounds.width);
        maxEntryHeight = Math.max(maxEntryHeight, bounds.height);
      }
    }

    return {
      width: (numCols - 1) * this._cellWidth + maxEntryWidth,
      height: (numRows - 1) * this._cellHeight + maxEntryHeight,
    };
  }

  /**
   * Get all entries as a flat VGroup
   */
  getEntries(): VGroup {
    const entries = new VGroup();
    for (const row of this._entries) {
      for (const entry of row) {
        if (entry instanceof VMobject) {
          entries.add(entry);
        }
      }
    }
    return entries;
  }

  /**
   * Get a specific entry by row and column index
   * @param i Row index (0-based)
   * @param j Column index (0-based)
   * @returns The entry mobject, or undefined if out of bounds
   */
  getEntry(i: number, j: number): Mobject | undefined {
    return this._entries[i]?.[j];
  }

  /**
   * Get all rows as VGroups
   */
  getRows(): VGroup[] {
    return [...this._rows];
  }

  /**
   * Get a specific row as a VGroup
   * @param i Row index (0-based)
   * @returns The row VGroup, or undefined if out of bounds
   */
  getRow(i: number): VGroup | undefined {
    return this._rows[i];
  }

  /**
   * Get all columns as VGroups
   */
  getColumns(): VGroup[] {
    return [...this._columns];
  }

  /**
   * Get a specific column as a VGroup
   * @param j Column index (0-based)
   * @returns The column VGroup, or undefined if out of bounds
   */
  getColumn(j: number): VGroup | undefined {
    return this._columns[j];
  }

  /**
   * Get the bracket mobjects as a VGroup
   * @returns VGroup containing left and right brackets, or null if no brackets
   */
  getBrackets(): VGroup | null {
    return this._brackets;
  }

  /**
   * Get the left bracket mobject
   */
  getLeftBracket(): VMobject | null {
    return this._leftBracket;
  }

  /**
   * Get the right bracket mobject
   */
  getRightBracket(): VMobject | null {
    return this._rightBracket;
  }

  /**
   * Get the number of rows
   */
  get numRows(): number {
    return this._entries.length;
  }

  /**
   * Get the number of columns
   */
  get numCols(): number {
    return this._entries[0]?.length ?? 0;
  }

  /**
   * Wait for all MathTex entries to finish rendering, then lay out entries
   * and create brackets.
   *
   * Must be called before adding to scene. MathTex resets its own position
   * to [0,0,0] after async rendering completes, so any moveTo() called
   * before waitForRender() gets wiped. Layout must happen after.
   */
  async waitForRender(): Promise<void> {
    const allEntries = this._entries.flat();
    await Promise.all(
      allEntries.map((m) => (m as any).waitForRender?.())
    );

    // Now MathTex has finished and settled — layout will stick
    this._layoutEntries();
    console.log('cellWidth:', this._cellWidth, 'cellHeight:', this._cellHeight);
    console.log('contentBounds:', this._getContentBounds());
    // Build brackets using stored cell dims (not getCenter())
    this._createBrackets();
    if (this._brackets) {
      this.add(this._brackets);
    }
  }

  /**
   * Create a copy of this Matrix
   */
  protected _createCopy(): Mobject {
    const dataCopy = this._data.map((row) =>
      row.map((val) => (val instanceof Mobject ? val.copy() : val)),
    );

    return new Matrix(dataCopy, {
      bracketType: this._bracketType,
      vBuff: this._vBuff,
      hBuff: this._hBuff,
      elementAlignment: this._elementAlignment,
      bracketColor: this._bracketColor,
      bracketStrokeWidth: this._bracketStrokeWidth,
      elementColor: this._elementColor,
      fontSize: this._fontSize,
      position: [this.position[0], this.position[1], this.position[2]],
    });
  }
}

/**
 * Options for IntegerMatrix
 */
export type IntegerMatrixOptions = MatrixOptions;

/**
 * IntegerMatrix - A matrix specialized for integer values
 *
 * @example
 * ```typescript
 * const intMatrix = new IntegerMatrix([
 *   [1, 2, 3],
 *   [4, 5, 6],
 *   [7, 8, 9]
 * ]);
 * ```
 */
export class IntegerMatrix extends Matrix {
  constructor(data: number[][], options: IntegerMatrixOptions = {}) {
    const intData = data.map((row) => row.map((val) => Math.round(val)));
    super(intData, options);
    // Layout immediately since DecimalNumber is synchronous
    this._layoutEntries();
    this._createBrackets();
    if (this._brackets) {
      this.add(this._brackets);
    }
  }

  protected _createEntry(value: string | number | Mobject): Mobject {
    if (value instanceof Mobject) {
      return value;
    }
    const num = typeof value === 'number' ? value : parseFloat(value);
    return new DecimalNumber({
      value: num,
      numDecimalPlaces: 0,
      color: this._elementColor,
      fontSize: this._fontSize,
    });
  }

  protected _createCopy(): Mobject {
    const dataCopy = this._data.map((row) => row.map((val) => (typeof val === 'number' ? val : 0)));

    return new IntegerMatrix(dataCopy as number[][], {
      bracketType: this._bracketType,
      vBuff: this._vBuff,
      hBuff: this._hBuff,
      elementAlignment: this._elementAlignment,
      bracketColor: this._bracketColor,
      bracketStrokeWidth: this._bracketStrokeWidth,
      elementColor: this._elementColor,
      fontSize: this._fontSize,
      position: [this.position[0], this.position[1], this.position[2]],
    });
  }
}

/**
 * Options for DecimalMatrix
 */
export interface DecimalMatrixOptions extends MatrixOptions {
  /** Number of decimal places to display. Default: 2 */
  numDecimalPlaces?: number;
}

/**
 * DecimalMatrix - A matrix specialized for decimal values
 *
 * @example
 * ```typescript
 * const decMatrix = new DecimalMatrix([
 *   [1.234, 2.567],
 *   [3.891, 4.012]
 * ], { numDecimalPlaces: 2 });
 * ```
 */
export class DecimalMatrix extends Matrix {
  protected _numDecimalPlaces: number;

  constructor(data: number[][], options: DecimalMatrixOptions = {}) {
    const { numDecimalPlaces = 2, ...matrixOptions } = options;
    super(data, matrixOptions);
    this._numDecimalPlaces = numDecimalPlaces;
    // Layout immediately since DecimalNumber is synchronous
    this._layoutEntries();
    this._createBrackets();
    if (this._brackets) {
      this.add(this._brackets);
    }
  }

  protected _createEntry(value: string | number | Mobject): Mobject {
    if (value instanceof Mobject) {
      return value;
    }
    const num = typeof value === 'number' ? value : parseFloat(value);
    return new DecimalNumber({
      value: num,
      numDecimalPlaces: this._numDecimalPlaces,
      color: this._elementColor,
      fontSize: this._fontSize,
    });
  }

  protected _createCopy(): Mobject {
    const dataCopy = this._data.map((row) =>
      row.map((val) => (typeof val === 'string' ? parseFloat(val) : (val as number))),
    );

    return new DecimalMatrix(dataCopy as number[][], {
      bracketType: this._bracketType,
      vBuff: this._vBuff,
      hBuff: this._hBuff,
      elementAlignment: this._elementAlignment,
      bracketColor: this._bracketColor,
      bracketStrokeWidth: this._bracketStrokeWidth,
      elementColor: this._elementColor,
      fontSize: this._fontSize,
      numDecimalPlaces: this._numDecimalPlaces,
      position: [this.position[0], this.position[1], this.position[2]],
    });
  }
}

/**
 * Options for MobjectMatrix
 */
export type MobjectMatrixOptions = MatrixOptions;

/**
 * MobjectMatrix - A matrix containing arbitrary Mobjects
 *
 * @example
 * ```typescript
 * const mobjectMatrix = new MobjectMatrix([
 *   [new Circle(), new Square()],
 *   [new Triangle(), new MathTex({ latex: '\\pi' })]
 * ]);
 * ```
 */
export class MobjectMatrix extends Matrix {
  constructor(data: Mobject[][], options: MobjectMatrixOptions = {}) {
    super(data, options);
  }

  protected _createEntry(value: string | number | Mobject): Mobject {
    if (value instanceof Mobject) {
      return value;
    }
    return super._createEntry(value);
  }

  protected _createCopy(): Mobject {
    const dataCopy = this._data.map((row) =>
      row.map((val) => (val instanceof Mobject ? val.copy() : val)),
    ) as Mobject[][];

    return new MobjectMatrix(dataCopy, {
      bracketType: this._bracketType,
      vBuff: this._vBuff,
      hBuff: this._hBuff,
      elementAlignment: this._elementAlignment,
      bracketColor: this._bracketColor,
      bracketStrokeWidth: this._bracketStrokeWidth,
      elementColor: this._elementColor,
      fontSize: this._fontSize,
      position: [this.position[0], this.position[1], this.position[2]],
    });
  }
}
