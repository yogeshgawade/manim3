import { VMobject } from '../../core/VMobject';
import { Mobject } from '../../core/Mobject';
import { Line } from '../geometry/Line';
import { MathTex } from '../text/MathTex';

/**
 * Options for creating a NumberLine
 */
export interface NumberLineOptions {
  /** Range as [min, max, step]. Default: [-5, 5, 1] */
  xRange?: [number, number, number];
  /** Visual length of the number line. Default: 10 */
  length?: number;
  /** Stroke color as CSS color string. Default: '#ffffff' */
  color?: string;
  /** Stroke width in pixels. Default: 2 */
  strokeWidth?: number;
  /** Whether to include tick marks. Default: true */
  includeTicks?: boolean;
  /** Size of tick marks. Default: 0.2 */
  tickSize?: number;
  /** Whether to include number labels. Default: false */
  includeNumbers?: boolean;
  /** Numbers to exclude from labels. Default: [] */
  numbersToExclude?: number[];
  /** Specific numbers to show as labels (overrides includeNumbers). */
  numbersToInclude?: number[];
  /** Numbers that get elongated (taller) tick marks. */
  numbersWithElongatedTicks?: number[];
  /** Decimal places for number labels. Default: 0 */
  decimalPlaces?: number;
  /** Font size for number labels. Default: 28 */
  numberFontSize?: number;
}

/**
 * NumberLine - A line with tick marks for representing a range of numbers
 *
 * Creates a horizontal line with tick marks at regular intervals.
 * Can optionally display number labels at each tick.
 *
 * @example
 * ```typescript
 * // Create a simple number line from -5 to 5
 * const numberLine = new NumberLine();
 *
 * // Create a number line with custom range and labels
 * const labeledLine = new NumberLine({
 *   xRange: [0, 10, 2],
 *   length: 8,
 *   includeNumbers: true
 * });
 * ```
 */
export class NumberLine extends VMobject {
  private _xRange: [number, number, number];
  private _length: number;
  private _includeTicks: boolean;
  private _tickSize: number;
  private _includeNumbers: boolean;
  private _numbersToExclude: number[];
  private _numbersToInclude: number[] | null;
  private _numbersWithElongatedTicks: number[];
  private _decimalPlaces: number;
  private _numberFontSize: number;
  private _tickMarks: VMobject[] = [];
  private _numberLabels: Mobject[] = [];

  constructor(options: NumberLineOptions = {}) {
    super();

    const {
      xRange = [-5, 5, 1],
      length = 10,
      color = '#ffffff',
      strokeWidth = 2,
      includeTicks = true,
      tickSize = 0.2,
      includeNumbers = false,
      numbersToExclude = [],
      numbersToInclude,
      numbersWithElongatedTicks = [],
      decimalPlaces = 0,
      numberFontSize = 28,
    } = options;

    this._xRange = [...xRange];
    this._length = length;
    this._includeTicks = includeTicks;
    this._tickSize = tickSize;
    this._includeNumbers = includeNumbers;
    this._numbersToExclude = [...numbersToExclude];
    this._numbersToInclude = numbersToInclude ? [...numbersToInclude] : null;
    this._numbersWithElongatedTicks = [...numbersWithElongatedTicks];
    this._decimalPlaces = decimalPlaces;
    this._numberFontSize = numberFontSize;

    // Set line properties
    this.fillColor = color;
    this.fillOpacity = 0;

    this._generate();
  }

  /**
   * Generate the number line with ticks and labels
   */
  private _generate(): void {
    const [min, max, step] = this._xRange;
    const unitLength = this._length / (max - min);

    // Generate main line points (horizontal from left to right)
    const startX = min * unitLength;
    const endX = max * unitLength;

    // Create line as VMobject with bezier points
    const linePoints: number[][] = [
      [startX, 0, 0],
      [(startX + endX) / 2, 0, 0],
      [(startX + endX) / 2, 0, 0],
      [endX, 0, 0],
    ];
    this.setPoints3D(linePoints);

    // Generate ticks
    if (this._includeTicks) {
      this._generateTicks(min, max, step, unitLength);
    }
  }

