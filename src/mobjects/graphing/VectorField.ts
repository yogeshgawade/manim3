import { Group } from '../../core/Group';
import { VMobject } from '../../core/VMobject';
import { Arrow } from '../geometry/Arrow';
import type { Vec3 } from '../../core/types';

/**
 * Type for vector field function: maps (x, y) to [vx, vy]
 */
export type VectorFunction = (x: number, y: number) => [number, number];

/**
 * Type for color function based on vector properties
 */
export type ColorFunction = (
  magnitude: number,
  x: number,
  y: number,
  vx: number,
  vy: number,
) => string;

/**
 * Base options for vector field types
 */
export interface VectorFieldBaseOptions {
  /** The vector function mapping (x, y) to [vx, vy] */
  func: VectorFunction;
  /** X range as [min, max, step]. Default: [-5, 5, 0.5] */
  xRange?: [number, number, number];
  /** Y range as [min, max, step]. Default: [-3, 3, 0.5] */
  yRange?: [number, number, number];
  /** Length scaling factor for vectors. Default: 1 */
  lengthScale?: number;
  /** Color function or static color. Default: magnitude-based gradient */
  color?: string | ColorFunction;
  /** Minimum magnitude threshold. Default: 0 */
  minMagnitude?: number;
  /** Maximum magnitude threshold. Default: Infinity */
  maxMagnitude?: number;
  /** Stroke width. Default: 2 */
  strokeWidth?: number;
  /** Opacity. Default: 1 */
  opacity?: number;
}

/**
 * Options for ArrowVectorField
 */
export interface ArrowVectorFieldOptions extends VectorFieldBaseOptions {
  /** Length of arrow tips. Default: 0.15 */
  tipLength?: number;
  /** Maximum visual length for each arrow. Default: 0.8 */
  maxArrowLength?: number;
  /** Whether to normalize all arrows to same length. Default: false */
  normalizeArrows?: boolean;
}

/**
 * Python manim's default colors for scalar fields: BLUE_E → GREEN → YELLOW → RED
 */
const SCALAR_FIELD_COLORS: [number, number, number][] = [
  [0x23 / 255, 0x6b / 255, 0x8e / 255], // BLUE_E  #236B8E
  [0x83 / 255, 0xc1 / 255, 0x67 / 255], // GREEN   #83C167
  [0xff / 255, 0xff / 255, 0x00 / 255], // YELLOW  #FFFF00
  [0xfc / 255, 0x62 / 255, 0x55 / 255], // RED     #FC6255
];

/**
 * Default color function mapping magnitude to gradient
 */
