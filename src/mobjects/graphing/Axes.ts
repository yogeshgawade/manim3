import { VGroup } from '../../core/VGroup';
import { Group } from '../../core/Group';
import { NumberLine, NumberLineOptions } from './NumberLine';
import { Arrow } from '../geometry/Arrow';
import { FunctionGraph, FunctionGraphOptions } from './FunctionGraph';

/**
 * Options for creating Axes
 */
export interface AxesOptions {
  /** X-axis range as [min, max] or [min, max, step]. Default: [-5, 5, 1] */
  xRange?: [number, number] | [number, number, number];
  /** Y-axis range as [min, max] or [min, max, step]. Default: [-3, 3, 1] */
  yRange?: [number, number] | [number, number, number];
  /** Visual length of the x-axis. Default: 10 */
  xLength?: number;
  /** Visual length of the y-axis. Default: 6 */
  yLength?: number;
  /** Stroke color for axes. Default: '#ffffff' */
  color?: string;
  /** Common configuration for both axes */
  axisConfig?: Partial<NumberLineOptions>;
  /** Configuration specific to x-axis (overrides axisConfig) */
  xAxisConfig?: Partial<NumberLineOptions>;
  /** Configuration specific to y-axis (overrides axisConfig) */
  yAxisConfig?: Partial<NumberLineOptions>;
  /** Whether to include arrow tips on axes. Default: true */
  tips?: boolean;
  /** Length of arrow tips. Default: 0.25 */
  tipLength?: number;
}

/**
 * Axes - A coordinate system with x and y axes
 *
 * Creates a 2D coordinate system with configurable ranges and styling.
 * Supports coordinate transformations between graph space and visual space.
 *
 * @example
 * ```typescript
 * // Create default axes
 * const axes = new Axes();
 *
 * // Create axes with custom ranges
 * const customAxes = new Axes({
 *   xRange: [0, 10, 1],
 *   yRange: [-1, 1, 0.5],
 *   xLength: 8,
 *   yLength: 4
 * });
 *
 * // Get a point in visual coordinates
 * const point = axes.coordsToPoint(3, 2);
 * ```
 */
export class Axes extends Group {
  /** The x-axis NumberLine */
  xAxis: NumberLine;
  /** The y-axis NumberLine */
  yAxis: NumberLine;

  private _xRange: [number, number, number];
  private _yRange: [number, number, number];
  private _xLength: number;
  private _yLength: number;
  private _tips: boolean;
  private _tipLength: number;

  constructor(options: AxesOptions = {}) {
    super();

    const {
      xRange: xRangeRaw = [-5, 5, 1],
      yRange: yRangeRaw = [-3, 3, 1],
      xLength = 10,
      yLength = 6,
      color = '#ffffff',
      axisConfig = {},
      xAxisConfig = {},
      yAxisConfig = {},
      tips = true,
      tipLength = 0.25,
    } = options;

    // Normalize 2-element ranges to 3-element [min, max, step]
    const xRange: [number, number, number] =
      xRangeRaw.length === 2
        ? [xRangeRaw[0], xRangeRaw[1], 1]
        : (xRangeRaw as [number, number, number]);
    const yRange: [number, number, number] =
      yRangeRaw.length === 2
        ? [yRangeRaw[0], yRangeRaw[1], 1]
        : (yRangeRaw as [number, number, number]);

    this._xRange = xRange;
    this._yRange = yRange;
    this._xLength = xLength;
    this._yLength = yLength;
    this._tips = tips;
    this._tipLength = tipLength;

    // Create x-axis (horizontal)
    this.xAxis = new NumberLine({
      xRange,
      length: xLength,
      color,
      includeTicks: true,
      includeNumbers: false,
      ...axisConfig,
      ...xAxisConfig,
    });

    // Create y-axis (vertical)
    this.yAxis = new NumberLine({
      xRange: yRange,
      length: yLength,
      color,
      includeTicks: true,
      includeNumbers: false,
      ...axisConfig,
      ...yAxisConfig,
    });
    // Rotate y-axis to vertical
    this.yAxis.rotation[2] = Math.PI / 2;

    this.add(this.xAxis, this.yAxis);

    // Add tips if requested
    if (tips) {
      this._addTips(color);
    }
  }

