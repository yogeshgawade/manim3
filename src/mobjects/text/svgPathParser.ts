// SVG Path Parser - Ported from manim-web
// Converts SVG path data to VMobject-compatible cubic bezier points

import { VMobject } from '../../core/VMobject';
import { VGroup } from '../../core/VGroup';

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

const DEFAULT_STROKE_WIDTH = 2;
const WHITE = '#ffffff';

export interface SVGToVMobjectOptions {
  color?: string;
  strokeWidth?: number;
  fillOpacity?: number;
  scale?: number;
  flipY?: boolean;
}

/**
 * Tokenize SVG path data into command + args pairs.
 */
function tokenizePath(d: string): { cmd: string; args: number[] }[] {
  const tokens: { cmd: string; args: number[] }[] = [];
  const regex = /([MmLlHhVvCcSsQqTtAaZz])\s*([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match;

  while ((match = regex.exec(d)) !== null) {
    const cmd = match[1];
    const argsStr = match[2].trim();

    // Parse numbers: handle floating point, signed numbers, and scientific notation
    const args: number[] = [];
    if (argsStr) {
      const numRegex = /-?\d+\.?\d*(?:[eE][+-]?\d+)?/g;
      let numMatch;
      while ((numMatch = numRegex.exec(argsStr)) !== null) {
        args.push(parseFloat(numMatch[0]));
      }
    }

    tokens.push({ cmd, args });
  }

  return tokens;
}

/**
 * Convert line segment to cubic bezier (straight line = degenerate cubic).
 */
function pushLineTo(path: Vec2[], x1: number, y1: number, x2: number, y2: number): void {
  // For a straight line: control points are at 1/3 and 2/3 along the line
  const c1x = x1 + (x2 - x1) / 3;
  const c1y = y1 + (y2 - y1) / 3;
  const c2x = x1 + (2 * (x2 - x1)) / 3;
  const c2y = y1 + (2 * (y2 - y1)) / 3;
  path.push([c1x, c1y], [c2x, c2y], [x2, y2]);
}

/**
 * Convert elliptical arc to cubic bezier segments.
 * Based on SVG spec implementation.
 */
function arcToCubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rx: number,
  ry: number,
  phi: number,
  fa: number,
  fs: number,
): Vec2[] {
  if (rx === 0 || ry === 0) {
    return [[x2, y2]];
  }

  // Ensure radii are positive
  rx = Math.abs(rx);
  ry = Math.abs(ry);

  // Compute transformed coordinates
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  // Correct radii if needed
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    rx *= sqrtLambda;
    ry *= sqrtLambda;
  }

  // Compute center
  const sign = fa === fs ? -1 : 1;
  const sq = Math.max(
    0,
    (rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p) /
      (rx * rx * y1p * y1p + ry * ry * x1p * x1p),
  );
  const coef = sign * Math.sqrt(sq);
  const cxp = (coef * rx * y1p) / ry;
  const cyp = (-coef * ry * x1p) / rx;
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  // Compute angles
  const theta1 = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx);
  const theta2 = Math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx);
  let deltaTheta = theta2 - theta1;

  // Adjust delta based on sweep flag
  if (fs === 0 && deltaTheta > 0) {
    deltaTheta -= 2 * Math.PI;
  } else if (fs === 1 && deltaTheta < 0) {
    deltaTheta += 2 * Math.PI;
  }

  // Generate cubic bezier segments (max 4 segments for full ellipse)
  const result: Vec2[] = [];
  const segments = Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2));
  const eta1 = theta1;
  const etaDelta = deltaTheta / segments;

  // Kappa constant for converting arc to cubic bezier
  const kappa = (4 / 3) * Math.tan(etaDelta / 4);

  for (let i = 0; i < segments; i++) {
    const eta2 = eta1 + etaDelta * (i + 1);
    const eta1s = eta1 + etaDelta * i;

    const cos1 = Math.cos(eta1s);
    const sin1 = Math.sin(eta1s);
    const cos2 = Math.cos(eta2);
    const sin2 = Math.sin(eta2);

    const epX1 = cx + rx * cos1;
    const epY1 = cy + ry * sin1;

    const epX2 = cx + rx * cos2;
    const epY2 = cy + ry * sin2;

    const alpha1 = -kappa * rx * sin1;
    const alpha2 = kappa * rx * sin2;
    const beta1 = kappa * ry * cos1;
    const beta2 = -kappa * ry * cos2;

    const cp1x = epX1 + alpha1 * cosPhi - beta1 * sinPhi;
    const cp1y = epY1 + alpha1 * sinPhi + beta1 * cosPhi;
    const cp2x = epX2 - alpha2 * cosPhi + beta2 * sinPhi;
    const cp2y = epY2 - alpha2 * sinPhi - beta2 * cosPhi;

    if (i === 0) {
      // First segment: skip anchor, just add controls and end
      result.push([cp1x, cp1y], [cp2x, cp2y], [epX2, epY2]);
    } else {
      result.push([cp1x, cp1y], [cp2x, cp2y], [epX2, epY2]);
    }
  }

  return result;
}

