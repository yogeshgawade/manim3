/**
 * Tex - LaTeX rendering using Python service's /compile-latex endpoint.
 *
 * Uses server-side pdflatex + dvisvgm for high-quality LaTeX rendering.
 * Unlike MathTex which uses MathJax client-side, this produces SVG via
 * the Python service at http://localhost:8000.
 */

import { VGroup } from '../../core/VGroup';
import { VMobject } from '../../core/VMobject';
import type { Mobject } from '../../core/Mobject';
import type { Vec3 } from '../../core/types';
import { svgToVMobjects } from './svgPathParser';

const WHITE = '#ffffff';
const SERVICE_URL = 'http://localhost:8000/compile-latex';

export interface TexOptions {
  /** LaTeX expression to render. */
  latex: string;
  /** Color as CSS color string. Default: WHITE ('#ffffff') */
  color?: string;
  /** Scale factor (1 = standard math size). Default: 1 */
  fontSize?: number;
  /** Position in 3D space. Default: [0,0,0] */
  position?: Vec3;
  /** Stroke width for glyph outlines. Default: 2 */
  strokeWidth?: number;
  /** Fill opacity for glyph interiors. Default: 1 */
  fillOpacity?: number;
  /** Explicit target height in world units. Overrides fontSize scaling. */
  height?: number;
}

interface LatexResponse {
  svg: string;
}

export class Tex extends VGroup {
  protected _latex: string;
  protected _fontSize: number;
  protected _color: string;
  protected _svgStrokeWidth: number;
  protected _svgFillOpacity: number;
  protected _targetHeight: number | undefined;
  protected _svgViewBoxWidth: number = 1000;

  /** Promise that resolves when rendering is complete */
  protected _renderPromise: Promise<void> | null = null;
  /** Error from rendering, if any */
  protected _renderError: Error | null = null;

  constructor(options: TexOptions) {
    super();

    const {
      latex,
      color = WHITE,
      fontSize = 1,
      position = [0, 0, 0],
      strokeWidth = 2,
      fillOpacity = 1,
      height,
    } = options;

    this._latex = latex;
    this._fontSize = fontSize;
    this._color = color;
    this._svgStrokeWidth = strokeWidth;
    this._svgFillOpacity = fillOpacity;
    this._targetHeight = height;

    // Set position
    this.position = [...position];

    // Start async rendering
    this._startRender();
  }

  /**
   * Wait for the LaTeX to finish rendering.
   */
  async waitForRender(): Promise<void> {
    if (this._renderPromise) {
      await this._renderPromise;
    }
    if (this._renderError) {
      throw this._renderError;
    }
  }

  /**
   * Get the LaTeX string.
   */
  getLatex(): string {
    return this._latex;
  }

  /**
   * Get the render error, if any.
   */
  getRenderError(): Error | null {
    return this._renderError;
  }

  /**
   * Override setColor to propagate to all VMobject children.
   */
  override setColor(color: string): this {
    this._color = color;
    for (const child of this.children) {
      if (child instanceof VMobject) {
        child.color = color;
        child.fillColor = color;
      }
      if (child instanceof VGroup) {
        for (const grandchild of child.children) {
          if (grandchild instanceof VMobject) {
            grandchild.color = color;
            grandchild.fillColor = color;
          }
        }
      }
    }
    this.markDirty();
    return this;
  }

  /**
   * Start the async rendering process.
   */
  protected _startRender(): void {
    this._renderPromise = this._render()
      .then(() => {
        this.markDirty();
      })
      .catch((error) => {
        console.error('Tex rendering error:', error);
        this._renderError = error instanceof Error ? error : new Error(String(error));
      });
  }