  /**
   * Generate tick marks along the number line
   */
  private _generateTicks(min: number, max: number, step: number, unitLength: number): void {
    this._tickMarks = [];
    this._numberLabels = [];

    // Use a small epsilon to handle floating point comparison
    const epsilon = step * 1e-6;

    for (let x = min; x <= max + epsilon; x += step) {
      // Round to avoid floating point errors
      const roundedX = Math.round(x / step) * step;
      const displayX = Number(roundedX.toFixed(this._decimalPlaces));

      // Skip excluded numbers
      if (this._numbersToExclude.includes(displayX)) {
        continue;
      }

      // Check if we should include this number
      let shouldIncludeNumber = this._includeNumbers;
      if (this._numbersToInclude !== null) {
        shouldIncludeNumber = this._numbersToInclude.includes(displayX);
      }

      const xPos = displayX * unitLength;

      // Determine tick size (elongated for special numbers)
      let tickHeight = this._tickSize;
      if (this._numbersWithElongatedTicks.includes(displayX)) {
        tickHeight *= 2;
      }

      // Create tick mark
      const tick = new Line({
        start: [xPos, -tickHeight / 2, 0],
        end: [xPos, tickHeight / 2, 0],
        color: this.fillColor,
        strokeWidth: 2,
      });
      this._tickMarks.push(tick);
      this.add(tick); // Add as child to inherit transforms

      // Create number label if needed
      if (shouldIncludeNumber) {
        const label = this._createNumberLabel(displayX, xPos, tickHeight);
        this._numberLabels.push(label);
      }
    }
  }

  /**
   * Create a number label at the specified position
   */
  private _createNumberLabel(value: number, xPos: number, tickHeight: number): Mobject {
    // Format the number
    let labelText: string;
    if (this._decimalPlaces === 0) {
      labelText = Math.round(value).toString();
    } else {
      labelText = value.toFixed(this._decimalPlaces);
    }

    // Create MathTex for the label
    const label = new MathTex({
      latex: labelText,
      fontSize: this._numberFontSize,
    });

    // Position label below the tick
    label.position[0] = xPos;
    label.position[1] = -tickHeight / 2 - 0.3;

    return label;
  }

  /**
   * Get the position along the number line for a given value
   * @param value - The number to locate
   * @returns The x-coordinate in scene space
   */
  numberToPoint(value: number): number {
    const [min, max] = this._xRange;
    const unitLength = this._length / (max - min);
    return value * unitLength;
  }

  /**
   * Get the value at a given position along the number line
   * @param point - The x-coordinate in scene space
   * @returns The corresponding number value
   */
  pointToNumber(point: number): number {
    const [min, max] = this._xRange;
    const unitLength = this._length / (max - min);
    return point / unitLength;
  }

  /**
   * Get the tick marks
   */
  getTickMarks(): VMobject[] {
    return [...this._tickMarks];
  }

  /**
   * Get the number labels
   */
  getNumberLabels(): Mobject[] {
    return [...this._numberLabels];
  }

  /**
   * Get all submobjects (ticks + labels)
   */
  getSubmobjects(): Mobject[] {
    return [...this._tickMarks, ...this._numberLabels];
  }

  /**
   * Get the X range
   */
  getXRange(): [number, number, number] {
    return [...this._xRange];
  }

  /**
   * Get the length
   */
  getLength(): number {
    return this._length;
  }

  /**
   * Set the length and regenerate
   */
  setLength(length: number): this {
    this._length = length;
    this._generate();
    this.markDirty();
    return this;
  }

  /**
   * Create a copy of this NumberLine
   */
  protected _createCopy(): NumberLine {
    return new NumberLine({
      xRange: this._xRange,
      length: this._length,
      color: this.fillColor,
      strokeWidth: 2,
      includeTicks: this._includeTicks,
      tickSize: this._tickSize,
      includeNumbers: this._includeNumbers,
      numbersToExclude: this._numbersToExclude,
      numbersToInclude: this._numbersToInclude || undefined,
      numbersWithElongatedTicks: this._numbersWithElongatedTicks,
      decimalPlaces: this._decimalPlaces,
      numberFontSize: this._numberFontSize,
    });
  }
}
