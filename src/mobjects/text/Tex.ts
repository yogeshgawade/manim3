/**
 * Tex - LaTeX rendering using Python service's /compile-latex endpoint.
 *
 * Uses server-side pdflatex + dvisvgm for high-quality LaTeX rendering.
 * Unlike MathTex which uses MathJax client-side, this produces SVG via
 * the Python service at http://localhost:8000.
 */

import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { VGroup } from '../../core/VGroup';
import { VMobject } from '../../core/VMobject';
import type { Mobject } from '../../core/Mobject';
import type { Vec3 } from '../../core/types';

gsap.registerPlugin(MorphSVGPlugin);

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
    // Call Python service to compile LaTeX to SVG
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LaTeX compilation failed: ${response.status} ${errorText}`);
    }

    const result: LatexResponse = await response.json();
    const svgString = result.svg;

    if (!svgString || svgString.length === 0) {
      throw new Error('Empty SVG response from LaTeX service');
    }

    // Parse SVG string to SVGElement
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.documentElement as unknown as SVGElement;

    // Check for parsing errors
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      console.error('[Tex._render] SVG parse error:', parserError.textContent);
      throw new Error('Failed to parse SVG response from LaTeX service');
    }

    // Extract viewBox width for scaling
    const viewBox = svgElement.getAttribute?.('viewBox');
    if (viewBox) {
      const parts = viewBox.split(/\s+/).map(Number);
      this._svgViewBoxWidth = parts[2] || 1000;
    }

    // Convert SVG to VMobjects using GSAP MorphSVGPlugin
    const vmobjectGroup = this._svgToVMobjectsGSAP(svgElement);

    // Restyle children for proper rendering
    this._restyleChildren(vmobjectGroup);

    // Add the VMobject children from the group
    for (const child of [...vmobjectGroup.children]) {
      vmobjectGroup.remove(child);
      this.add(child);
    }

    // Scale to target height if specified
    this._scaleToTarget();

    // Set fillOpacity on this VGroup so Create animation detects it has fill
    this.fillOpacity = this._svgFillOpacity;
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

    // Center of current bounds
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    // Transform all point data: scale and center at origin
    for (const vmob of vmobjects) {
      const pts = vmob.points3D;
      const transformed = pts.map((p) => [(p[0] - cx) * s, (p[1] - cy) * s, p[2]]);
      vmob.points3D = transformed;
    }

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

  /**
   * Convert SVG element to VMobjects using GSAP MorphSVGPlugin for path parsing.
   */
  private _svgToVMobjectsGSAP(svgElement: SVGElement): VGroup {
    const group = new VGroup();
    const scale = this._fontSize;

    // Build a <defs> symbol map for <use> resolution
    const defsMap = new Map<string, SVGElement>();
    svgElement.querySelectorAll('[id]').forEach((el) => {
      defsMap.set(el.id, el as SVGElement);
    });

    const processElement = (el: Element, inheritedTransform: DOMMatrix) => {
      const tag = el.tagName.toLowerCase();

      // Resolve <use> elements by cloning the referenced symbol/path
      if (tag === 'use') {
        const href =
          el.getAttribute('href') || el.getAttribute('xlink:href') || '';
        const refId = href.replace('#', '');
        const ref = defsMap.get(refId);
        if (ref) {
          // Apply <use> x/y offset into a new matrix
          const x = parseFloat(el.getAttribute('x') || '0');
          const y = parseFloat(el.getAttribute('y') || '0');
          const useMatrix = inheritedTransform.translate(x, y);
          processElement(ref, useMatrix);
        }
        return;
      }

      // Compute this element's local transform
      let localMatrix = inheritedTransform;
      const transformAttr = el.getAttribute('transform');
      if (transformAttr) {
        // Create a temporary SVG element to parse the transform
        const ns = 'http://www.w3.org/2000/svg';
        const tempSvg = document.createElementNS(ns, 'svg');
        const tempEl = document.createElementNS(ns, 'g') as SVGGElement;
        tempEl.setAttribute('transform', transformAttr);
        tempSvg.appendChild(tempEl);
        document.body.appendChild(tempSvg);
        localMatrix = inheritedTransform.multiply(
          tempEl.getCTM() ?? new DOMMatrix()
        );
        document.body.removeChild(tempSvg);
      }

      if (tag === 'path') {
        const d = el.getAttribute('d');
        if (!d) return;

        // Use GSAP to parse the path string into rawPath
        const rawPath = MorphSVGPlugin.stringToRawPath(d);
        if (!rawPath || rawPath.length === 0) return;

        const vmob = new VMobject();
        const allPoints: number[][] = [];
        const subpathLengths: number[] = [];

        // Apply inherited transform + scale + flipY to each point
        const transformPt = (x: number, y: number): [number, number] => {
          const pt = localMatrix.transformPoint({ x, y });
          return [pt.x * scale, -pt.y * scale]; // flipY: negate Y
        };

        for (const segment of rawPath) {
          const coords = segment as unknown as number[];
          const startIdx = allPoints.length;

          // rawPath layout: [ax, ay, cp1x, cp1y, cp2x, cp2y, ax2, ay2, ...]
          // First point is anchor, then groups of 6: cp1, cp2, anchor

          // First anchor (M point)
          const [ax0, ay0] = transformPt(coords[0], coords[1]);
          allPoints.push([ax0, ay0, 0]);

          // Remaining: cp1, cp2, anchor (groups of 6 floats)
          for (let i = 2; i < coords.length; i += 6) {
            if (i + 5 >= coords.length) break;
            const [cp1x, cp1y] = transformPt(coords[i], coords[i + 1]);
            const [cp2x, cp2y] = transformPt(coords[i + 2], coords[i + 3]);
            const [anx, any_] = transformPt(coords[i + 4], coords[i + 5]);
            allPoints.push([cp1x, cp1y, 0]); // handle 1
            allPoints.push([cp2x, cp2y, 0]); // handle 2
            allPoints.push([anx, any_, 0]); // anchor
          }

          subpathLengths.push(allPoints.length - startIdx);
        }

        if (allPoints.length < 4) return;

        vmob.points3D = allPoints;

        // Register subpaths so renderer knows where each contour starts/ends
        // (needed for glyphs with holes like "O")
        if (subpathLengths.length > 1) {
          vmob.setSubpaths(subpathLengths, subpathLengths.map(() => true));
        }

        group.add(vmob);
      } else if (tag === 'g' || tag === 'symbol') {
        // Recurse into groups
        for (const child of Array.from(el.children)) {
          processElement(child, localMatrix);
        }
      }
    };

    // Start from identity matrix, recurse the whole SVG
    for (const child of Array.from(svgElement.children)) {
      processElement(child, new DOMMatrix());
    }

    return group;
  }
}
