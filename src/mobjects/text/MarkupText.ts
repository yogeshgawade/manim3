/**
 * MarkupText - Rich text with XML markup support
 *
 * Supports tags: <b>, <i>, <u>, <s>, <sup>, <sub>, <big>, <small>, <tt>, <span>
 * and color attributes.
 *
 * @example
 * ```typescript
 * const text = new MarkupText({
 *   text: '<b>Bold</b> and <i>italic</i> with <span color="#ff0000">color</span>'
 * });
 * ```
 */

import { Text, TextOptions, RESOLUTION_SCALE } from './Text';

export type MarkupTextOptions = TextOptions;

interface StyledSegment {
  text: string;
  fontWeight: string | number;
  fontStyle: string;
  color: string | null;
  fontSize: number;
  baselineShift: number;
  underline: boolean;
  strikethrough: boolean;
}

// Simple regex-based parser for supported tags
const TAG_REGEX = /<(\/?)([^>]+)>/g;

export class MarkupText extends Text {
  protected _parsedSegments: StyledSegment[] = [];

  constructor(options: MarkupTextOptions) {
    super(options);
    // Re-render with markup parsing
    this._parseAndRender();
  }

  /**
   * Set new markup text and re-render
   */
  override setText(text: string): this {
    this._text = text;
    this._parseAndRender();
    this.markDirty();
    return this;
  }

  /**
   * Parse markup and render to canvas
   */
  protected _parseAndRender(): void {
    this._parsedSegments = this._parseMarkup(this._text);
    this._canvasDirty = true;
    this._renderMarkupToCanvas();
  }

  /**
   * Parse markup string into styled segments
   */
  protected _parseMarkup(markup: string): StyledSegment[] {
    const segments: StyledSegment[] = [];

    // Decode XML entities
    const decoded = markup
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");

    // Stack of styles
    const styleStack: StyledSegment[] = [{
      text: '',
      fontWeight: this._fontWeight,
      fontStyle: this._fontStyle,
      color: this.color,
      fontSize: this._fontSize,
      baselineShift: 0,
      underline: false,
      strikethrough: false,
    }];

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    TAG_REGEX.lastIndex = 0;

    while ((match = TAG_REGEX.exec(decoded)) !== null) {
      // Add text before this tag
      if (match.index > lastIndex) {
        const text = decoded.substring(lastIndex, match.index);
        if (text) {
          const currentStyle = styleStack[styleStack.length - 1];
          segments.push({ ...currentStyle, text });
        }
      }

      const isClosing = match[1] === '/';
      const tagContent = match[2].trim();

      if (isClosing) {
        // Pop style stack
        if (styleStack.length > 1) {
          styleStack.pop();
        }
      } else {
        // Parse opening tag
        const spaceIdx = tagContent.search(/\s/);
        const tagName = spaceIdx === -1 ? tagContent : tagContent.substring(0, spaceIdx);
        const attrStr = spaceIdx === -1 ? '' : tagContent.substring(spaceIdx + 1);

        const attrs = this._parseAttributes(attrStr);
        const parentStyle = styleStack[styleStack.length - 1];

        // Create new style based on tag
        const newStyle: StyledSegment = { ...parentStyle };

        switch (tagName.toLowerCase()) {
          case 'b':
          case 'bold':
            newStyle.fontWeight = 'bold';
            break;
          case 'i':
          case 'italic':
            newStyle.fontStyle = 'italic';
            break;
          case 'u':
          case 'underline':
            newStyle.underline = true;
            break;
          case 's':
          case 'strikethrough':
            newStyle.strikethrough = true;
            break;
          case 'sup':
            newStyle.baselineShift = -0.35;
            newStyle.fontSize = parentStyle.fontSize * 0.7;
            break;
          case 'sub':
            newStyle.baselineShift = 0.25;
            newStyle.fontSize = parentStyle.fontSize * 0.7;
            break;
          case 'big':
            newStyle.fontSize = parentStyle.fontSize * 1.2;
            break;
          case 'small':
            newStyle.fontSize = parentStyle.fontSize * 0.83;
            break;
          case 'tt':
            newStyle.fontWeight = 'normal';
            break;
          case 'span':
            if (attrs.color) newStyle.color = attrs.color;
            if (attrs.fgcolor) newStyle.color = attrs.fgcolor;
            if (attrs.foreground) newStyle.color = attrs.foreground;
            if (attrs.size) {
              const size = parseFloat(attrs.size);
              if (!isNaN(size)) newStyle.fontSize = size;
            }
            break;
        }

        styleStack.push(newStyle);
      }

      lastIndex = TAG_REGEX.lastIndex;
    }

    // Add remaining text
    if (lastIndex < decoded.length) {
      const text = decoded.substring(lastIndex);
      if (text) {
        const currentStyle = styleStack[styleStack.length - 1];
        segments.push({ ...currentStyle, text });
      }
    }

    return segments;
  }

