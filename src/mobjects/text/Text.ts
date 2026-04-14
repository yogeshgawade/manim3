/**
 * Text - A text mobject rendered using Canvas 2D to a texture
 *
 * Uses Canvas 2D APIs to render text to an off-screen canvas.
 * The TextRenderNode creates a Three.js textured plane from this canvas.
 *
 * @example
 * ```typescript
 * // Create simple text
 * const text = new Text({ text: 'Hello World' });
 *
 * // Create styled text
 * const styled = new Text({
 *   text: 'Styled Text',
 *   fontSize: 72,
 *   fontFamily: 'Georgia',
 *   color: '#ff6600',
 *   fontWeight: 'bold'
 * });
 *
 * // Multi-line text
 * const multiline = new Text({ text: 'Line 1\nLine 2\nLine 3' });
 * ```
 */

import { Mobject } from '../../core/Mobject';
import type { Vec3 } from '../../core/types';

/**
 * Options for creating a Text mobject
 */
export interface TextOptions {
  /** The text content to display */
  text: string;
  /** Font size in pixels. Default: 48 */
  fontSize?: number;
  /** Font family. Default: 'CMU Serif, Georgia, Times New Roman, serif' */
  fontFamily?: string;
  /** Font weight. Default: 'normal' */
  fontWeight?: string | number;
  /** Font style ('normal' | 'italic'). Default: 'normal' */
  fontStyle?: string;
  /** Text color as CSS color string. Default: '#ffffff' */
  color?: string;
  /** Fill opacity from 0 to 1. Default: 1 */
  fillOpacity?: number;
  /** Line height multiplier. Default: 1.2 */
  lineHeight?: number;
  /** Letter spacing in pixels. Default: 0 */
  letterSpacing?: number;
  /** Text alignment. Default: 'center' */
  textAlign?: 'left' | 'center' | 'right';
  /** Position in 3D space. Default: [0, 0, 0] */
  position?: Vec3;
}

/** Scale factor: pixels to world units (100 pixels = 1 world unit) */
export const PIXEL_TO_WORLD = 1 / 100;

/** Resolution multiplier for crisp text on retina displays */
export const RESOLUTION_SCALE = 2;

export class Text extends Mobject {
  protected _text: string;
  protected _fontSize: number;
  protected _fontFamily: string;
  protected _fontWeight: string | number;
  protected _fontStyle: string;
  protected _lineHeight: number;
  protected _letterSpacing: number;
  protected _textAlign: 'left' | 'center' | 'right';

  /** Flag to track when canvas content needs re-rendering */
  protected _canvasDirty: boolean = true;

  /** Off-screen canvas for text rendering */
  protected _canvas: HTMLCanvasElement | null = null;
  protected _ctx: CanvasRenderingContext2D | null = null;

  /** Cached dimensions in world units */
  protected _worldWidth: number = 0;
  protected _worldHeight: number = 0;

  constructor(options: TextOptions) {
    super();

    const {
      text,
      fontSize = 48,
      fontFamily = 'CMU Serif, Georgia, Times New Roman, serif',
      fontWeight = 'normal',
      fontStyle = 'normal',
      color = '#ffffff',
      fillOpacity = 1,
      lineHeight = 1.2,
      letterSpacing = 0,
      textAlign = 'center',
      position = [0, 0, 0],
    } = options;

    this._text = text;
    this._fontSize = fontSize;
    this._fontFamily = fontFamily;
    this._fontWeight = fontWeight;
    this._fontStyle = fontStyle;
    this._lineHeight = lineHeight;
    this._letterSpacing = letterSpacing;
    this._textAlign = textAlign;

    this.color = color;
    this.fillOpacity = fillOpacity;
    this.position = [...position];

    // Initialize canvas
    this._initCanvas();
    this._renderToCanvas();
  }

  /**
   * Initialize the off-screen canvas
   */
  protected _initCanvas(): void {
    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');
    if (!this._ctx) {
      throw new Error('Failed to get 2D context for text rendering');
    }
  }

  /**
   * Get the canvas element (used by TextRenderNode)
   */
  getCanvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  /**
   * Check if canvas needs to be re-rendered
   */
  isCanvasDirty(): boolean {
    return this._canvasDirty;
  }

  /**
   * Mark canvas as clean after rendering
   */
  markCanvasClean(): void {
    this._canvasDirty = false;
  }

  /**
   * Force re-render of the canvas
   */
  refreshCanvas(): void {
    this._canvasDirty = true;
    this._renderToCanvas();
    this.markDirty();
  }

  /**
   * Get the current text content
   */
  getText(): string {
    return this._text;
  }

  /**
   * Set new text content and re-render
   */
  setText(text: string): this {
    this._text = text;
    this._canvasDirty = true;
    this._renderToCanvas();
    this.markDirty();
    return this;
  }

  /**
   * Get the current font size
   */
  getFontSize(): number {
    return this._fontSize;
  }

  /**
   * Set font size and re-render
   */
  setFontSize(size: number): this {
    this._fontSize = size;
    this._canvasDirty = true;
    this._renderToCanvas();
    this.markDirty();
    return this;
  }

