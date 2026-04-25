/**
 * BooleanOperations.ts
 *
 * Proper boolean operations on VMobjects using paper.js.
 * Pipeline (mirrors Manim's skia-pathops approach):
 *
 *   VMobject (cubic Bézier points3D, groups of 4)
 *       ↓  vmobjectToPaperPath()   — bakes world position, emits moveTo + cubicTo + close
 *   paper.Path / paper.CompoundPath
 *       ↓  unite / intersect / subtract / exclude
 *   paper.PathItem result (may be CompoundPath for multi-contour output)
 *       ↓  item.pathData → SVG d string
 *       ↓  MorphSVGPlugin.stringToRawPath() — same as Tex._svgToVMobjectsGSAP
 *   VMobject result (smooth curves, proper subpaths)
 */

import paper from 'paper';
import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { VMobject } from '../../core/VMobject';


/**
 * Options shared by all boolean operations.
 * All fields are optional — unset fields inherit from shapeA.
 */
export interface BooleanOperationOptions {
  /** Stroke color. Inherits from shapeA if unset. */
  color?: string;
  /** Fill color. Inherits from shapeA if unset. */
  fillColor?: string;
  /** Fill opacity 0–1. Inherits from shapeA if unset. */
  fillOpacity?: number;
  /** Stroke width. Inherits from shapeA if unset. */
  strokeWidth?: number;
  /** Stroke opacity 0–1. Inherits from shapeA if unset. */
  strokeOpacity?: number;
  /** Overall opacity 0–1. Inherits from shapeA if unset. */
  opacity?: number;
}

gsap.registerPlugin(MorphSVGPlugin);

// ── Paper.js setup ────────────────────────────────────────────────────────────
// paper.setup() must be called once before any Path construction.
// We use a tiny off-screen canvas; boolean ops are pure math so rendering is irrelevant.
let _paperReady = false;
function ensurePaper(): void {
  if (_paperReady) return;
  // In browser: create a minimal canvas just to satisfy paper's init requirement.
  // All boolean ops are pure geometry — the canvas is never drawn to.
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  paper.setup(canvas);
  _paperReady = true;
}

// ── VMobject → paper.Path ─────────────────────────────────────────────────────

/**
 * Convert one VMobject (including its world-space position) into a paper.js Path.
 * points3D is stored as groups of 4: [anchor0, handle1, handle2, anchor1, ...]
 * which maps directly to paper's cubicTo(handle1, handle2, anchor1) after moveTo(anchor0).
 *
 * Multi-subpath VMobjects produce a paper.CompoundPath.
 */
function vmobjectToPaperPath(mob: VMobject): paper.PathItem {
  ensurePaper();

  const subpaths = mob.getSubpathPoints();

  if (subpaths.length === 0) {
    return new paper.Path();
  }

  // World-space offset (position is applied at render time, bake it in for clipping)
  const ox = mob.position[0];
  const oy = mob.position[1];

  const buildPath = (pts: number[][], closed: boolean): paper.Path => {
    const path = new paper.Path();
    if (pts.length < 4) return path;

    const numSegments = Math.floor((pts.length - 1) / 3);

    // First anchor — moveTo
    const p0 = pts[0];
    path.moveTo(new paper.Point(p0[0] + ox, p0[1] + oy));

    for (let i = 0; i < numSegments; i++) {
      const base = i * 3;
      // [anchor, handle1, handle2, anchor]
      const h1 = pts[base + 1];
      const h2 = pts[base + 2];
      const a1 = pts[base + 3];
      path.cubicCurveTo(
        new paper.Point(h1[0] + ox, h1[1] + oy),
        new paper.Point(h2[0] + ox, h2[1] + oy),
        new paper.Point(a1[0] + ox, a1[1] + oy),
      );
    }

    if (closed) path.closePath();
    return path;
  };

  if (subpaths.length === 1) {
    return buildPath(subpaths[0].points, subpaths[0].closed);
  }

  // Multiple subpaths → CompoundPath
  const compound = new paper.CompoundPath({});
  for (const sp of subpaths) {
    const p = buildPath(sp.points, sp.closed);
    compound.addChild(p);
  }
  return compound;
}

// ── paper.PathItem → VMobject ─────────────────────────────────────────────────

/**
 * Convert a paper.js PathItem back into VMobject points3D.
 *
 * Uses paper's pathData (SVG d string) → MorphSVGPlugin.stringToRawPath,
 * identical to how Tex._svgToVMobjectsGSAP processes SVG paths.
 *
 * rawPath layout per subpath: [ax, ay, cp1x, cp1y, cp2x, cp2y, ax2, ay2, ...]
 *   - First two values: first anchor (M point)
 *   - Then groups of 6: cp1, cp2, next anchor (cubic bezier)
 *
 * Your points3D format per segment: [anchor, handle1, handle2, anchor]
 */
