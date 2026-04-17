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

// ---------------------------------------------------------------------------
// Affine transform math
// ---------------------------------------------------------------------------

/**
 * 2×3 affine matrix: [a, b, c, d, e, f]
 * Maps (x,y) → (a*x + c*y + e,  b*x + d*y + f)
 * Matches SVG matrix(a b c d e f) convention.
 */
type Mat2x3 = [number, number, number, number, number, number];

function identityMat(): Mat2x3 {
  return [1, 0, 0, 1, 0, 0] as Mat2x3;
}

/** Returns parent * child (child transform applied first). */
function concatMat(p: Mat2x3, c: Mat2x3): Mat2x3 {
  return [
    p[0] * c[0] + p[2] * c[1],
    p[1] * c[0] + p[3] * c[1],
    p[0] * c[2] + p[2] * c[3],
    p[1] * c[2] + p[3] * c[3],
    p[0] * c[4] + p[2] * c[5] + p[4],
    p[1] * c[4] + p[3] * c[5] + p[5],
  ] as Mat2x3;
}

function applyMat(m: Mat2x3, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/**
 * Parse an SVG transform attribute string into a Mat2x3.
 * Handles: matrix, translate, scale, rotate, skewX, skewY.
 * Multiple functions are composed left-to-right as per SVG spec.
 */
function parseSVGTransform(transform: string): Mat2x3 {
  let result = identityMat();
  const regex = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(transform)) !== null) {
    const type = m[1];
    const args = m[2].split(/[\s,]+/).filter(Boolean).map(Number);
    let local: Mat2x3;

    switch (type) {
      case 'matrix':
        local = [
          args[0] ?? 1, args[1] ?? 0,
          args[2] ?? 0, args[3] ?? 1,
          args[4] ?? 0, args[5] ?? 0,
        ] as Mat2x3;
        break;
      case 'translate':
        local = [1, 0, 0, 1, args[0] ?? 0, args[1] ?? 0] as Mat2x3;
        break;
      case 'scale': {
        const sx = args[0] ?? 1;
        const sy = args[1] ?? sx;
        local = [sx, 0, 0, sy, 0, 0] as Mat2x3;
        break;
      }
      case 'rotate': {
        const angle = ((args[0] ?? 0) * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        if (args.length >= 3) {
          const cx = args[1], cy = args[2];
          local = [
            cos,  sin,
            -sin, cos,
            cx - cos * cx + sin * cy,
            cy - sin * cx - cos * cy,
          ] as Mat2x3;
        } else {
          local = [cos, sin, -sin, cos, 0, 0] as Mat2x3;
        }
        break;
      }
      case 'skewX': {
        const t = Math.tan(((args[0] ?? 0) * Math.PI) / 180);
        local = [1, 0, t, 1, 0, 0] as Mat2x3;
        break;
      }
      case 'skewY': {
        const t = Math.tan(((args[0] ?? 0) * Math.PI) / 180);
        local = [1, t, 0, 1, 0, 0] as Mat2x3;
        break;
      }
      default:
        local = identityMat();
    }
    result = concatMat(result, local);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Path tokenizer
// ---------------------------------------------------------------------------

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
    const args: number[] = [];
    if (argsStr) {
      const numRegex = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g;
      let numMatch;
      while ((numMatch = numRegex.exec(argsStr)) !== null) {
        args.push(parseFloat(numMatch[0]));
      }
    }
    tokens.push({ cmd, args });
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Path geometry helpers
// ---------------------------------------------------------------------------

/**
 * Convert line segment to cubic bezier (straight line = degenerate cubic).
 */
function pushLineTo(path: Vec2[], x1: number, y1: number, x2: number, y2: number): void {
  const c1x = x1 + (x2 - x1) / 3;
  const c1y = y1 + (y2 - y1) / 3;
  const c2x = x1 + (2 * (x2 - x1)) / 3;
  const c2y = y1 + (2 * (y2 - y1)) / 3;
  path.push([c1x, c1y], [c2x, c2y], [x2, y2]);
}

/**
 * Convert elliptical arc to cubic bezier segments.
 */
function arcToCubicBezier(
  x1: number, y1: number,
  x2: number, y2: number,
  rx: number, ry: number,
  phi: number, fa: number, fs: number,
): Vec2[] {
  if (rx === 0 || ry === 0) return [[x2, y2]];

  rx = Math.abs(rx);
  ry = Math.abs(ry);

  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    rx *= sqrtLambda;
    ry *= sqrtLambda;
  }

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

  const theta1 = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx);
  const theta2 = Math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx);
  let deltaTheta = theta2 - theta1;

  if (fs === 0 && deltaTheta > 0) deltaTheta -= 2 * Math.PI;
  else if (fs === 1 && deltaTheta < 0) deltaTheta += 2 * Math.PI;

  const result: Vec2[] = [];
  const segments = Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2));
  const etaDelta = deltaTheta / segments;
  const kappa = (4 / 3) * Math.tan(etaDelta / 4);

  for (let i = 0; i < segments; i++) {
    const eta1s = theta1 + etaDelta * i;
    const eta2 = theta1 + etaDelta * (i + 1);

    const cos1 = Math.cos(eta1s); const sin1 = Math.sin(eta1s);
    const cos2 = Math.cos(eta2);  const sin2 = Math.sin(eta2);

    const epX1 = cx + rx * cos1; const epY1 = cy + ry * sin1;
    const epX2 = cx + rx * cos2; const epY2 = cy + ry * sin2;

    const cp1x = epX1 + (-kappa * rx * sin1) * cosPhi - (kappa * ry * cos1) * sinPhi;
    const cp1y = epY1 + (-kappa * rx * sin1) * sinPhi + (kappa * ry * cos1) * cosPhi;
    const cp2x = epX2 - (kappa * rx * sin2) * cosPhi + (-kappa * ry * cos2) * sinPhi;
    const cp2y = epY2 - (kappa * rx * sin2) * sinPhi + (-kappa * ry * cos2) * cosPhi;

    result.push([cp1x, cp1y], [cp2x, cp2y], [epX2, epY2]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Public: parse path data
// ---------------------------------------------------------------------------

/**
 * Parse SVG path data into arrays of cubic Bezier control points.
 * Each sub-path produces a separate array.
 */
export function parseSVGPathData(d: string): Vec2[][] {
  const subPaths: Vec2[][] = [];
  let currentPath: Vec2[] = [];
  let cx = 0, cy = 0;
  let startX = 0, startY = 0;
  let lastCtrlX = 0, lastCtrlY = 0;
  let prevCmd = '';

  for (const { cmd, args } of tokenizePath(d)) {
    const rel = cmd === cmd.toLowerCase();
    const uc = cmd.toUpperCase();

    switch (uc) {
      case 'M': {
        if (currentPath.length > 0) { subPaths.push(currentPath); currentPath = []; }
        for (let i = 0; i < args.length; i += 2) {
          const x = rel ? cx + args[i] : args[i];
          const y = rel ? cy + args[i + 1] : args[i + 1];
          if (i === 0) { startX = x; startY = y; currentPath.push([x, y]); }
          else pushLineTo(currentPath, cx, cy, x, y);
          cx = x; cy = y;
        }
        prevCmd = 'M'; break;
      }
      case 'L': {
        for (let i = 0; i < args.length; i += 2) {
          const x = rel ? cx + args[i] : args[i];
          const y = rel ? cy + args[i + 1] : args[i + 1];
          pushLineTo(currentPath, cx, cy, x, y);
          cx = x; cy = y;
        }
        prevCmd = 'L'; break;
      }
      case 'H': {
        for (const a of args) {
          const x = rel ? cx + a : a;
          pushLineTo(currentPath, cx, cy, x, cy);
          cx = x;
        }
        prevCmd = 'H'; break;
      }
      case 'V': {
        for (const a of args) {
          const y = rel ? cy + a : a;
          pushLineTo(currentPath, cx, cy, cx, y);
          cy = y;
        }
        prevCmd = 'V'; break;
      }
      case 'C': {
        for (let i = 0; i < args.length; i += 6) {
          let c1x = args[i], c1y = args[i + 1];
          let c2x = args[i + 2], c2y = args[i + 3];
          let ex = args[i + 4], ey = args[i + 5];
          if (rel) { c1x += cx; c1y += cy; c2x += cx; c2y += cy; ex += cx; ey += cy; }
          currentPath.push([c1x, c1y], [c2x, c2y], [ex, ey]);
          lastCtrlX = c2x; lastCtrlY = c2y;
          cx = ex; cy = ey;
        }
        prevCmd = 'C'; break;
      }
      case 'S': {
        for (let i = 0; i < args.length; i += 4) {
          let c1x = cx, c1y = cy;
          if (prevCmd === 'C' || prevCmd === 'S') { c1x = 2 * cx - lastCtrlX; c1y = 2 * cy - lastCtrlY; }
          let c2x = args[i], c2y = args[i + 1];
          let ex = args[i + 2], ey = args[i + 3];
          if (rel) { c2x += cx; c2y += cy; ex += cx; ey += cy; }
          currentPath.push([c1x, c1y], [c2x, c2y], [ex, ey]);
          lastCtrlX = c2x; lastCtrlY = c2y;
          cx = ex; cy = ey;
        }
        prevCmd = 'S'; break;
      }
      case 'Q': {
        for (let i = 0; i < args.length; i += 4) {
          let qx = args[i], qy = args[i + 1];
          let ex = args[i + 2], ey = args[i + 3];
          if (rel) { qx += cx; qy += cy; ex += cx; ey += cy; }
          const c1x = cx + (2 / 3) * (qx - cx); const c1y = cy + (2 / 3) * (qy - cy);
          const c2x = ex + (2 / 3) * (qx - ex); const c2y = ey + (2 / 3) * (qy - ey);
          currentPath.push([c1x, c1y], [c2x, c2y], [ex, ey]);
          lastCtrlX = qx; lastCtrlY = qy;
          cx = ex; cy = ey;
        }
        prevCmd = 'Q'; break;
      }
      case 'T': {
        for (let i = 0; i < args.length; i += 2) {
          let qx = cx, qy = cy;
          if (prevCmd === 'Q' || prevCmd === 'T') { qx = 2 * cx - lastCtrlX; qy = 2 * cy - lastCtrlY; }
          let ex = args[i], ey = args[i + 1];
          if (rel) { ex += cx; ey += cy; }
          const c1x = cx + (2 / 3) * (qx - cx); const c1y = cy + (2 / 3) * (qy - cy);
          const c2x = ex + (2 / 3) * (qx - ex); const c2y = ey + (2 / 3) * (qy - ey);
          currentPath.push([c1x, c1y], [c2x, c2y], [ex, ey]);
          lastCtrlX = qx; lastCtrlY = qy;
          cx = ex; cy = ey;
        }
        prevCmd = 'T'; break;
      }
      case 'A': {
        for (let i = 0; i < args.length; i += 7) {
          const rx = args[i], ry = args[i + 1];
          const phi = (args[i + 2] * Math.PI) / 180;
          const fa = args[i + 3], fs = args[i + 4];
          let ex = args[i + 5], ey = args[i + 6];
          if (rel) { ex += cx; ey += cy; }
          for (const pt of arcToCubicBezier(cx, cy, ex, ey, rx, ry, phi, fa, fs)) {
            currentPath.push(pt);
          }
          cx = ex; cy = ey;
        }
        prevCmd = 'A'; break;
      }
      case 'Z': {
        if (cx !== startX || cy !== startY) pushLineTo(currentPath, cx, cy, startX, startY);
        cx = startX; cy = startY;
        prevCmd = 'Z'; break;
      }
    }
  }

  if (currentPath.length > 0) subPaths.push(currentPath);
  return subPaths;
}

// ---------------------------------------------------------------------------
// Internal: path → VMobject
// ---------------------------------------------------------------------------

/**
 * Convert parsed path data into a VMobject.
 * Applies the accumulated affine matrix, world scale, and optional Y-flip.
 */
function pathDataToVMobject(
  d: string,
  mat: Mat2x3,
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
      const [tx, ty] = applyMat(mat, px, py);
      const x = tx * worldScale;
      const y = flipY ? -ty * worldScale : ty * worldScale;
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

  if (subpathLengths.length > 1) {
    vmob.setSubpaths(subpathLengths, subpathLengths.map(() => true));
  }

  return vmob;
}

// ---------------------------------------------------------------------------
// Public: SVG element → VGroup
// ---------------------------------------------------------------------------

/**
 * Walk an SVG element tree and convert every <path>, <use>, and <rect>
 * into VMobjects. Returns a VGroup.
 *
 * All SVG transform types (matrix, translate, scale, rotate, skewX, skewY)
 * are fully supported via affine matrix accumulation.
 */
export function svgToVMobjects(
  svgElement: SVGElement | Element,
  options: SVGToVMobjectOptions = {},
): VGroup {
  console.log('[svgToVMobjects] NEW PARSER RUNNING');
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
  const defs = new Map<string, string>();
  svgElement.querySelectorAll('defs path').forEach((el) => {
    const id = el.getAttribute('id');
    const d = el.getAttribute('d');
    if (id && d) defs.set(id, d);
  });

  // ------------------------------------------------------------------
  // 2. Compute worldScale from viewBox
  // ------------------------------------------------------------------
  const viewBox = svgElement.getAttribute?.('viewBox');
  let vbOffsetX = 0;
  let vbOffsetY = 0;
  let vbScale = 1;

  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(Number);
    vbOffsetX = parts[0] || 0;
    vbOffsetY = parts[1] || 0;
    const vbWidth = parts[2] || 1000;
    vbScale = 1 / vbWidth;
  }

  const worldScale = scaleFactor * vbScale;

  // Initial matrix accounts for viewBox offset
  const vbOffsetMat: Mat2x3 = [1, 0, 0, 1, -vbOffsetX, -vbOffsetY] as Mat2x3;

  // ------------------------------------------------------------------
  // 3. Recursively walk the element tree
  // ------------------------------------------------------------------
  function walkElement(el: Element, accMat: Mat2x3): void {
    const tag = el.tagName.toLowerCase();
    if (tag === 'defs') return;

    // Compose this element's transform with the accumulated matrix
    let localMat = accMat;
    const transformAttr = el.getAttribute('transform');
    if (transformAttr) {
      localMat = concatMat(accMat, parseSVGTransform(transformAttr));
    }

    if (tag === 'path') {
      const d = el.getAttribute('d');
      if (d) {
        const elFillAttr = el.getAttribute('fill');
        const pathFillOpacity = elFillAttr === 'none' ? 0 : fillOpacity;
        const vmob = pathDataToVMobject(d, localMat, worldScale, flipY, color, strokeWidth, pathFillOpacity);
        if (vmob) group.add(vmob);
      }
    } else if (tag === 'use') {
      const href = el.getAttribute('xlink:href') || el.getAttribute('href') || '';
      const id = href.replace(/^#/, '');
      const d = defs.get(id);
      const useX = parseFloat(el.getAttribute('x') || '0');
      const useY = parseFloat(el.getAttribute('y') || '0');
      if (d) {
        // <use> x/y is an additional translate in the local coordinate space
        const useMat = concatMat(localMat, [1, 0, 0, 1, useX, useY] as Mat2x3);
        const vmob = pathDataToVMobject(d, useMat, worldScale, flipY, color, strokeWidth, fillOpacity);
        if (vmob) group.add(vmob);
      }
    } else if (tag === 'rect') {
      const rx = parseFloat(el.getAttribute('x') || '0');
      const ry = parseFloat(el.getAttribute('y') || '0');
      const rw = parseFloat(el.getAttribute('width') || '0');
      const rh = parseFloat(el.getAttribute('height') || '0');
      if (rw > 0 && rh > 0) {
        const d = `M${rx},${ry} L${rx + rw},${ry} L${rx + rw},${ry + rh} L${rx},${ry + rh} Z`;
        const vmob = pathDataToVMobject(d, localMat, worldScale, flipY, color, strokeWidth, fillOpacity);
        if (vmob) group.add(vmob);
      }
    }

    for (const child of el.children) {
      walkElement(child, localMat);
    }
  }

  walkElement(svgElement, vbOffsetMat);
  return group;
}

// ---------------------------------------------------------------------------
// Public: simple helper
// ---------------------------------------------------------------------------

/**
 * Convert raw SVG path data directly to a VMobject.
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

  const mat: Mat2x3 = [scale, 0, 0, scale, 0, 0] as Mat2x3;
  const vmob = pathDataToVMobject(d, mat, 1, false, color, strokeWidth, fillOpacity);
  if (vmob) vmob.strokeOpacity = strokeOpacity;
  return vmob;
}