  /**
   * Add arrow tips to the axes
   */
  private _addTips(color: string): void {
    const [xMin, xMax] = this._xRange;
    const [yMin, yMax] = this._yRange;
    const xUnitLength = this._xLength / (xMax - xMin);
    const yUnitLength = this._yLength / (yMax - yMin);

    // X-axis tip (at right end, pointing right)
    const xTipX = xMax * xUnitLength;
    const xTip = new Arrow({
      start: [xTipX, 0, 0],
      end: [xTipX + this._tipLength, 0, 0],
      color,
      strokeWidth: 2,
      tipLength: this._tipLength * 0.8,
    });
    this.add(xTip);

    // Y-axis tip (at top end, pointing up)
    const yTipY = yMax * yUnitLength;
    const yTip = new Arrow({
      start: [0, yTipY, 0],
      end: [0, yTipY + this._tipLength, 0],
      color,
      strokeWidth: 2,
      tipLength: this._tipLength * 0.8,
    });
    this.add(yTip);
  }

  /**
   * Convert graph coordinates to scene point coordinates
   * @param x - X coordinate in graph space
   * @param y - Y coordinate in graph space
   * @returns [x, y, z] position in scene space
   */
  coordsToPoint(x: number, y: number): [number, number, number] {
    const [xMin, xMax] = this._xRange;
    const [yMin, yMax] = this._yRange;
    const xUnitLength = this._xLength / (xMax - xMin);
    const yUnitLength = this._yLength / (yMax - yMin);

    return [
      x * xUnitLength,
      y * yUnitLength,
      0,
    ];
  }

  /**
   * Convert scene point coordinates to graph coordinates
   * @param point - [x, y, z] position in scene space
   * @returns [x, y] coordinates in graph space
   */
  pointToCoords(point: [number, number, number]): [number, number] {
    const [xMin, xMax] = this._xRange;
    const [yMin, yMax] = this._yRange;
    const xUnitLength = this._xLength / (xMax - xMin);
    const yUnitLength = this._yLength / (yMax - yMin);

    return [
      point[0] / xUnitLength,
      point[1] / yUnitLength,
    ];
  }

  /**
   * Get the X range
   */
  getXRange(): [number, number, number] {
    return [...this._xRange];
  }

  /**
   * Get the Y range
   */
  getYRange(): [number, number, number] {
    return [...this._yRange];
  }

  /**
   * Get the x-axis length
   */
  getXLength(): number {
    return this._xLength;
  }

  /**
   * Get the y-axis length
   */
  getYLength(): number {
    return this._yLength;
  }

  /**
   * Plot a function on these axes.
   * @param func - The function y = f(x) to plot
   * @param options - Plot options including color, xRange, samples, strokeWidth
   * @returns FunctionGraph mobject
   */
  plot(func: (x: number) => number, options: Omit<FunctionGraphOptions, 'func' | 'axes'> = {}): FunctionGraph {
    const graph = new FunctionGraph({
      func,
      axes: this,
      ...options,
    });
    this.add(graph);
    return graph;
  }

  /**
   * Input to Graph Point - Get the point on a graph at a specific x value.
   * @param x - The x coordinate in graph space
   * @param graph - The FunctionGraph to evaluate
   * @returns [x, y, z] position in scene space
   */
  i2gp(x: number, graph: FunctionGraph): [number, number, number] {
    return graph.getPointAtX(x);
  }

  /**
   * Create a copy of this Axes
   */
  protected _createCopy(): Axes {
    return new Axes({
      xRange: this._xRange,
      yRange: this._yRange,
      xLength: this._xLength,
      yLength: this._yLength,
      color: this.xAxis.fillColor,
      tips: this._tips,
      tipLength: this._tipLength,
    });
  }
}