function defaultColorFunction(magnitude: number): string {
  const t = Math.min(Math.max(magnitude / 2, 0), 1);
  const n = SCALAR_FIELD_COLORS.length;
  const idx = t * (n - 1);
  const lo = Math.min(Math.floor(idx), n - 2);
  const frac = idx - lo;
  const c0 = SCALAR_FIELD_COLORS[lo];
  const c1 = SCALAR_FIELD_COLORS[lo + 1];
  const r = Math.round((c0[0] + (c1[0] - c0[0]) * frac) * 255);
  const g = Math.round((c0[1] + (c1[1] - c0[1]) * frac) * 255);
  const b = Math.round((c0[2] + (c1[2] - c0[2]) * frac) * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * VectorField - Base class for vector field visualizations
 */
export class VectorField extends Group {
  protected _func: VectorFunction;
  protected _xRange: [number, number, number];
  protected _yRange: [number, number, number];
  protected _lengthScale: number;
  protected _colorFunc: ColorFunction;
  protected _minMagnitude: number;
  protected _maxMagnitude: number;
  protected _strokeWidth: number;
  protected _opacity: number;

  constructor(options: VectorFieldBaseOptions) {
    super();

    const {
      func,
      xRange = [-5, 5, 0.5],
      yRange = [-3, 3, 0.5],
      lengthScale = 1,
      color,
      minMagnitude = 0,
      maxMagnitude = Infinity,
      strokeWidth = 2,
      opacity = 1,
    } = options;

    this._func = func;
    this._xRange = [...xRange];
    this._yRange = [...yRange];
    this._lengthScale = lengthScale;
    this._minMagnitude = minMagnitude;
    this._maxMagnitude = maxMagnitude;
    this._strokeWidth = strokeWidth;
    this._opacity = opacity;

    // Set up color function
    if (typeof color === 'function') {
      this._colorFunc = color;
    } else if (typeof color === 'string') {
      this._colorFunc = () => color;
    } else {
      this._colorFunc = defaultColorFunction;
    }
  }

  /**
   * Generate grid sample points
   */
  protected _generateGridPoints(): [number, number][] {
    const points: [number, number][] = [];
    const [xMin, xMax, xStep] = this._xRange;
    const [yMin, yMax, yStep] = this._yRange;

    for (let x = xMin; x <= xMax + xStep * 0.01; x += xStep) {
      for (let y = yMin; y <= yMax + yStep * 0.01; y += yStep) {
        points.push([x, y]);
      }
    }

    return points;
  }

  /**
   * Evaluate the vector function at a point
   */
  protected _evaluateVector(x: number, y: number): [number, number] {
    const [vx, vy] = this._func(x, y);
    const magnitude = Math.sqrt(vx * vx + vy * vy);

    if (magnitude < this._minMagnitude) {
      return [0, 0];
    }

    if (magnitude > this._maxMagnitude) {
      const scale = this._maxMagnitude / magnitude;
      return [vx * scale, vy * scale];
    }

    return [vx, vy];
  }

  /**
   * Get the color for a vector at a point
   */
  protected _getColor(x: number, y: number, vx: number, vy: number): string {
    const magnitude = Math.sqrt(vx * vx + vy * vy);
    return this._colorFunc(magnitude, x, y, vx, vy);
  }

  /**
   * Calculate magnitude
   */
  protected _magnitude(vx: number, vy: number): number {
    return Math.sqrt(vx * vx + vy * vy);
  }

  /**
   * Get the vector function
   */
  getFunction(): VectorFunction {
    return this._func;
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
}

/**
 * ArrowVectorField - Vector field using arrows
 *
 * @example
 * ```typescript
 * const field = new ArrowVectorField({
 *   func: (x, y) => [-y, x],  // Rotation field
 *   xRange: [-3, 3, 0.5],
 *   yRange: [-3, 3, 0.5],
 *   color: (mag) => mag > 0.5 ? '#ff0000' : '#0000ff'
 * });
 * ```
 */
export class ArrowVectorField extends VectorField {
  private _tipLength: number;
  private _maxArrowLength: number;
  private _normalizeArrows: boolean;

  constructor(options: ArrowVectorFieldOptions) {
    super(options);

    const {
      tipLength = 0.15,
      maxArrowLength = options.xRange ? options.xRange[2] * 0.8 : 0.4,
      normalizeArrows = false,
    } = options;

    this._tipLength = tipLength;
    this._maxArrowLength = maxArrowLength;
    this._normalizeArrows = normalizeArrows;

    this._generateArrows();
  }

  /**
   * Generate arrows at each grid point
   */
  private _generateArrows(): void {
    this.children = [];

    const points = this._generateGridPoints();

    for (const [x, y] of points) {
      const [vx, vy] = this._evaluateVector(x, y);
      const magnitude = this._magnitude(vx, vy);

      if (magnitude < 1e-10) {
        continue;
      }

      const dirX = vx / magnitude;
      const dirY = vy / magnitude;

      let arrowLength: number;
      if (this._normalizeArrows) {
        arrowLength = this._maxArrowLength * this._lengthScale;
      } else {
        arrowLength = Math.min(magnitude * this._lengthScale, this._maxArrowLength);
      }

      const endX = x + dirX * arrowLength;
      const endY = y + dirY * arrowLength;

      const color = this._getColor(x, y, vx, vy);

      const arrow = new Arrow({
        start: [x, y, 0] as Vec3,
        end: [endX, endY, 0] as Vec3,
        color,
        strokeWidth: this._strokeWidth,
        tipLength: Math.min(this._tipLength, arrowLength * 0.4),
        tipWidth: Math.min(this._tipLength * 0.6, arrowLength * 0.25),
      });
      arrow.opacity = this._opacity;

      this.add(arrow);
    }
  }
}
