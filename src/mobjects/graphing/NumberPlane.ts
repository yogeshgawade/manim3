import { Axes, AxesOptions } from './Axes';
import { Line } from '../geometry/Line';
import { Group } from '../../core/Group';

/**
 * Style options for background lines in NumberPlane
 */
export interface BackgroundLineStyle {
  /** Stroke color. Default: '#888888' */
  color?: string;
  /** Stroke width. Default: 1 */
  strokeWidth?: number;
  /** Opacity (0-1). Default: 0.5 */
  opacity?: number;
}

/**
 * Options for creating NumberPlane
 */
export interface NumberPlaneOptions extends AxesOptions {
  /** Whether to show background grid lines. Default: true */
  backgroundGrid?: boolean;
  /** Style for background lines */
  backgroundLineStyle?: BackgroundLineStyle;
  /** X-axis step for background lines. Defaults to xRange step */
  xStep?: number;
  /** Y-axis step for background lines. Defaults to yRange step */
  yStep?: number;
  /** Whether to fade distant lines. Default: true */
  fadedLines?: boolean;
  /** Fade factor for distant lines (0-1). Default: 0.3 */
  fadeFactor?: number;
}

/**
 * NumberPlane - A coordinate plane with grid background
 *
 * Extends Axes with a background grid of horizontal and vertical lines.
 * Supports fading effect where lines further from the origin are more transparent.
 *
 * @example
 * ```typescript
 * // Create default number plane
 * const plane = new NumberPlane();
 *
 * // Create custom plane
 * const customPlane = new NumberPlane({
 *   xRange: [-10, 10, 2],
 *   yRange: [-8, 8, 2],
 *   xLength: 12,
 *   yLength: 8,
 *   backgroundLineStyle: { color: '#aaaaaa', opacity: 0.3 }
 * });
 * ```
 */
export class NumberPlane extends Axes {
  private _backgroundGrid: boolean;
  private _backgroundLineStyle: BackgroundLineStyle;
  private _xStep: number;
  private _yStep: number;
  private _fadedLines: boolean;
  private _fadeFactor: number;
  private _backgroundLines: Line[] = [];

  constructor(options: NumberPlaneOptions = {}) {
    const {
      backgroundGrid = true,
      backgroundLineStyle = {},
      xStep,
      yStep,
      fadedLines = true,
      fadeFactor = 0.3,
      ...axesOptions
    } = options;

    super(axesOptions);

    this._backgroundGrid = backgroundGrid;
    this._backgroundLineStyle = {
      color: '#888888',
      strokeWidth: 1,
      opacity: 0.5,
      ...backgroundLineStyle,
    };
    this._fadedLines = fadedLines;
    this._fadeFactor = fadeFactor;

    // Use axis step if not specified
    const [xMin, xMax, xRangeStep] = this.getXRange();
    const [yMin, yMax, yRangeStep] = this.getYRange();
    this._xStep = xStep ?? xRangeStep;
    this._yStep = yStep ?? yRangeStep;

    if (this._backgroundGrid) {
      this._generateBackgroundGrid();
    }
  }

  /**
   * Generate the background grid lines
   */
  private _generateBackgroundGrid(): void {
    const [xMin, xMax] = this.getXRange();
    const [yMin, yMax] = this.getYRange();
    const xLength = this.getXLength();
    const yLength = this.getYLength();

    const xUnitLength = xLength / (xMax - xMin);
    const yUnitLength = yLength / (yMax - yMin);

    const baseOpacity = this._backgroundLineStyle.opacity ?? 0.5;
    const color = this._backgroundLineStyle.color ?? '#888888';
    const strokeWidth = this._backgroundLineStyle.strokeWidth ?? 1;

    this._backgroundLines = [];

    // Generate vertical lines (parallel to y-axis)
    for (let x = xMin; x <= xMax + 1e-6; x += this._xStep) {
      // Skip the axis line itself
      if (Math.abs(x) < 1e-6) continue;

      const xPos = x * xUnitLength;
      const fade = this._calculateFade(x, xMin, xMax);
      const opacity = baseOpacity * (this._fadedLines ? fade : 1);

      const line = new Line({
        start: [xPos, yMin * yUnitLength, 0],
        end: [xPos, yMax * yUnitLength, 0],
        color,
        strokeWidth,
      });
      line.opacity = opacity;

      this._backgroundLines.push(line);
      // Add as first child so it appears behind axes
      this.children.unshift(line);
    }

    // Generate horizontal lines (parallel to x-axis)
    for (let y = yMin; y <= yMax + 1e-6; y += this._yStep) {
      // Skip the axis line itself
      if (Math.abs(y) < 1e-6) continue;

      const yPos = y * yUnitLength;
      const fade = this._calculateFade(y, yMin, yMax);
      const opacity = baseOpacity * (this._fadedLines ? fade : 1);

      const line = new Line({
        start: [xMin * xUnitLength, yPos, 0],
        end: [xMax * xUnitLength, yPos, 0],
        color,
        strokeWidth,
      });
      line.opacity = opacity;

      this._backgroundLines.push(line);
      // Add as first child so it appears behind axes
      this.children.unshift(line);
    }
  }

  /**
   * Calculate fade factor based on distance from origin
   * @param value - Current coordinate value
   * @param min - Range minimum
   * @param max - Range maximum
   * @returns Fade factor (0-1)
   */
  private _calculateFade(value: number, min: number, max: number): number {
    const absMax = Math.max(Math.abs(min), Math.abs(max));
    const normalizedDist = Math.abs(value) / absMax;
    return 1 - (1 - this._fadeFactor) * normalizedDist;
  }

  /**
   * Get all background grid lines
   */
  getBackgroundLines(): Line[] {
    return [...this._backgroundLines];
  }

  /**
   * Get the x step for background lines
   */
  getXStep(): number {
    return this._xStep;
  }

  /**
   * Get the y step for background lines
   */
  getYStep(): number {
    return this._yStep;
  }

  /**
   * Set the x step and regenerate grid
   */
  setXStep(step: number): this {
    this._xStep = step;
    if (this._backgroundGrid) {
      // Remove old background lines
      for (const line of this._backgroundLines) {
        this.remove(line);
      }
      this._generateBackgroundGrid();
    }
    this.markDirty();
    return this;
  }

  /**
   * Set the y step and regenerate grid
   */
  setYStep(step: number): this {
    this._yStep = step;
    if (this._backgroundGrid) {
      // Remove old background lines
      for (const line of this._backgroundLines) {
        this.remove(line);
      }
      this._generateBackgroundGrid();
    }
    this.markDirty();
    return this;
  }

  /**
   * Create a copy of this NumberPlane
   */
  protected _createCopy(): NumberPlane {
    return new NumberPlane({
      xRange: this.getXRange(),
      yRange: this.getYRange(),
      xLength: this.getXLength(),
      yLength: this.getYLength(),
      color: this.xAxis.fillColor,
      tips: true,
      backgroundGrid: this._backgroundGrid,
      backgroundLineStyle: { ...this._backgroundLineStyle },
      xStep: this._xStep,
      yStep: this._yStep,
      fadedLines: this._fadedLines,
      fadeFactor: this._fadeFactor,
    });
  }
}
