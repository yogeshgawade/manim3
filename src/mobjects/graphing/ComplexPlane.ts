import { NumberPlane, NumberPlaneOptions } from './NumberPlane';

/**
 * Options for creating ComplexPlane
 */
export interface ComplexPlaneOptions extends NumberPlaneOptions {
  /** Label for real axis. Default: 'Re' */
  realLabel?: string;
  /** Label for imaginary axis. Default: 'Im' */
  imaginaryLabel?: string;
}

/**
 * ComplexPlane - A coordinate plane for complex numbers
 *
 * Extends NumberPlane with the x-axis representing the real part
 * and the y-axis representing the imaginary part of complex numbers.
 *
 * @example
 * ```typescript
 * // Create a complex plane
 * const plane = new ComplexPlane();
 *
 * // Convert complex number to point
 * const point = plane.complexToPoint({ real: 3, imag: 2 });
 *
 * // Convert point back to complex
 * const c = plane.pointToComplex(point);
 * ```
 */
export class ComplexPlane extends NumberPlane {
  private _realLabel: string;
  private _imaginaryLabel: string;

  constructor(options: ComplexPlaneOptions = {}) {
    const {
      realLabel = 'Re',
      imaginaryLabel = 'Im',
      ...planeOptions
    } = options;

    super(planeOptions);

    this._realLabel = realLabel;
    this._imaginaryLabel = imaginaryLabel;
  }

  /**
   * Convert a complex number to a point in scene coordinates
   * @param c - Complex number with real and imag properties, or [real, imag] tuple
   * @returns [x, y, z] position in scene space
   */
  complexToPoint(c: { real: number; imag: number } | [number, number]): [number, number, number] {
    let real: number;
    let imag: number;

    if (Array.isArray(c)) {
      [real, imag] = c;
    } else {
      real = c.real;
      imag = c.imag;
    }

    return this.coordsToPoint(real, imag);
  }

  /**
   * Convert a point in scene coordinates to a complex number
   * @param point - [x, y, z] position in scene space
   * @returns Complex number as { real, imag } object
   */
  pointToComplex(point: [number, number, number]): { real: number; imag: number } {
    const [real, imag] = this.pointToCoords(point);
    return { real, imag };
  }

  /**
   * Get the real axis label
   */
  getRealLabel(): string {
    return this._realLabel;
  }

  /**
   * Get the imaginary axis label
   */
  getImaginaryLabel(): string {
    return this._imaginaryLabel;
  }

  /**
   * Create a copy of this ComplexPlane
   */
  protected _createCopy(): ComplexPlane {
    return new ComplexPlane({
      xRange: this.getXRange(),
      yRange: this.getYRange(),
      xLength: this.getXLength(),
      yLength: this.getYLength(),
      realLabel: this._realLabel,
      imaginaryLabel: this._imaginaryLabel,
      backgroundGrid: true,
      fadedLines: true,
    });
  }
}
