import { Group } from '../../core/Group';
import { ArcBetweenPoints } from './Arc';
import { VMobject } from '../../core/VMobject';
import type { Vec3 } from '../../core/types';
import { WHITE, DEFAULT_STROKE_WIDTH } from '../../constants/colors';

// ---------------------------------------------------------------------------
// CurvedArrowTip — filled triangle, same strategy as ArrowTip in arrow.ts
// ---------------------------------------------------------------------------

class CurvedArrowTip extends VMobject {
  constructor(tipPoint: number[], tipLeft: number[], tipRight: number[], color: string) {
    super();
    this.color = color;
    this.fillOpacity = 1;
    this.strokeWidth = 0;

    const addSeg = (pts: number[][], a: number[], b: number[], first: boolean) => {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const dz = b[2] - a[2];
      if (first) pts.push([...a]);
      pts.push([a[0] + dx / 3, a[1] + dy / 3, a[2] + dz / 3]);
      pts.push([a[0] + (2 * dx) / 3, a[1] + (2 * dy) / 3, a[2] + (2 * dz) / 3]);
      pts.push([...b]);
    };

    const pts: number[][] = [];
    addSeg(pts, tipLeft, tipPoint, true);
    addSeg(pts, tipPoint, tipRight, false);
    addSeg(pts, tipRight, tipLeft, false);
    this.setPoints3D(pts);
  }

  copy(): this {
    return new CurvedArrowTip([0, 0, 0], [0, 0, 0], [0, 0, 0], this.color) as this;
  }
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/**
 * Compute arc center and radius from start, end, and bow angle.
 * Matches ArcBetweenPoints: chord = 2 * radius * sin(|angle| / 2).
 * Positive angle → center on left of start→end, negative → right.
 */
function arcCenterRadius(
  start: Vec3,
  end: Vec3,
  angle: number,
): { cx: number; cy: number; radius: number } {
  const [x1, y1] = start;
  const [x2, y2] = end;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const chordLength = Math.sqrt(dx * dx + dy * dy);

  const radius = chordLength / (2 * Math.sin(Math.abs(angle) / 2));
  const midToCenter = Math.sqrt(Math.max(0, radius * radius - (chordLength / 2) ** 2));

  // Perpendicular direction (left of chord)
  const perpX = -dy / chordLength;
  const perpY = dx / chordLength;

  const side = angle > 0 ? 1 : -1;
  const cx = (x1 + x2) / 2 + side * midToCenter * perpX;
  const cy = (y1 + y2) / 2 + side * midToCenter * perpY;

  return { cx, cy, radius };
}

/**
 * Arc tangent direction at a point given by its angle theta from center.
 * CCW for positive bow angle, CW for negative.
 */
function arcTangentAt(theta: number, angle: number): [number, number] {
  const spanSign = angle >= 0 ? 1 : -1;
  return [spanSign * -Math.sin(theta), spanSign * Math.cos(theta)];
}

/**
 * Build tip triangle vertices.
 * apex    — the tip point (arrow head)
 * tangent — arc travel direction at apex
 * tipLength — how far back the base sits from apex
 * tipWidth  — half-width of the triangle base
 */
function buildTip(
  apex: Vec3,
  tangent: [number, number],
  tipLength: number,
  tipWidth: number,
): { tipLeft: number[]; tipRight: number[] } {
  const len = Math.sqrt(tangent[0] ** 2 + tangent[1] ** 2) || 1;
  const ux = tangent[0] / len;
  const uy = tangent[1] / len;
  const px = -uy; // perpendicular left
  const py = ux;

  const bx = apex[0] - ux * tipLength;
  const by = apex[1] - uy * tipLength;
  const bz = apex[2] ?? 0;

  return {
    tipLeft:  [bx + px * tipWidth, by + py * tipWidth, bz],
    tipRight: [bx - px * tipWidth, by - py * tipWidth, bz],
  };
}

/**
 * Walk back from apex along the tangent by `inset`, then find that point's
 * angle as seen from (cx, cy). Used to shorten the shaft to the tip base.
 */
function insetAngle(
  apex: Vec3,
  tangent: [number, number],
  inset: number,
  cx: number,
  cy: number,
): number {
  const len = Math.sqrt(tangent[0] ** 2 + tangent[1] ** 2) || 1;
  const px = apex[0] - (tangent[0] / len) * inset;
  const py = apex[1] - (tangent[1] / len) * inset;
  return Math.atan2(py - cy, px - cx);
}

// ---------------------------------------------------------------------------
// Public options
// ---------------------------------------------------------------------------

export interface CurvedArrowOptions {
  /** Start point. Default: [-1, 0, 0] */
  start?: Vec3;
  /** End point (where the tip points). Default: [1, 0, 0] */
  end?: Vec3;
  /**
   * Bow angle in radians — same convention as ArcBetweenPoints.
   * Positive → bows left of start→end. Default: Math.PI / 4
   */
  angle?: number;
  /** Stroke color. Default: WHITE */
  color?: string;
  /** Stroke width. Default: DEFAULT_STROKE_WIDTH */
  strokeWidth?: number;
  /** Tip length. Default: 0.3 */
  tipLength?: number;
  /** Tip width (half-base of triangle). Default: 0.2 */
  tipWidth?: number;
  /** Number of Bezier segments for the arc shaft. Default: 8 */
  numSegments?: number;
}

// ---------------------------------------------------------------------------
// CurvedArrow
// ---------------------------------------------------------------------------

/**
 * CurvedArrow — a curved arc with a filled triangular tip at the end.
 *
 * The shaft is an ArcBetweenPoints, so `angle` is identical to that class:
 * the signed bow angle, positive bows left, negative bows right.
 *
 * @example
 * ```typescript
 * const a = new CurvedArrow({
 *   start: [-2, 0, 0],
 *   end:   [ 2, 0, 0],
 *   angle: Math.PI / 3,
 *   color: '#ff0000',
 * });
 * ```
 */
export class CurvedArrow extends Group {
  protected _start: Vec3;
  protected _end: Vec3;
  protected _angle: number;
  protected _color: string;
  protected _strokeWidth: number;
  protected _tipLength: number;
  protected _tipWidth: number;
  protected _numSegments: number;