/**
 * Parse SVG path data into arrays of cubic Bezier control points.
 * Each sub-path (started by M/m or interrupted by Z/z) produces a separate array.
 *
 * Returns an array of sub-paths, where each sub-path is an array of Vec2 points
 * laid out as: [anchor, handle1, handle2, anchor, handle3, handle4, anchor, ...].
 */
export function parseSVGPathData(d: string): Vec2[][] {
  const subPaths: Vec2[][] = [];
  let currentPath: Vec2[] = [];
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  let lastCtrlX = 0;
  let lastCtrlY = 0;
  let prevCmd = '';

  const tokens = tokenizePath(d);

  for (const { cmd, args } of tokens) {
    const rel = cmd === cmd.toLowerCase();
    const uc = cmd.toUpperCase();

    switch (uc) {
      case 'M': {
        // MoveTo -- starts a new sub-path
        if (currentPath.length > 0) {
          subPaths.push(currentPath);
          currentPath = [];
        }
        for (let i = 0; i < args.length; i += 2) {
          const x = rel ? cx + args[i] : args[i];
          const y = rel ? cy + args[i + 1] : args[i + 1];
          if (i === 0) {
            startX = x;
            startY = y;
            currentPath.push([x, y]);
          } else {
            // Subsequent coordinate pairs after M are implicit LineTo
            pushLineTo(currentPath, cx, cy, x, y);
          }
          cx = x;
          cy = y;
        }
        prevCmd = 'M';
        break;
      }

      case 'L': {
        for (let i = 0; i < args.length; i += 2) {
          const x = rel ? cx + args[i] : args[i];
          const y = rel ? cy + args[i + 1] : args[i + 1];
          pushLineTo(currentPath, cx, cy, x, y);
          cx = x;
          cy = y;
        }
        prevCmd = 'L';
        break;
      }

      case 'H': {
        for (const a of args) {
          const x = rel ? cx + a : a;
          pushLineTo(currentPath, cx, cy, x, cy);
          cx = x;
        }
        prevCmd = 'H';
        break;
      }

      case 'V': {
        for (const a of args) {
          const y = rel ? cy + a : a;
          pushLineTo(currentPath, cx, cy, cx, y);
          cy = y;
        }
        prevCmd = 'V';
        break;
      }

      case 'C': {
        for (let i = 0; i < args.length; i += 6) {
          let c1x = args[i],
            c1y = args[i + 1];
          let c2x = args[i + 2],
            c2y = args[i + 3];
          let ex = args[i + 4],
            ey = args[i + 5];
          if (rel) {
            c1x += cx;
            c1y += cy;
            c2x += cx;
            c2y += cy;
            ex += cx;
            ey += cy;
          }
          currentPath.push([c1x, c1y], [c2x, c2y], [ex, ey]);
          lastCtrlX = c2x;
          lastCtrlY = c2y;
          cx = ex;
          cy = ey;
        }
        prevCmd = 'C';
        break;
      }

      case 'S': {
        for (let i = 0; i < args.length; i += 4) {
          // Reflected control point
          let c1x = cx,
            c1y = cy;
          if (prevCmd === 'C' || prevCmd === 'S') {
            c1x = 2 * cx - lastCtrlX;
            c1y = 2 * cy - lastCtrlY;
          }
          let c2x = args[i],
            c2y = args[i + 1];
          let ex = args[i + 2],
            ey = args[i + 3];
          if (rel) {
            c2x += cx;
            c2y += cy;
            ex += cx;
            ey += cy;
          }
          currentPath.push([c1x, c1y], [c2x, c2y], [ex, ey]);
          lastCtrlX = c2x;
          lastCtrlY = c2y;
          cx = ex;
          cy = ey;
          prevCmd = 'S';
        }
        break;
      }

      case 'Q': {
        for (let i = 0; i < args.length; i += 4) {
          let qx = args[i],
            qy = args[i + 1];
          let ex = args[i + 2],
            ey = args[i + 3];
          if (rel) {
            qx += cx;
            qy += cy;
            ex += cx;
            ey += cy;
          }
          // Elevate quadratic to cubic
          const c1x = cx + (2 / 3) * (qx - cx);
          const c1y = cy + (2 / 3) * (qy - cy);
          const c2x = ex + (2 / 3) * (qx - ex);
          const c2y = ey + (2 / 3) * (qy - ey);
          currentPath.push([c1x, c1y], [c2x, c2y], [ex, ey]);
          lastCtrlX = qx;
          lastCtrlY = qy;
          cx = ex;
          cy = ey;
        }
        prevCmd = 'Q';
        break;
      }

      case 'T': {
        for (let i = 0; i < args.length; i += 2) {
          let qx = cx,
            qy = cy;
          if (prevCmd === 'Q' || prevCmd === 'T') {
            qx = 2 * cx - lastCtrlX;
            qy = 2 * cy - lastCtrlY;
          }
          let ex = args[i],
            ey = args[i + 1];
          if (rel) {
            ex += cx;
            ey += cy;
          }
          const c1x = cx + (2 / 3) * (qx - cx);
          const c1y = cy + (2 / 3) * (qy - cy);
          const c2x = ex + (2 / 3) * (qx - ex);
          const c2y = ey + (2 / 3) * (qy - ey);
          currentPath.push([c1x, c1y], [c2x, c2y], [ex, ey]);
          lastCtrlX = qx;
          lastCtrlY = qy;
          cx = ex;
          cy = ey;
          prevCmd = 'T';
        }
        break;
      }

      case 'A': {
        for (let i = 0; i < args.length; i += 7) {
          const rx = args[i];
          const ry = args[i + 1];
          const phi = (args[i + 2] * Math.PI) / 180;
          const fa = args[i + 3];
          const fs = args[i + 4];
          let ex = args[i + 5],
            ey = args[i + 6];
          if (rel) {
            ex += cx;
            ey += cy;
          }
          const arcPts = arcToCubicBezier(cx, cy, ex, ey, rx, ry, phi, fa, fs);
          for (const pt of arcPts) {
            currentPath.push(pt);
          }
          cx = ex;
          cy = ey;
        }
        prevCmd = 'A';
        break;
      }

      case 'Z': {
        // Close path
        if (cx !== startX || cy !== startY) {
          pushLineTo(currentPath, cx, cy, startX, startY);
        }
        cx = startX;
        cy = startY;
        prevCmd = 'Z';
        break;
      }
    }
  }

  if (currentPath.length > 0) {
    subPaths.push(currentPath);
  }

  return subPaths;
}

