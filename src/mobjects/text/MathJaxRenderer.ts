// MathJax Renderer - Ported from manim-web
// Renders LaTeX to SVG using MathJax and converts to VMobjects

import { VGroup } from '../../core/VGroup';
import { svgToVMobjects, SVGToVMobjectOptions } from './svgPathParser';

export interface MathJaxRenderOptions {
  displayMode?: boolean;
  color?: string;
  fontScale?: number;
  macros?: Record<string, string>;
}

export interface MathJaxRenderResult {
  svgElement: SVGElement;
  vmobjectGroup: VGroup;
  svgString: string;
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// Types for MathJax module loading
// ---------------------------------------------------------------------------

interface MathJaxConstructor {
  tex2svg: (tex: string, options?: { display?: boolean }) => HTMLElement;
  startup?: {
    defaultReady?: () => void;
    output?: {
      fontCache?: {
        defs?: unknown;
      };
    };
    adaptor?: {
      outerHTML: (node: unknown) => string;
    };
  };
  tex?: {
    macros?: Record<string, string>;
  };
}

interface WindowWithMathJax {
  MathJax: MathJaxConstructor & {
    document: (html: string) => {
      convert: (tex: string, options?: { display?: boolean }) => unknown;
    };
  };
}

interface MathJaxModule {
  mathjax: {
    document: (html: string, options?: { InputJax?: unknown; OutputJax?: unknown }) => {
      convert: (tex: string, options?: { display?: boolean }) => unknown;
    };
  };
}

interface TexModule {
  TeX: new (options: { packages?: string[]; macros?: Record<string, string> }) => unknown;
}

interface SvgModule {
  SVG: new (options: { fontCache?: 'none' | 'global' }) => unknown;
}

interface LiteAdaptorModule {
  liteAdaptor: () => unknown;
}

interface HtmlHandlerModule {
  RegisterHTMLHandler: (adaptor: unknown) => void;
}

type MathJaxModuleState =
  | { strategy: 'global'; MathJax: MathJaxConstructor }
  | {
      strategy: 'npm';
      mjModule: MathJaxModule;
      texModule: TexModule;
      svgModule: SvgModule;
      adaptor: { outerHTML: (node: unknown) => string };
    };

// ---------------------------------------------------------------------------
// Internal MathJax handle (lazy-loaded)
// ---------------------------------------------------------------------------

/** Cached MathJax module after first dynamic import */
let mathjaxModule: MathJaxModuleState | null = null;

/** Promise for the in-flight import (prevents duplicate loads) */
let mathjaxLoadPromise: Promise<MathJaxModuleState> | null = null;

/**
 * Dynamically load MathJax's SVG output module.
 *
 * We use the "mathjax-full" npm package which provides a programmatic API
 * without needing the global MathJax bootstrap. If that is not available we
 * fall back to loading via a CDN script tag.
 */
async function loadMathJax(): Promise<MathJaxModuleState> {
  if (mathjaxModule) return mathjaxModule;
  if (mathjaxLoadPromise) return mathjaxLoadPromise;

  mathjaxLoadPromise = (async () => {
    // Strategy 1: try the npm package "mathjax-full"
    try {
      // Use Function constructor to hide specifiers from Vite's static analysis
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const importFn = new Function('s', 'return import(s)') as (
        s: string,
      ) => Promise<Record<string, (...args: unknown[]) => unknown>>;
      const mjModule = (await importFn('mathjax-full/js/mathjax.js')) as unknown as MathJaxModule;
      const texModule = (await importFn('mathjax-full/js/input/tex-full.js')) as unknown as TexModule;
      const svgModule = (await importFn('mathjax-full/js/output/svg.js')) as unknown as SvgModule;
      const liteAdaptor = (await importFn('mathjax-full/js/adaptors/liteAdaptor.js')) as unknown as LiteAdaptorModule;
      const htmlHandler = (await importFn('mathjax-full/js/handlers/html.js')) as unknown as HtmlHandlerModule;

      const adaptor = liteAdaptor.liteAdaptor() as { outerHTML: (node: unknown) => string };
      htmlHandler.RegisterHTMLHandler(adaptor);

      mathjaxModule = {
        mjModule,
        texModule,
        svgModule,
        adaptor,
        strategy: 'npm',
      };
      return mathjaxModule;
    } catch {
      // npm package not available -- fall through
    }

    // Strategy 2: global MathJax loaded via <script> tag (CDN fallback)
    if (typeof window !== 'undefined') {
      const win = window as unknown as WindowWithMathJax;
      if (win.MathJax && win.MathJax.tex2svg) {
        mathjaxModule = { strategy: 'global', MathJax: win.MathJax };
        return mathjaxModule;
      }

      // Load from CDN
      await new Promise<void>((resolve, reject) => {
        // Configure before loading
        const MathJaxConfig: MathJaxConstructor & { tex: object; svg: object; startup: object } = {
          tex: {
            inlineMath: [
              ['$', '$'],
              ['\\(', '\\)'],
            ],
            displayMath: [
              ['$$', '$$'],
              ['\\[', '\\]'],
            ],
            packages: { '[+]': ['ams', 'newcommand', 'configmacros'] },
          },
          svg: {
            fontCache: 'global',
          },
          startup: {
            typeset: false,
            ready: () => {
              (win as unknown as { MathJax: MathJaxConstructor }).MathJax.startup?.defaultReady?.();
              resolve();
            },
          },
        };
        (win as unknown as { MathJax: typeof MathJaxConfig }).MathJax = MathJaxConfig;

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg-full.js';
        script.async = true;
        script.onerror = () => reject(new Error('Failed to load MathJax from CDN'));
        document.head.appendChild(script);

        // Timeout after 15 seconds
        setTimeout(() => reject(new Error('MathJax CDN load timed out')), 15000);
      });

      mathjaxModule = { strategy: 'global', MathJax: win.MathJax };
      return mathjaxModule;
    }

    throw new Error('MathJax could not be loaded: no npm package and no browser environment.');
  })();

  return mathjaxLoadPromise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether MathJax has already been loaded.
 */
export function isMathJaxLoaded(): boolean {
  return mathjaxModule !== null;
}

/**
 * Pre-load MathJax so the first render is fast.
 * Call this early (e.g. on page load) if you know LaTeX will be used.
 */
export async function preloadMathJax(): Promise<void> {
  await loadMathJax();
}

/**
 * Render a LaTeX string to SVG using MathJax and convert the result
 * into VMobject paths suitable for manim-web animation.
 *
 * @param texString - The raw LaTeX to render (without delimiters).
 * @param options   - Rendering options.
 * @returns A MathJaxRenderResult containing the SVG element and VMobject group.
 */
export async function renderLatexToSVG(
  texString: string,
  options: MathJaxRenderOptions = {},
): Promise<MathJaxRenderResult> {
  const { displayMode = true, color = '#ffffff', fontScale = 1, macros = {} } = options;

  const mj = await loadMathJax();

  let svgElement: SVGElement;
  let svgString: string;

  if (mj.strategy === 'global') {
    // ------------------------------------------------------------------
    // Global MathJax (CDN)
    // ------------------------------------------------------------------
    const MathJax = mj.MathJax;

    // Merge custom macros
    if (Object.keys(macros).length > 0) {
      MathJax.tex = MathJax.tex || {};
      const existingMacros = MathJax.tex.macros ?? {};
      MathJax.tex.macros = { ...existingMacros, ...macros };
    }

    // Render
    if (!MathJax.tex2svg) {
      throw new Error('MathJax.tex2svg is not available');
    }
    const wrapper = MathJax.tex2svg(texString, { display: displayMode });
    const svgEl = wrapper.querySelector('svg');
    if (!svgEl) {
      throw new Error(`MathJax failed to produce SVG for: ${texString}`);
    }
    svgElement = svgEl;

    // Inject global font cache <defs> into the SVG so that <use> refs
    // can be resolved by svgToVMobjects.  MathJax with fontCache:'global'
    // stores glyph <path> definitions in a separate internal node tree
    // (MathJax.startup.output.fontCache.defs) instead of inlining them.
    try {
      const adaptor = MathJax.startup?.adaptor;
      const fontDefs = MathJax.startup?.output?.fontCache?.defs;
      if (adaptor && fontDefs) {
        const defsHTML = adaptor.outerHTML(fontDefs);
        if (defsHTML) {
          const tmp = document.createElement('div');
          tmp.innerHTML = defsHTML;
          const defsEl = tmp.querySelector('defs');
          if (defsEl) {
            svgElement.insertBefore(defsEl, svgElement.firstChild);
          }
        }
      }
    } catch {
      // Non-critical: svgToVMobjects will just produce fewer paths
    }

    svgString = svgElement.outerHTML;
  } else {
    // ------------------------------------------------------------------
    // npm mathjax-full
    // ------------------------------------------------------------------
    const { mjModule, texModule, svgModule, adaptor } = mj;
    const MathJax = mjModule.mathjax;
    const TeX = texModule.TeX;
    const SVG = svgModule.SVG;

    const tex = new TeX({
      packages: ['base', 'ams', 'newcommand', 'configmacros'],
      ...(Object.keys(macros).length > 0 ? { macros } : {}),
    });
    const svg = new SVG({ fontCache: 'none' });
    const html = MathJax.document('', { InputJax: tex, OutputJax: svg });

    const node = html.convert(texString, { display: displayMode });
    svgString = adaptor.outerHTML(node);

    // Parse the string into a real SVGElement for downstream use
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    svgElement = doc.documentElement as unknown as SVGElement;
  }

  // ------------------------------------------------------------------
  // Apply color & scale
  // ------------------------------------------------------------------
  svgElement.setAttribute('color', color);
  svgElement.setAttribute('style', `color:${color};`);

  // Replace currentColor in all shapes
  const shapes = svgElement.querySelectorAll('path, line, rect, circle, polyline, polygon, use');
  shapes.forEach((el) => {
    const fill = el.getAttribute('fill');
    if (!fill || fill === 'currentColor' || fill === 'inherit') {
      el.setAttribute('fill', color);
    }
    const stroke = el.getAttribute('stroke');
    if (stroke === 'currentColor' || stroke === 'inherit') {
      el.setAttribute('stroke', color);
    }
  });

  // Read dimensions from the SVG viewBox (MathJax always sets one)
  const viewBox = svgElement.getAttribute('viewBox');
  let width = 0;
  let height = 0;
  if (viewBox) {
    const parts = viewBox.split(/\s+/);
    width = parseFloat(parts[2]) || 0;
    height = parseFloat(parts[3]) || 0;
  }

  // Scale dimensions
  width *= fontScale;
  height *= fontScale;

  // ------------------------------------------------------------------
  // Convert SVG paths to VMobjects
  // ------------------------------------------------------------------
  const vmobjectGroup = svgToVMobjects(svgElement, { color, scale: fontScale, flipY: false });

  return {
    svgElement,
    vmobjectGroup,
    svgString,
    width,
    height,
  };
}

/**
 * Convert an existing SVG element to VMobjects.
 * This is useful for SVGs that are not from MathJax.
 */
export function svgElementToVMobjects(
  svgElement: SVGElement,
  options: SVGToVMobjectOptions = {},
): VGroup {
  return svgToVMobjects(svgElement, options);
}

/**
 * Quick check: can KaTeX render this LaTeX string without throwing?
 * Used by the 'auto' renderer mode to decide whether to fall back to MathJax.
 */
export async function katexCanRender(texString: string, displayMode = true): Promise<boolean> {
  try {
    // Dynamic import katex to avoid bundling it
    const katex = await import('katex');
    katex.renderToString(texString, {
      displayMode,
      throwOnError: true,
      output: 'html',
    });
    return true;
  } catch {
    return false;
  }
}