function paperPathToVMobject(item: paper.PathItem, result: VMobject): void {
  // Get SVG path data string from paper.js result
  const d = (item as any).pathData as string;
  if (!d) {
    result.setPoints3D([]);
    return;
  }

  // Parse SVG d string into rawPath using GSAP MorphSVGPlugin
  const rawPath = MorphSVGPlugin.stringToRawPath(d);
  if (!rawPath || rawPath.length === 0) {
    result.setPoints3D([]);
    return;
  }

  const allPoints: number[][] = [];
  const subpathLengths: number[] = [];

  for (const segment of rawPath) {
    const coords = segment as unknown as number[];
    const startIdx = allPoints.length;

    // First anchor (M point)
    allPoints.push([coords[0], coords[1], 0]);

    // Groups of 6: cp1x, cp1y, cp2x, cp2y, ax, ay
    for (let i = 2; i + 5 <= coords.length; i += 6) {
      allPoints.push([coords[i],     coords[i + 1], 0]); // handle1
      allPoints.push([coords[i + 2], coords[i + 3], 0]); // handle2
      allPoints.push([coords[i + 4], coords[i + 5], 0]); // anchor
    }

    const len = allPoints.length - startIdx;
    if (len >= 4) {
      subpathLengths.push(len);
    } else {
      // Too few points — discard this subpath
      allPoints.splice(startIdx);
    }
  }

  if (allPoints.length < 4) {
    result.setPoints3D([]);
    return;
  }

  // Compute centroid of all points
  let cx = 0, cy = 0;
  for (const p of allPoints) { cx += p[0]; cy += p[1]; }
  cx /= allPoints.length;
  cy /= allPoints.length;

  // Normalize to local space — subtract centroid from every point
  const localPoints = allPoints.map(p => [p[0] - cx, p[1] - cy, 0]);

  result.setPoints3D(localPoints);

  if (subpathLengths.length > 1) {
    result.setSubpaths(subpathLengths, subpathLengths.map(() => true));
  } else {
    result.subpaths = undefined;
  }

  // Store centroid as position — geometry is now in local space
  result.position = [cx, cy, 0];
  result.markDirty();
}

// ── Core boolean op helper ────────────────────────────────────────────────────

type PaperBoolOp = 'unite' | 'intersect' | 'subtract' | 'exclude';

function booleanOp(
  a: VMobject,
  b: VMobject,
  op: PaperBoolOp,
  options: BooleanOperationOptions,
  result: VMobject,
): void {
  ensurePaper();

  const pathA = vmobjectToPaperPath(a);
  const pathB = vmobjectToPaperPath(b);

  let output: paper.PathItem;
  switch (op) {
    case 'unite':
      output = pathA.unite(pathB, { insert: false });
      break;
    case 'intersect':
      output = pathA.intersect(pathB, { insert: false });
      break;
    case 'subtract':
      output = pathA.subtract(pathB, { insert: false });
      break;
    case 'exclude':
      output = pathA.exclude(pathB, { insert: false });
      break;
  }

  // Debug logs for exclusion operation
  if (op === 'exclude') {
    const pathData = (output as any).pathData;
  }

  paperPathToVMobject(output, result);

  // Debug: print points3D after conversion
  if (op === 'exclude') {
  }

  // Style — inherit from shapeA, allow overrides
  result.color        = options.color        ?? a.color;
  result.fillColor    = options.fillColor    ?? a.fillColor ?? a.color;
  result.fillOpacity  = options.fillOpacity  ?? a.fillOpacity;
  result.strokeWidth  = options.strokeWidth  ?? a.strokeWidth;
  result.strokeOpacity = options.strokeOpacity ?? a.strokeOpacity;
  result.opacity      = options.opacity      ?? a.opacity;

  // Clean up paper items (avoid memory leak in long-running apps)
  pathA.remove();
  pathB.remove();
  output.remove();
}

// ── Public result classes (match Manim's class-based API) ─────────────────────

export class Union extends VMobject {
  constructor(a: VMobject, b: VMobject, options: BooleanOperationOptions = {}) {
    super();
    booleanOp(a, b, 'unite', options, this);
  }
}

export class Intersection extends VMobject {
  constructor(a: VMobject, b: VMobject, options: BooleanOperationOptions = {}) {
    super();
    booleanOp(a, b, 'intersect', options, this);
  }
}

export class Difference extends VMobject {
  constructor(a: VMobject, b: VMobject, options: BooleanOperationOptions = {}) {
    super();
    booleanOp(a, b, 'subtract', options, this);
  }
}

export class Exclusion extends VMobject {
  constructor(a: VMobject, b: VMobject, options: BooleanOperationOptions = {}) {
    super();
    booleanOp(a, b, 'exclude', options, this);
  }
}

// ── Functional API (matches your existing test code) ─────────────────────────

export function union(a: VMobject, b: VMobject, options: BooleanOperationOptions = {}): Union {
  return new Union(a, b, options);
}

export function intersection(a: VMobject, b: VMobject, options: BooleanOperationOptions = {}): Intersection {
  return new Intersection(a, b, options);
}

export function difference(a: VMobject, b: VMobject, options: BooleanOperationOptions = {}): Difference {
  return new Difference(a, b, options);
}

export function exclusion(a: VMobject, b: VMobject, options: BooleanOperationOptions = {}): Exclusion {
  return new Exclusion(a, b, options);
}