  /**
   * Parse attribute string into key-value map
   */
  protected _parseAttributes(attrStr: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const regex = /(\w+)\s*=\s*["']([^"']*)["']/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(attrStr)) !== null) {
      attrs[match[1].toLowerCase()] = match[2];
    }
    return attrs;
  }

  /**
   * Render parsed markup segments to canvas
   */
  protected _renderMarkupToCanvas(): void {
    if (!this._canvas || !this._ctx || this._parsedSegments.length === 0) {
      return;
    }

    // Calculate total width
    let totalWidth = 0;
    let maxHeight = 0;

    for (const seg of this._parsedSegments) {
      this._ctx.font = this._buildSegmentFont(seg);
      const metrics = this._ctx.measureText(seg.text);
      totalWidth += metrics.width;
      const height = seg.fontSize * RESOLUTION_SCALE * 1.2;
      maxHeight = Math.max(maxHeight, height);
    }

    // Add padding
    const padding = this._fontSize * RESOLUTION_SCALE * 0.2;
    const width = Math.ceil(totalWidth + padding * 2);
    const height = Math.ceil(maxHeight + padding * 2);

    // Resize canvas
    this._canvas.width = width || 1;
    this._canvas.height = height || 1;

    // Clear
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

    // Draw segments
    let currentX = padding;
    const baseY = padding + (this._fontSize * RESOLUTION_SCALE * 0.8);

    for (const seg of this._parsedSegments) {
      this._ctx.font = this._buildSegmentFont(seg);
      this._ctx.textBaseline = 'alphabetic';
      this._ctx.textAlign = 'left';

      const segColor = seg.color || this.color;
      const y = baseY + (seg.baselineShift * seg.fontSize * RESOLUTION_SCALE);

      // Draw underline
      if (seg.underline) {
        const metrics = this._ctx.measureText(seg.text);
        this._ctx.strokeStyle = segColor;
        this._ctx.lineWidth = 1 * RESOLUTION_SCALE;
        this._ctx.beginPath();
        this._ctx.moveTo(currentX, y + 2 * RESOLUTION_SCALE);
        this._ctx.lineTo(currentX + metrics.width, y + 2 * RESOLUTION_SCALE);
        this._ctx.stroke();
      }

      // Draw strikethrough
      if (seg.strikethrough) {
        const metrics = this._ctx.measureText(seg.text);
        this._ctx.strokeStyle = segColor;
        this._ctx.lineWidth = 1 * RESOLUTION_SCALE;
        this._ctx.beginPath();
        this._ctx.moveTo(currentX, y - (seg.fontSize * RESOLUTION_SCALE * 0.3));
        this._ctx.lineTo(currentX + metrics.width, y - (seg.fontSize * RESOLUTION_SCALE * 0.3));
        this._ctx.stroke();
      }

      // Draw text
      this._ctx.fillStyle = segColor;
      this._ctx.globalAlpha = this.fillOpacity;
      this._ctx.fillText(seg.text, currentX, y);

      // Advance position
      const metrics = this._ctx.measureText(seg.text);
      currentX += metrics.width;
    }

    // Store dimensions
    this._worldWidth = (width / RESOLUTION_SCALE) * (1 / 100);
    this._worldHeight = (height / RESOLUTION_SCALE) * (1 / 100);
    this._canvasDirty = false;
  }

  /**
   * Build font string for a segment
   */
  protected _buildSegmentFont(seg: StyledSegment): string {
    const style = seg.fontStyle === 'italic' ? 'italic' : 'normal';
    const weight = typeof seg.fontWeight === 'number' ? seg.fontWeight.toString() : seg.fontWeight;
    const size = Math.round(seg.fontSize * RESOLUTION_SCALE);
    return `${style} ${weight} ${size}px ${this._fontFamily}`;
  }

  /**
   * Override parent _renderToCanvas to use markup rendering
   */
  protected override _renderToCanvas(): void {
    this._renderMarkupToCanvas();
  }

  /**
   * Override measure to use parsed segments
   */
  protected override _measureText(): { lines: string[]; width: number; height: number } {
    // Return single line for markup text
    const plainText = this._parsedSegments.map(s => s.text).join('');
    return { lines: [plainText], width: this._canvas?.width || 0, height: this._canvas?.height || 0 };
  }
}