/**
 * Convert SVG path data string into a single VMobject (or null if empty).
 * Applies accumulated translation, element scale, world scale, and optional Y-flip.
 *
 * The final position for each path point (px, py) is:
 *   worldX = (accTx + elementScale * px) * worldScale
 *   worldY = ±(accTy + elementScale * py) * worldScale   (sign depends on flipY)
 *
 * When elementScale=1, this reduces to (px + accTx) * worldScale (original behavior).
 */
function pathDataToVMobject(
  d: string,
  accTx: number,
  accTy: number,
  elementScale: number,
  worldScale: number,
  flipY: boolean,
  color: string,
  strokeWidth: number,
  fillOpacity: number,
): VMobject | null {
  const subPaths = parseSVGPathData(d);
  if (subPaths.length === 0) return null;

  const allPoints: Vec3[] = [];
  const subpathLengths: number[] = [];

  for (const sp of subPaths) {
    const startLen = allPoints.length;
    for (const [px, py] of sp) {
      const x = (accTx + elementScale * px) * worldScale;
      const y = flipY
        ? -(accTy + elementScale * py) * worldScale
        : (accTy + elementScale * py) * worldScale;
      allPoints.push([x, y, 0]);
    }
    const count = allPoints.length - startLen;
    if (count > 0) subpathLengths.push(count);
  }

  if (allPoints.length < 2) return null;

  const vmob = new VMobject();
  vmob.color = color;
  vmob.strokeWidth = strokeWidth;
  vmob.fillOpacity = fillOpacity;
  vmob.setPoints3D(allPoints);

  // Set subpaths for multi-contour shapes
  if (subpathLengths.length > 1) {
    vmob.setSubpaths(subpathLengths, subpathLengths.map(() => true));
  }

  return vmob;
}