  constructor(options: CurvedArrowOptions = {}) {
    super();

    const {
      start = [-1, 0, 0],
      end = [1, 0, 0],
      angle = Math.PI / 4,
      color = WHITE,
      strokeWidth = DEFAULT_STROKE_WIDTH,
      tipLength = 0.3,
      tipWidth = 0.2,
      numSegments = 8,
    } = options;

    this._start = [...start];
    this._end = [...end];
    this._angle = angle;
    this._color = color;
    this._strokeWidth = strokeWidth;
    this._tipLength = tipLength;
    this._tipWidth = tipWidth;
    this._numSegments = numSegments;

    this._generateParts();
  }

  protected _generateParts(): void {
    this.children = [];

    const { cx, cy, radius } = arcCenterRadius(this._start, this._end, this._angle);

    // Arc tangent at end point
    const endTheta = Math.atan2(this._end[1] - cy, this._end[0] - cx);
    const endTangent = arcTangentAt(endTheta, this._angle);

    // Build end tip
    const { tipLeft, tipRight } = buildTip(this._end, endTangent, this._tipLength, this._tipWidth);

    // Shaft ends at tip base (inset from end along tangent)
    const shaftEndTheta = insetAngle(this._end, endTangent, this._tipLength, cx, cy);
    const shaftEnd: Vec3 = [
      cx + radius * Math.cos(shaftEndTheta),
      cy + radius * Math.sin(shaftEndTheta),
      this._end[2] ?? 0,
    ];

    this.add(new ArcBetweenPoints({
      start: this._start,
      end: shaftEnd,
      angle: this._angle,
      color: this._color,
      strokeWidth: this._strokeWidth,
    }));

    this.add(new CurvedArrowTip([...this._end], tipLeft, tipRight, this._color));
  }

