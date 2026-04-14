import { VMobject } from '../../core/VMobject';
import { Axes } from './Axes';

/**
 * Options for creating FunctionGraph
 */
export interface FunctionGraphOptions {
  /** The function to plot: f(x) -> y */
  func: (x: number) => number;
  /** X range as [min, max]. Defaults to axes xRange */
  xRange?: [number, number];
  /** Number of samples for smoothness. Default: 100 */
  samples?: number;
  /** Stroke color. Default: '#58C4DD' (Manim blue) */
  color?: string;
  /** Stroke width. Default: 2 */
  strokeWidth?: number;
  /** The axes to plot on (required for coordinate transformation) */
  axes?: Axes;
}

/**
 * FunctionGraph - A graph of a mathematical function
 *
 * Plots a function y = f(x) as a smooth curve.
 * Can be plotted relative to Axes for proper coordinate mapping.
 *
 * @example
 * ```typescript
 * // Create axes
 * const axes = new Axes({ xRange: [-5, 5], yRange: [-3, 3] });
 *
 * // Plot a sine wave
 * const sineGraph = new FunctionGraph({
 *   func: (x) => Math.sin(x),
 *   axes,
 *   color: '#ff0000'
 * });
 *
 * // Plot a parabola
 * const parabola = new FunctionGraph({
 *   func: (x) => x * x,
 *   xRange: [-2, 2],
 *   axes,
 *   samples: 200
 * });
 * ```
 */
export class FunctionGraph extends VMobject {
  private _func: (x: number) => number;
  private _xRange: [number, number];
  private _samples: number;
  private _axes: Axes | null;

  constructor(options: FunctionGraphOptions) {
    super();

    const {
      func,
      xRange,
      samples = 100,
      color = '#58C4DD',
      strokeWidth = 2,
      axes = null,
    } = options;

    this._func = func;
    this._axes = axes;
    this._samples = Math.max(2, samples);

    // Determine x range
    if (xRange) {
      this._xRange = [...xRange] as [number, number];
    } else if (axes) {
      const [xMin, xMax] = axes.getXRange();
      this._xRange = [xMin, xMax];
    } else {
      this._xRange = [-5, 5];
    }

    this.fillOpacity = 0;
    this.fillColor = color;
    this.strokeWidth = strokeWidth;

    this._generateGraph();
  }

  /**
   * Generate the graph points using cubic Bezier curves
   */
  private _generateGraph(): void {
    const [xMin, xMax] = this._xRange;
    const step = (xMax - xMin) / (this._samples - 1);

    const points: number[][] = [];

    for (let i = 0; i < this._samples; i++) {
      const x = xMin + i * step;
      const y = this._func(x);

      // Transform to scene coordinates if axes provided
      let sceneX = x;
      let sceneY = y;
      if (this._axes) {
        const point = this._axes.coordsToPoint(x, y);
        sceneX = point[0];
        sceneY = point[1];
      }

      if (i === 0) {
        points.push([sceneX, sceneY, 0]);
      } else {
        const prev = points[points.length - 1];
        const prevX = prev[0];
        const prevY = prev[1];
        const dx = sceneX - prevX;
        const dy = sceneY - prevY;

        // Add Bezier control points
        points.push([prevX + dx / 3, prevY + dy / 3, 0]);
        points.push([prevX + (2 * dx) / 3, prevY + (2 * dy) / 3, 0]);
        points.push([sceneX, sceneY, 0]);
      }
    }

    this.setPoints3D(points);
  }

  /**
   * Get the underlying function
   */
  getFunction(): (x: number) => number {
    return this._func;
  }

  /**
   * Get the x range
   */
  getXRange(): [number, number] {
    return [...this._xRange];
  }

  /**
   * Get the minimum x value (tMin) - useful for placing dots at graph start
   */
  get tMin(): number {
    return this._xRange[0];
  }

  /**
   * Get the maximum x value (tMax) - useful for placing dots at graph end
   */
  get tMax(): number {
    return this._xRange[1];
  }

  /**
   * Get the axes (if any)
   */
  getAxes(): Axes | null {
    return this._axes;
  }

  /**
   * Evaluate the function at a specific x value
   * @param x - X coordinate
   * @returns Y value (function result)
   */
  evaluate(x: number): number {
    return this._func(x);
  }

  /**
   * Get the point on the graph at a specific x value
   * @param x - X coordinate
   * @returns [x, y, z] position in scene space
   */
  getPointAtX(x: number): [number, number, number] {
    const y = this._func(x);
    if (this._axes) {
      return this._axes.coordsToPoint(x, y);
    }
    return [x, y, 0];
  }

  /**
   * Create a copy of this FunctionGraph
   */
  protected _createCopy(): FunctionGraph {
    return new FunctionGraph({
      func: this._func,
      xRange: this._xRange,
      samples: this._samples,
      color: this.fillColor,
      strokeWidth: this.strokeWidth,
      axes: this._axes ?? undefined,
    });
  }
}