  /**
   * Render the LaTeX via Python service to VMobject paths.
   */
  protected async _render(): Promise<void> {
    console.log('[Tex._render] Starting render for:', this._latex);

    // Call Python service to compile LaTeX to SVG
    console.log('[Tex._render] Fetching from:', SERVICE_URL);
    const response = await fetch(SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expression: this._latex,
        color: this._color,
        scale: this._fontSize,
      }),
    });

    console.log('[Tex._render] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LaTeX compilation failed: ${response.status} ${errorText}`);
    }

    const result: LatexResponse = await response.json();
    const svgString = result.svg;
    console.log('[Tex._render] SVG received, length:', svgString?.length);
    console.log('[Tex._render] SVG content:\n', svgString);

    // Check for use elements
    const hasUse = svgString.includes('<use');
    const hasHref = svgString.includes('xlink:href') || svgString.includes('href=');
    console.log('[Tex._render] SVG has <use> elements:', hasUse);
    console.log('[Tex._render] SVG has href references:', hasHref);

    if (!svgString || svgString.length === 0) {
      throw new Error('Empty SVG response from LaTeX service');
    }

    // Parse SVG string to SVGElement
    console.log('[Tex._render] Parsing SVG...');
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.documentElement as unknown as SVGElement;

    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.error('[Tex._render] SVG parse error:', parserError.textContent);
      throw new Error('Failed to parse SVG response from LaTeX service');
    }
    console.log('[Tex._render] SVG parsed successfully, root tag:', svgElement.tagName);

    // Extract viewBox width for scaling
    const viewBox = svgElement.getAttribute?.('viewBox');
    console.log('[Tex._render] ViewBox:', viewBox);
    if (viewBox) {
      const parts = viewBox.split(/\s+/).map(Number);
      this._svgViewBoxWidth = parts[2] || 1000;
    }

    // Convert SVG to VMobjects
    console.log('[Tex._render] Converting SVG to VMobjects...');
    const vmobjectGroup = svgToVMobjects(svgElement, {
      color: this._color,
      scale: this._fontSize,
      flipY: true,
    });
    console.log('[Tex._render] VMobject group created, children:', vmobjectGroup.children.length);

    // Restyle children for proper rendering
    console.log('[Tex._render] Restyling children...');
    this._restyleChildren(vmobjectGroup);

    // Add the VMobject children from the group
    console.log('[Tex._render] Adding children to Tex object...');
    for (const child of [...vmobjectGroup.children]) {
      vmobjectGroup.remove(child);
      this.add(child);
    }
    console.log('[Tex._render] Total children added:', this.children.length);

    // Scale to target height if specified
    console.log('[Tex._render] Scaling to target...');
    this._scaleToTarget();

    // Set fillOpacity on this VGroup so Create animation detects it has fill
    this.fillOpacity = this._svgFillOpacity;
    console.log('[Tex._render] Render complete!');
  }

  /**
   * Restyle all VMobject children for solid glyph rendering.
   */
  protected _restyleChildren(group: VGroup): void {
    const restyle = (mob: Mobject) => {
      if (mob instanceof VMobject) {
        mob.fillOpacity = this._svgFillOpacity;
        mob.fillColor = this._color;
        mob.strokeWidth = this._svgStrokeWidth;
        mob.color = this._color;
      }
      if ('children' in mob) {
        for (const child of (mob as VGroup).children) {
          restyle(child);
        }
      }
    };
    restyle(group);
  }

  /**
   * Scale and center the assembled paths by transforming actual point data.
   */
  protected _scaleToTarget(): void {
    // Collect all VMobject descendants
    const vmobjects: VMobject[] = [];
    console.log('[scaleToTarget] first vmob points3D[0]:', (this.children[0] as VMobject)?.points3D?.[0]);
    console.log('[scaleToTarget] first vmob position:', (this.children[0] as any)?.position);
    console.log('[scaleToTarget] first vmob scale:', (this.children[0] as any)?.scale);
    const collect = (mob: Mobject) => {
      if (mob instanceof VMobject && !(mob instanceof VGroup)) {
        vmobjects.push(mob);
      }
      if ('children' in mob) {
        for (const child of (mob as VGroup).children) {
          collect(child);
        }
      }
    };
    collect(this);

    // Compute bounding box from raw point data
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    for (const vmob of vmobjects) {
      for (const p of vmob.points3D) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
      }
    }

    const rawHeight = maxY - minY;
    const rawWidth = maxX - minX;
    console.log('[Tex._scaleToTarget] Raw bounds before scaling:', { width: rawWidth.toFixed(2), height: rawHeight.toFixed(2) });
    if (rawHeight < 0.0001) return;

    let s: number;
    if (this._targetHeight !== undefined) {
      // Explicit height: scale bounding box to fit
      s = this._targetHeight / rawHeight;
    } else {
      // Scale dvisvgm output to manim world units
      // dvisvgm uses point-based viewBox, we want ~0.5 world units for normal text
      // Scale factor: target world height / raw SVG height
      const targetWorldHeight = 0.5 * this._fontSize; // 0.5 world units at fontSize=1
      s = targetWorldHeight / rawHeight;
    }
    console.log('[Tex._scaleToTarget] Scale factor:', s);

    // Center of current bounds
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    // Transform all point data: scale and center at origin
    for (const vmob of vmobjects) {
      const pts = vmob.points3D;
      const transformed = pts.map((p) => [(p[0] - cx) * s, (p[1] - cy) * s, p[2]]);
      vmob.points3D = transformed;
    }

    // Log final bounds
    let finalMinX = Infinity, finalMaxX = -Infinity, finalMinY = Infinity, finalMaxY = -Infinity;
    for (const vmob of vmobjects) {
      for (const p of vmob.points3D) {
        if (p[0] < finalMinX) finalMinX = p[0];
        if (p[0] > finalMaxX) finalMaxX = p[0];
        if (p[1] < finalMinY) finalMinY = p[1];
        if (p[1] > finalMaxY) finalMaxY = p[1];
      }
    }
    console.log('[Tex._scaleToTarget] Final bounds after scaling:', {
      width: (finalMaxX - finalMinX).toFixed(4),
      height: (finalMaxY - finalMinY).toFixed(4),
      center: [(finalMinX + finalMaxX) / 2, (finalMinY + finalMaxY) / 2]
    });
  }

  /**
   * Create a copy of this Tex.
   */
  protected _createCopy(): Tex {
    return new Tex({
      latex: this._latex,
      color: this._color,
      fontSize: this._fontSize,
      position: [...this.position],
      strokeWidth: this._svgStrokeWidth,
      fillOpacity: this._svgFillOpacity,
      height: this._targetHeight,
    });
  }
}
