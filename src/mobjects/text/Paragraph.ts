/**
 * Paragraph - A text mobject with automatic word wrapping
 *
 * Extends Text to add word wrapping functionality. Text is wrapped
 * to fit within a specified width, with configurable alignment.
 *
 * @example
 * ```typescript
 * // Create a paragraph with max width
 * const para = new Paragraph({
 *   text: 'This is a long paragraph that will automatically wrap to fit.',
 *   width: 4,  // 4 world units
 *   alignment: 'justify'
 * });
 *
 * // Update width to trigger re-wrap
 * para.setWidth(3);
 * ```
 */

import { Text, TextOptions, PIXEL_TO_WORLD, RESOLUTION_SCALE } from './Text';

/**
 * Options for creating a Paragraph mobject
 */
export interface ParagraphOptions extends TextOptions {
  /** Maximum width in world units for text wrapping */
  width?: number;
  /** Text alignment within the paragraph. Default: 'left' */
  alignment?: 'left' | 'center' | 'right' | 'justify';
}

export class Paragraph extends Text {
  protected _maxWidth: number;
  protected _alignment: 'left' | 'center' | 'right' | 'justify';
  protected _wrappedLines: string[] = [];

  constructor(options: ParagraphOptions) {
    // Set text alignment to match paragraph alignment
    const alignment = options.alignment || 'left';
    const textAlign = alignment === 'justify' ? 'left' : alignment;

    super({
      ...options,
      textAlign,
    });

    this._maxWidth = options.width || Infinity;
    this._alignment = alignment;

    // Re-render with wrapping applied
    this._renderToCanvas();
  }

  /**
   * Get the maximum width for text wrapping
   */
  getMaxWidth(): number {
    return this._maxWidth;
  }

  /**
   * Set maximum width and trigger re-wrap
   */
  setWidth(width: number): this {
    this._maxWidth = width;
    this._canvasDirty = true;
    this._renderToCanvas();
    this.markDirty();
    return this;
  }

  /**
   * Get the paragraph alignment
   */
  getAlignment(): 'left' | 'center' | 'right' | 'justify' {
    return this._alignment;
  }

  /**
   * Set paragraph alignment
   */
  setAlignment(alignment: 'left' | 'center' | 'right' | 'justify'): this {
    this._alignment = alignment;
    this._textAlign = alignment === 'justify' ? 'left' : alignment;
    this._canvasDirty = true;
    this._renderToCanvas();
    this.markDirty();
    return this;
  }

  /**
   * Wrap text to fit within max width
   */
  protected _wrapText(): string[] {
    if (!this._ctx) {
      return this._text.split('\n');
    }

    this._ctx.font = this._buildFontString();

    // Convert world units to pixels for comparison
    const maxWidthPixels =
      this._maxWidth === Infinity ? Infinity : (this._maxWidth / PIXEL_TO_WORLD) * RESOLUTION_SCALE;

    const paragraphs = this._text.split('\n');
    const wrappedLines: string[] = [];

    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        wrappedLines.push('');
        continue;
      }

      const words = paragraph.split(/\s+/);
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = this._ctx.measureText(testLine);
        const testWidth =
          metrics.width + (testLine.length - 1) * this._letterSpacing * RESOLUTION_SCALE;

        if (testWidth <= maxWidthPixels || currentLine === '') {
          currentLine = testLine;
        } else {
          wrappedLines.push(currentLine);
          currentLine = word;
        }
      }

      if (currentLine) {
        wrappedLines.push(currentLine);
      }
    }

    return wrappedLines;
  }

  /**
   * Override measure text to use wrapped lines
   */
  protected override _measureText(): { lines: string[]; width: number; height: number } {
    if (!this._ctx) {
      return { lines: [], width: 0, height: 0 };
    }

    this._ctx.font = this._buildFontString();
    const lines = this._wrapText();
    this._wrappedLines = lines;

    const scaledFontSize = this._fontSize * RESOLUTION_SCALE;
    const scaledLineHeight = scaledFontSize * this._lineHeight;

    // Measure each line width
    let maxWidth = 0;
    for (const line of lines) {
      const metrics = this._ctx.measureText(line);
      const lineWidth = metrics.width + (line.length - 1) * this._letterSpacing * RESOLUTION_SCALE;
      maxWidth = Math.max(maxWidth, lineWidth);
    }

    // If we have a max width constraint, use it
    if (this._maxWidth !== Infinity) {
      const maxWidthPixels = (this._maxWidth / PIXEL_TO_WORLD) * RESOLUTION_SCALE;
      maxWidth = Math.min(maxWidth, maxWidthPixels);
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
   * Render text to canvas with justification support
   */
  protected override _renderToCanvas(): void {
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

    const scaledFontSize = this._fontSize * RESOLUTION_SCALE;
    const scaledLineHeight = scaledFontSize * this._lineHeight;
    const padding = scaledFontSize * 0.2;

    // Draw each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const y = padding + i * scaledLineHeight;

      // Use regular alignment
      let textX: number;
      switch (this._alignment) {
        case 'right':
          this._ctx.textAlign = 'right';
          textX = width - padding;
          break;
        case 'center':
          this._ctx.textAlign = 'center';
          textX = width / 2;
          break;
        case 'left':
        case 'justify':
        default:
          this._ctx.textAlign = 'left';
          textX = padding;
          break;
      }

      // Draw fill
      this._ctx.fillStyle = this.color;
      this._ctx.globalAlpha = this.fillOpacity;
      this._ctx.fillText(line, textX, y);
    }

    // Store world dimensions
    this._worldWidth = (width / RESOLUTION_SCALE) * PIXEL_TO_WORLD;
    this._worldHeight = (height / RESOLUTION_SCALE) * PIXEL_TO_WORLD;

    // Note: _canvasDirty is NOT cleared here - TextRenderNode clears it after updating texture
  }
}
