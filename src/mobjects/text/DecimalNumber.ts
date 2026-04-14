/**
 * DecimalNumber - A text mobject that displays a number and can be animated
 *
 * This module provides number display capabilities with configurable decimal places,
 * sign display, and unit support. Designed to work with ValueTracker for animations.
 *
 * @example
 * ```typescript
 * // Create a simple decimal number
 * const num = new DecimalNumber({ value: 3.14159 });
 *
 * // Create with custom formatting
 * const percentage = new DecimalNumber({
 *   value: 75.5,
 *   numDecimalPlaces: 1,
 *   includeSign: true,
 *   unit: '%'
 * });
 *
 * // Animate value change
 * num.setValue(42);
 * ```
 */

import { Text, TextOptions, RESOLUTION_SCALE, PIXEL_TO_WORLD } from './Text';

/**
 * Options for creating a DecimalNumber mobject
 */
export interface DecimalNumberOptions extends Omit<TextOptions, 'text'> {
  /** The numeric value to display. Default: 0 */
  value?: number;
  /** Number of decimal places to show. Default: 2 */
  numDecimalPlaces?: number;
  /** Whether to show ellipsis (...) after the number. Default: false */
  showEllipsis?: boolean;
  /** Whether to show + sign for positive numbers. Default: false */
  includeSign?: boolean;
  /** Group digits with separator (e.g., 1,000). Default: false */
  groupWithCommas?: boolean;
  /** Edge to preserve when number width changes. Default: null (center) */
  edgeToFix?: 'left' | 'right' | null;
  /** Unit string to append (e.g., '%', 'm/s'). Default: '' */
  unit?: string;
  /** Buffer between number and unit. Default: 0.05 */
  unitBuff?: number;
}

export class DecimalNumber extends Text {
  protected _value: number;
  protected _numDecimalPlaces: number;
  protected _showEllipsis: boolean;
  protected _includeSign: boolean;
  protected _groupWithCommas: boolean;
  protected _edgeToFix: 'left' | 'right' | null;
  protected _unit: string;
  protected _unitBuff: number;

  /** Previous edge position for edge-fixing */
  protected _previousEdgePosition: number | null = null;

  constructor(options: DecimalNumberOptions = {}) {
    const {
      value = 0,
      numDecimalPlaces = 2,
      showEllipsis = false,
      includeSign = false,
      groupWithCommas = false,
      edgeToFix = null,
      unit = '',
      unitBuff = 0.05,
      ...textOptions
    } = options;

    // Initialize with formatted text
    super({
      text: '',
      fontFamily: 'monospace',
      ...textOptions,
    });

    this._value = value;
    this._numDecimalPlaces = numDecimalPlaces;
    this._showEllipsis = showEllipsis;
    this._includeSign = includeSign;
    this._groupWithCommas = groupWithCommas;
    this._edgeToFix = edgeToFix;
    this._unit = unit;
    this._unitBuff = unitBuff;

    // Set initial text
    this._text = this._formatNumber();
    this._canvasDirty = true;
    this._renderToCanvas();
  }

  /**
   * Get the current numeric value
   */
  getValue(): number {
    return this._value;
  }

  /**
   * Set the numeric value and update display
   */
  setValue(value: number): this {
    const oldWidth = this._worldWidth;
    const oldEdgeX = this._getEdgeX();

    this._value = value;
    this._text = this._formatNumber();
    this._canvasDirty = true;
    this._renderToCanvas();

    // Fix edge position if requested
    if (this._edgeToFix && oldWidth > 0) {
      const newEdgeX = this._getEdgeX();
      const drift = oldEdgeX - newEdgeX;
      this.position[0] += drift;
    }

    this.markDirty();
    return this;
  }

  /**
   * Get the X position of the edge being fixed
   */
  protected _getEdgeX(): number {
    if (this._edgeToFix === 'left') {
      return this.position[0] - this._worldWidth / 2;
    } else if (this._edgeToFix === 'right') {
      return this.position[0] + this._worldWidth / 2;
    }
    return this.position[0];
  }

  /**
   * Get the number of decimal places
   */
  getNumDecimalPlaces(): number {
    return this._numDecimalPlaces;
  }

  /**
   * Set the number of decimal places
   */
  setNumDecimalPlaces(places: number): this {
    this._numDecimalPlaces = Math.max(0, Math.floor(places));
    this._text = this._formatNumber();
    this._canvasDirty = true;
    this._renderToCanvas();
    this.markDirty();
    return this;
  }

  /**
   * Format the number as a string
   */
  protected _formatNumber(): string {
    // Guard against undefined during construction (super() calls render before init)
    if (this._value === undefined) {
      return '';
    }

    let str: string;

    if (this._numDecimalPlaces >= 0) {
      str = this._value.toFixed(this._numDecimalPlaces);
    } else {
      str = this._value.toString();
    }

    // Add sign for positive numbers if requested
    if (this._includeSign && this._value > 0) {
      str = '+' + str;
    }

    // Group with commas if requested
    if (this._groupWithCommas) {
      const parts = str.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      str = parts.join('.');
    }

    // Add unit
    if (this._unit) {
      str += this._unit;
    }

    // Add ellipsis if requested
    if (this._showEllipsis) {
      str += '...';
    }

    return str;
  }

  /**
   * Override _measureText for single-line number display
   */
  protected override _measureText(): { lines: string[]; width: number; height: number } {
    if (!this._ctx) {
      return { lines: [], width: 0, height: 0 };
    }

    this._ctx.font = this._buildFontString();
    const text = this._formatNumber();
    const scaledFontSize = this._fontSize * RESOLUTION_SCALE;

    const metrics = this._ctx.measureText(text);
    const width = Math.ceil(metrics.width);
    const height = Math.ceil(scaledFontSize * 1.2);

    // Add padding
    const padding = scaledFontSize * 0.2;
    return {
      lines: [text],
      width: width + padding * 2,
      height: height + padding * 2,
    };
  }

  /**
   * Override _renderToCanvas for centered number display
   */
  protected override _renderToCanvas(): void {
    if (!this._canvas || !this._ctx) {
      return;
    }

    const { width, height } = this._measureText();

    // Resize canvas
    this._canvas.width = width || 1;
    this._canvas.height = height || 1;

    // Clear canvas (transparent background)
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    // Set font and styles
    this._ctx.font = this._buildFontString();
    this._ctx.textBaseline = 'middle';
    this._ctx.textAlign = 'center';

    const text = this._formatNumber();

    // Draw fill
    this._ctx.fillStyle = this.color;
    this._ctx.globalAlpha = this.fillOpacity;
    this._ctx.fillText(text, width / 2, height / 2);

    // Store world dimensions
    this._worldWidth = (width / RESOLUTION_SCALE) * PIXEL_TO_WORLD;
    this._worldHeight = (height / RESOLUTION_SCALE) * PIXEL_TO_WORLD;

    // Note: _canvasDirty is NOT cleared here - TextRenderNode clears it after updating texture
  }
}

/**
 * Integer - A DecimalNumber with zero decimal places
 *
 * Convenience class for displaying integers without decimal points.
 *
 * @example
 * ```typescript
 * const count = new Integer({ value: 42 });
 * count.setValue(100);
 * ```
 */
export class Integer extends DecimalNumber {
  constructor(options: Omit<DecimalNumberOptions, 'numDecimalPlaces'> = {}) {
    super({
      ...options,
      numDecimalPlaces: 0,
    });
  }
}