/**
 * Walk an SVG element tree (as produced by MathJax) and convert every
 * `<path>` element into a VMobject. Returns a VGroup containing one
 * VMobject child per glyph / path element.
 *
 * Handles MathJax SVG specifics:
 * - `<defs>` blocks with glyph definitions referenced via `<use>`
 * - Nested `<g>` transforms
 * - `viewBox` → coordinate mapping
 */
export function svgToVMobjects(
  svgElement: SVGElement | Element,
  options: SVGToVMobjectOptions = {},
): VGroup {
  const {
    color = WHITE,
    strokeWidth = DEFAULT_STROKE_WIDTH,
    fillOpacity = 0,
    scale: scaleFactor = 1,
    flipY = true,
  } = options;

  const group = new VGroup();

  // ------------------------------------------------------------------
  // 1. Collect <defs> glyph paths for <use> references
  // ------------------------------------------------------------------
  const defs = new Map<string, string>(); // id -> d-attribute
  const defElements = svgElement.querySelectorAll('defs path');
  defElements.forEach((el) => {
    const id = el.getAttribute('id');
    const d = el.getAttribute('d');
    if (id && d) defs.set(id, d);
  });

  // ------------------------------------------------------------------
  // 2. Recursively walk the SVG tree
  // ------------------------------------------------------------------

  // Convert the SVG coordinate system: MathJax uses large integer units
  // (typically 1000-unit em-square). We scale down to manim world units.
  const viewBox = svgElement.getAttribute?.('viewBox');
  let vbScale = 1;
  let vbOffsetX = 0;
  let vbOffsetY = 0;
  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(Number);
    vbOffsetX = parts[0] || 0;
    vbOffsetY = parts[1] || 0;
    const vbWidth = parts[2] || 1000;
    vbScale = 1 / vbWidth;
  }

  const worldScale = scaleFactor * vbScale;

  // eslint-disable-next-line complexity
  function walkElement(el: Element, accTx: number, accTy: number, accScale: number): void {
    const tag = el.tagName.toLowerCase();

    // Skip <defs> — we collected them above
    if (tag === 'defs') return;

    // Handle <g> transform: translate and scale
    // SVG transforms apply left-to-right in the attribute string.
    // For "translate(a,b) scale(s)": point p → (a + s*p.x, b + s*p.y)
    // We accumulate into (accTx, accTy, accScale) so that:
    //   worldPoint = (accTx + accScale * localPoint) * worldScale
    let localTx = accTx;
    let localTy = accTy;
    let localScale = accScale;
    const transform = el.getAttribute('transform');
    if (transform) {
      const regex = /(translate|scale)\s*\(([^)]*)\)/g;
      let m;
      while ((m = regex.exec(transform)) !== null) {
        const type = m[1];
        const args = m[2]
          .split(/[\s,]+/)
          .filter(Boolean)
          .map(Number);
        if (type === 'translate') {
          localTx += localScale * (args[0] || 0);
          localTy += localScale * (args[1] || 0);
        } else if (type === 'scale') {
          localScale *= args[0] || 1;
        }
      }
    }

    if (tag === 'path') {
      const d = el.getAttribute('d');
      if (d) {
        const elFillAttr = el.getAttribute('fill');
        const pathFillOpacity = elFillAttr === 'none' ? 0 : fillOpacity;
        const vmob = pathDataToVMobject(
          d,
          localTx,
          localTy,
          localScale,
          worldScale,
          flipY,
          color,
          strokeWidth,
          pathFillOpacity,
        );
        if (vmob) group.add(vmob);
      }
    } else if (tag === 'use') {
      // Resolve <use xlink:href="#id"> or <use href="#id">
      const href = el.getAttribute('xlink:href') || el.getAttribute('href') || '';
      const id = href.replace(/^#/, '');
      const d = defs.get(id);

      // <use> elements can have their own x/y offsets (in local coordinate space)
      const useX = parseFloat(el.getAttribute('x') || '0');
      const useY = parseFloat(el.getAttribute('y') || '0');

      if (d) {
        const vmob = pathDataToVMobject(
          d,
          localTx + localScale * useX,
          localTy + localScale * useY,
          localScale,
          worldScale,
          flipY,
          color,
          strokeWidth,
          fillOpacity,
        );
        if (vmob) group.add(vmob);
      }
    } else if (tag === 'rect') {
      const rx = parseFloat(el.getAttribute('x') || '0');
      const ry = parseFloat(el.getAttribute('y') || '0');
      const rw = parseFloat(el.getAttribute('width') || '0');
      const rh = parseFloat(el.getAttribute('height') || '0');
      if (rw > 0 && rh > 0) {
        const d = `M${rx},${ry} L${rx + rw},${ry} L${rx + rw},${ry + rh} L${rx},${ry + rh} Z`;
        const vmob = pathDataToVMobject(
          d,
          localTx,
          localTy,
          localScale,
          worldScale,
          flipY,
          color,
          strokeWidth,
          fillOpacity,
        );
        if (vmob) group.add(vmob);
      }
    }

    // Recurse into children
    for (const child of el.children) {
      walkElement(child, localTx, localTy, localScale);
    }
  }

  walkElement(svgElement, -vbOffsetX, -vbOffsetY, 1);

  return group;
}

/**
 * Helper function to convert raw SVG path data directly to a VMobject.
 * This is useful for simple paths without the full SVG element wrapper.
 */
export function pathDataToVMobjectSimple(
  d: string,
  options: {
    color?: string;
    strokeWidth?: number;
    fillOpacity?: number;
    strokeOpacity?: number;
    scale?: number;
  } = {},
): VMobject | null {
  const {
    color = WHITE,
    strokeWidth = DEFAULT_STROKE_WIDTH,
    fillOpacity = 0,
    strokeOpacity = 1,
    scale = 1,
  } = options;

  const vmob = pathDataToVMobject(d, 0, 0, 1, scale, false, color, strokeWidth, fillOpacity);
  if (vmob) {
    vmob.strokeOpacity = strokeOpacity;
  }
  return vmob;
}