  /**
   * Get the current font family
   */
  getFontFamily(): string {
    return this._fontFamily;
  }

  /**
   * Set font family and re-render
   */
  setFontFamily(family: string): this {
    this._fontFamily = family;
    this._canvasDirty = true;
    this._renderToCanvas();
    this.markDirty();
    return this;
  }

  /**
   * Get text width in world units
   */
  getWidth(): number {
    return this._worldWidth;
  }

  /**
   * Get text height in world units
   */
  getHeight(): number {
    return this._worldHeight;
  }

  /**
   * Get current world dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this._worldWidth, height: this._worldHeight };
  }

  /**
   * Build the CSS font string
   */
  protected _buildFontString(): string {
    const style = this._fontStyle === 'italic' ? 'italic' : 'normal';
    const weight =
      typeof this._fontWeight === 'number' ? this._fontWeight.toString() : this._fontWeight;
    const size = Math.round(this._fontSize * RESOLUTION_SCALE);
    return `${style} ${weight} ${size}px ${this._fontFamily}`;
  }

  /**
   * Split text into lines and measure dimensions
   */
  protected _measureText(): { lines: string[]; width: number; height: number } {
    if (!this._ctx) {
      return { lines: [], width: 0, height: 0 };
    }

    this._ctx.font = this._buildFontString();
    const lines = this._text.split('\n');
    const scaledFontSize = this._fontSize * RESOLUTION_SCALE;
    const scaledLineHeight = scaledFontSize * this._lineHeight;

    // Measure each line width
    let maxWidth = 0;
    for (const line of lines) {
      const metrics = this._ctx.measureText(line);
      const lineWidth = metrics.width + (line.length - 1) * this._letterSpacing * RESOLUTION_SCALE;
      maxWidth = Math.max(maxWidth, lineWidth);
    }

    // Calculate total height
    const totalHeight = lines.length * scaledLineHeight;

    // Add padding
    const padding = scaledFontSize * 0.2;
    const width = Math.ceil(maxWidth + padding * 2);
    const height = Math.ceil(totalHeight + padding * 2);

    return { lines, width, height };
  }

  /**
   * Render text to the off-screen canvas
   */
  protected _renderToCanvas(): void {
    if (!this._canvas || !this._ctx) {
      return;
    }

    const { lines, width, height } = this._measureText();

    // Resize canvas
    this._canvas.width = width || 1;
    this._canvas.height = height || 1;

    // Clear canvas (transparent background)
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    // Set font and styles
    this._ctx.font = this._buildFontString();
    this._ctx.textBaseline = 'top';
    this._ctx.textAlign = this._textAlign;

    const scaledFontSize = this._fontSize * RESOLUTION_SCALE;
    const scaledLineHeight = scaledFontSize * this._lineHeight;
    const padding = scaledFontSize * 0.2;

    // Calculate x position based on alignment
    let textX: number;
    switch (this._textAlign) {
      case 'left':
        textX = padding;
        break;
      case 'right':
        textX = width - padding;
        break;
      case 'center':
      default:
        textX = width / 2;
        break;
    }

    // Draw each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const y = padding + i * scaledLineHeight;

      // Apply letter spacing if needed
      if (this._letterSpacing > 0) {
        this._drawTextWithLetterSpacing(line, textX, y, scaledFontSize);
      } else {
        // Draw fill
        this._ctx.fillStyle = this.color;
        this._ctx.globalAlpha = this.fillOpacity;
        this._ctx.fillText(line, textX, y);
      }
    }

    // Store world dimensions
    this._worldWidth = (width / RESOLUTION_SCALE) * PIXEL_TO_WORLD;
    this._worldHeight = (height / RESOLUTION_SCALE) * PIXEL_TO_WORLD;

    // Note: _canvasDirty is NOT cleared here - TextRenderNode clears it after updating texture
  }

  /**
   * Draw text with custom letter spacing
   */
  protected _drawTextWithLetterSpacing(
    text: string,
    startX: number,
    y: number,
    _fontSize: number,
  ): void {
    if (!this._ctx) return;

    const scaledSpacing = this._letterSpacing * RESOLUTION_SCALE;
    let currentX = startX;

    // Adjust starting position based on alignment
    if (this._textAlign === 'center') {
      const totalWidth = this._ctx.measureText(text).width + (text.length - 1) * scaledSpacing;
      currentX = startX - totalWidth / 2;
    } else if (this._textAlign === 'right') {
      const totalWidth = this._ctx.measureText(text).width + (text.length - 1) * scaledSpacing;
      currentX = startX - totalWidth;
    }

    this._ctx.textAlign = 'left';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Draw fill
      this._ctx.fillStyle = this.color;
      this._ctx.globalAlpha = this.fillOpacity;
      this._ctx.fillText(char, currentX, y);

      currentX += this._ctx.measureText(char).width + scaledSpacing;
    }

    // Restore alignment
    this._ctx.textAlign = this._textAlign;
  }

  /**
   * Get the center of this text mobject
   */
  override getCenter(): Vec3 {
    return [...this.position] as Vec3;
  }
}