  // --- Accessors ---

  getStart(): Vec3 { return [...this._start]; }
  setStart(p: Vec3): this { this._start = [...p]; this._generateParts(); return this; }

  getEnd(): Vec3 { return [...this._end]; }
  setEnd(p: Vec3): this { this._end = [...p]; this._generateParts(); return this; }

  getBowAngle(): number { return this._angle; }
  setBowAngle(a: number): this { this._angle = a; this._generateParts(); return this; }

  getTipLength(): number { return this._tipLength; }
  setTipLength(v: number): this { this._tipLength = v; this._generateParts(); return this; }

  getTipWidth(): number { return this._tipWidth; }
  setTipWidth(v: number): this { this._tipWidth = v; this._generateParts(); return this; }

  copy(): this {
    return new CurvedArrow({
      start: this._start,
      end: this._end,
      angle: this._angle,
      color: this._color,
      strokeWidth: this._strokeWidth,
      tipLength: this._tipLength,
      tipWidth: this._tipWidth,
      numSegments: this._numSegments,
    }) as this;
  }
}

// ---------------------------------------------------------------------------
// CurvedDoubleArrow
// ---------------------------------------------------------------------------

/**
 * CurvedDoubleArrow — like CurvedArrow but with tips on both ends.
 *
 * @example
 * ```typescript
 * const da = new CurvedDoubleArrow({
 *   start: [-2, 0, 0],
 *   end:   [ 2, 0, 0],
 *   angle: Math.PI / 3,
 * });
 * ```
 */
export class CurvedDoubleArrow extends CurvedArrow {
  protected override _generateParts(): void {
    this.children = [];

    const { cx, cy, radius } = arcCenterRadius(this._start, this._end, this._angle);

    // --- End tip ---
    const endTheta = Math.atan2(this._end[1] - cy, this._end[0] - cx);
    const endTangent = arcTangentAt(endTheta, this._angle);
    const { tipLeft: endTipLeft, tipRight: endTipRight } = buildTip(
      this._end, endTangent, this._tipLength, this._tipWidth,
    );
    const shaftEndTheta = insetAngle(this._end, endTangent, this._tipLength, cx, cy);
    const shaftEnd: Vec3 = [
      cx + radius * Math.cos(shaftEndTheta),
      cy + radius * Math.sin(shaftEndTheta),
      this._end[2] ?? 0,
    ];

    // --- Start tip (tangent reversed — tip points away from arc) ---
    const startTheta = Math.atan2(this._start[1] - cy, this._start[0] - cx);
    const startTangentFwd = arcTangentAt(startTheta, this._angle);
    const startTangentRev: [number, number] = [-startTangentFwd[0], -startTangentFwd[1]];
    const { tipLeft: startTipLeft, tipRight: startTipRight } = buildTip(
      this._start, startTangentRev, this._tipLength, this._tipWidth,
    );
    const shaftStartTheta = insetAngle(this._start, startTangentRev, this._tipLength, cx, cy);
    const shaftStart: Vec3 = [
      cx + radius * Math.cos(shaftStartTheta),
      cy + radius * Math.sin(shaftStartTheta),
      this._start[2] ?? 0,
    ];

    // Shaft between the two tip bases
    this.add(new ArcBetweenPoints({
      start: shaftStart,
      end: shaftEnd,
      angle: this._angle,
      color: this._color,
      strokeWidth: this._strokeWidth,
    }));

    // End tip
    this.add(new CurvedArrowTip([...this._end], endTipLeft, endTipRight, this._color));

    // Start tip — swap left/right to keep winding consistent
    this.add(new CurvedArrowTip([...this._start], startTipRight, startTipLeft, this._color));
  }

  copy(): this {
    return new CurvedDoubleArrow({
      start: this._start,
      end: this._end,
      angle: this._angle,
      color: this._color,
      strokeWidth: this._strokeWidth,
      tipLength: this._tipLength,
      tipWidth: this._tipWidth,
      numSegments: this._numSegments,
    }) as this;
  }
}