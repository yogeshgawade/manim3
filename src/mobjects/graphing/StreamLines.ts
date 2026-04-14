import { VectorField, VectorFieldBaseOptions, ColorFunction } from './VectorField';
import { VMobject } from '../../core/VMobject';
import { Arrow } from '../geometry/Arrow';
import type { Vec3 } from '../../core/types';
import type { UpdaterFn } from '../../core/types';

/**
 * Options for StreamLines
 */
export interface StreamLinesOptions extends VectorFieldBaseOptions {
  /** Number of streamlines. Default: 15 */
  numLines?: number;
  /** Starting points. Auto-generated if not provided */
  startPoints?: [number, number][];
  /** Maximum length of each streamline. Default: 10 */
  maxLineLength?: number;
  /** Integration step size. Default: 0.05 */
  stepSize?: number;
  /** Minimum steps before stopping. Default: 3 */
  minSteps?: number;
  /** Variable width based on magnitude. Default: false */
  variableWidth?: boolean;
  /** Draw arrows along streamlines. Default: false */
  showArrows?: boolean;
  /** Spacing between arrows. Default: 1 */
  arrowSpacing?: number;
  /** Virtual time for simulation. Default: 3 */
  virtualTime?: number;
  /** Max anchor points per line. Default: 100 */
  maxAnchorsPerLine?: number;
  /** Noise factor for start points. Default: yRange step / 2 */
  noiseFactor?: number;
  /** Padding for bounds. Default: 3 */
  padding?: number;
  /** Lines per grid point. Default: 1 */
  nRepeats?: number;
}

/**
 * Options for continuous animation
 */
export interface ContinuousMotionOptions {
  /** Warm up (lines start invisible). Default: true */
  warmUp?: boolean;
  /** Flow speed multiplier. Default: 1 */
  flowSpeed?: number;
  /** Window size as fraction (0-1). Default: 0.3 */
  timeWidth?: number;
}

/** Seeded PRNG for reproducible noise */
function seededRandom(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Linear interpolation between points */
function lerpPt(a: number[], b: number[], t: number): number[] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * t,
  ];
}

/** Split Bezier at parameter t */
function splitBezierAt(
  p0: number[],
  p1: number[],
  p2: number[],
  p3: number[],
  t: number,
): { left: number[][]; right: number[][] } {
  const q0 = lerpPt(p0, p1, t);
  const q1 = lerpPt(p1, p2, t);
  const q2 = lerpPt(p2, p3, t);
  const r0 = lerpPt(q0, q1, t);
  const r1 = lerpPt(q1, q2, t);
  const s0 = lerpPt(r0, r1, t);
  return { left: [p0, q0, r0, s0], right: [s0, r1, q2, p3] };
}

/** Extract partial Bezier points between lower and upper (0-1) */
function getPartialBezierPoints(allPoints: number[][], lower: number, upper: number): number[][] {
  if (allPoints.length < 4) return [];
  const nCurves = (allPoints.length - 1) / 3;
  if (nCurves < 1 || lower >= upper) return [];

  lower = Math.max(0, Math.min(1, lower));
  upper = Math.max(0, Math.min(1, upper));

  const lowerIdx = lower * nCurves;
  const upperIdx = upper * nCurves;
  let lowerCurve = Math.floor(lowerIdx);
  let upperCurve = Math.floor(upperIdx);
  let lowerT = lowerIdx - lowerCurve;
  let upperT = upperIdx - upperCurve;

  if (upperCurve >= nCurves) {
    upperCurve = Math.floor(nCurves) - 1;
    upperT = 1.0;
  }
  if (lowerCurve >= nCurves) {
    lowerCurve = Math.floor(nCurves) - 1;
    lowerT = 1.0;
  }

  const result: number[][] = [];

  for (let i = lowerCurve; i <= upperCurve; i++) {
    const base = i * 3;
    let cp0 = allPoints[base];
    let cp1 = allPoints[base + 1];
    let cp2 = allPoints[base + 2];
    let cp3 = allPoints[base + 3];
    if (!cp0 || !cp1 || !cp2 || !cp3) break;

    const startT = i === lowerCurve ? lowerT : 0;
    let endT = i === upperCurve ? upperT : 1;

    if (startT > 0) {
      const s = splitBezierAt(cp0, cp1, cp2, cp3, startT);
      cp0 = s.right[0];
      cp1 = s.right[1];
      cp2 = s.right[2];
      cp3 = s.right[3];
      if (startT < 1) endT = (endT - startT) / (1 - startT);
    }
    if (endT < 1) {
      const s = splitBezierAt(cp0, cp1, cp2, cp3, endT);
      cp0 = s.left[0];
      cp1 = s.left[1];
      cp2 = s.left[2];
      cp3 = s.left[3];
    }

    if (result.length === 0) result.push(cp0);
    result.push(cp1, cp2, cp3);
  }

  return result;
}

/**
 * StreamLines - Flow visualization for vector fields
 *
 * Draws curves following the vector field flow with optional
 * continuous animation showing particles moving along the lines.
 *
 * @example
 * ```typescript
 * const streamlines = new StreamLines({
 *   func: (x, y) => [-x, -y],  // Sink field
 *   numLines: 20,
 *   maxLineLength: 8
 * });
 *
 * // Start flowing animation
 * streamlines.startAnimation({ flowSpeed: 2 });
 * ```
 */
export class StreamLines extends VectorField {
  private _numLines: number;
  private _startPoints: [number, number][] | null;
  private _maxLineLength: number;
  private _stepSize: number;
  private _minSteps: number;
  private _variableWidth: boolean;
  private _showArrows: boolean;
  private _arrowSpacing: number;
  private _virtualTime: number;
  private _maxAnchorsPerLine: number;
  private _noiseFactor: number;
  private _padding: number;
  private _nRepeats: number;
  private _lineDurations: number[] = [];

  private _streamlineData: { x: number; y: number; vx: number; vy: number }[][] = [];
  private _streamlineVMobjects: VMobject[] = [];
  private _animationUpdater: UpdaterFn | null = null;
  private _phases: number[] = [];
  private _savedOriginalPoints: number[][][] = [];

  get virtualTime(): number {
    return this._virtualTime;
  }

  constructor(options: StreamLinesOptions) {
    super({
      xRange: [-8, 8, 0.5] as [number, number, number],
      yRange: [-4, 4, 0.5] as [number, number, number],
      ...options,
    });

    const {
      numLines = 15,
      startPoints,
      maxLineLength = 10,
      stepSize = 0.05,
      minSteps = 3,
      variableWidth = false,
      showArrows = false,
      arrowSpacing = 1,
      virtualTime = 3,
      maxAnchorsPerLine = 100,
      padding = 3,
      nRepeats = 1,
    } = options;

    this._numLines = numLines;
    this._startPoints = startPoints || null;
    this._maxLineLength = maxLineLength;
    this._stepSize = stepSize;
    this._minSteps = minSteps;
    this._variableWidth = variableWidth;
    this._showArrows = showArrows;
    this._arrowSpacing = arrowSpacing;
    this._virtualTime = virtualTime;
    this._maxAnchorsPerLine = maxAnchorsPerLine;
    this._noiseFactor = options.noiseFactor ?? this._yRange[2] / 2;
    this._padding = padding;
    this._nRepeats = nRepeats;

    this._generateStreamlines();
  }

  /**
   * Generate starting points for streamlines
   */
  private _getStartPoints(): [number, number][] {
    if (this._startPoints) {
      return this._startPoints;
    }

    const [xMin, xMax, xStep] = this._xRange;
    const [yMin, yMax, yStep] = this._yRange;
    const points: [number, number][] = [];
    const rng = seededRandom(0);
    const nf = this._noiseFactor;

    for (let x = xMin; x <= xMax + xStep * 0.01; x += xStep) {
      for (let y = yMin; y <= yMax + yStep * 0.01; y += yStep) {
        for (let r = 0; r < this._nRepeats; r++) {
          points.push([x + nf * (rng() - 0.5), y + nf * (rng() - 0.5)]);
        }
      }
    }

    return points;
  }

  /**
   * Integrate a streamline using Euler method
   */
  private _integrateStreamline(
    startX: number,
    startY: number,
  ): { points: { x: number; y: number; vx: number; vy: number }[]; lastStep: number } {
    const [xMin, xMax] = this._xRange;
    const [yMin, yMax] = this._yRange;
    const maxSteps = Math.ceil(this._virtualTime / this._stepSize) + 1;
    const dt = this._stepSize;

    const points: { x: number; y: number; vx: number; vy: number }[] = [];
    let x = startX;
    let y = startY;
    let lastStep = 0;

    const [initVx, initVy] = this._func(x, y);
    points.push({ x, y, vx: initVx, vy: initVy });

    for (let step = 0; step < maxSteps; step++) {
      lastStep = step;
      const [vx, vy] = this._func(x, y);

      const newX = x + dt * vx;
      const newY = y + dt * vy;

      if (
        newX < xMin - this._padding ||
        newX > xMax + this._padding ||
        newY < yMin - this._padding ||
        newY > yMax + this._padding
      ) {
        break;
      }

      x = newX;
      y = newY;
      const [newVx, newVy] = this._func(x, y);
      points.push({ x, y, vx: newVx, vy: newVy });
    }

    return { points, lastStep };
  }

  /**
   * Convert points to Bezier control points
   */
  private _pointsToBezier(
    linePoints: { x: number; y: number; vx: number; vy: number }[],
  ): number[][] {
    const bezierPoints: number[][] = [];

    for (let i = 0; i < linePoints.length; i++) {
      const p = linePoints[i];

      if (i === 0) {
        bezierPoints.push([p.x, p.y, 0]);
      } else {
        const prev = linePoints[i - 1];
        const dx = p.x - prev.x;
        const dy = p.y - prev.y;

        bezierPoints.push([prev.x + dx / 3, prev.y + dy / 3, 0]);
        bezierPoints.push([prev.x + (2 * dx) / 3, prev.y + (2 * dy) / 3, 0]);
        bezierPoints.push([p.x, p.y, 0]);
      }
    }

    return bezierPoints;
  }

  /**
   * Downsample points to max count
   */
  private _downsample<T>(points: T[], maxPoints: number): T[] {
    if (points.length <= maxPoints) return points;

    const result: T[] = [points[0]];
    const step = (points.length - 1) / (maxPoints - 1);

    for (let i = 1; i < maxPoints - 1; i++) {
      result.push(points[Math.round(i * step)]);
    }
    result.push(points[points.length - 1]);

    return result;
  }

  /**
   * Generate all streamlines
   */
  private _generateStreamlines(): void {
    this.children = [];
    this._streamlineData = [];
    this._streamlineVMobjects = [];
    this._lineDurations = [];

    const startPoints = this._getStartPoints();

    for (const [startX, startY] of startPoints) {
      const result = this._integrateStreamline(startX, startY);
      let linePoints = result.points;

      if (linePoints.length < 2) {
        continue;
      }

      this._lineDurations.push(result.lastStep * this._stepSize);
      this._streamlineData.push(linePoints);

      if (linePoints.length > this._maxAnchorsPerLine) {
        linePoints = this._downsample(linePoints, this._maxAnchorsPerLine);
      }

      const streamline = new VMobject();
      const bezierPoints = this._pointsToBezier(linePoints);
      streamline.setPoints3D(bezierPoints);

      const avgMagnitude =
        linePoints.reduce((sum, p) => sum + Math.sqrt(p.vx ** 2 + p.vy ** 2), 0) /
        linePoints.length;

      const color = this._colorFunc(
        avgMagnitude,
        startX,
        startY,
        linePoints[0].vx,
        linePoints[0].vy,
      );

      streamline.fillColor = color;
      streamline.fillOpacity = 0;
      streamline.strokeWidth = this._variableWidth
        ? this._strokeWidth * (0.5 + avgMagnitude / 2)
        : this._strokeWidth;

      this.add(streamline);
      this._streamlineVMobjects.push(streamline);

      if (this._showArrows) {
        this._addArrowsToLine(linePoints, color);
      }
    }
  }

  /**
   * Add arrows along a streamline
   */
  private _addArrowsToLine(
    linePoints: { x: number; y: number; vx: number; vy: number }[],
    color: string,
  ): void {
    let distanceAccum = 0;
    let lastArrowDist = 0;

    for (let i = 1; i < linePoints.length; i++) {
      const prev = linePoints[i - 1];
      const curr = linePoints[i];

      const segmentLen = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
      distanceAccum += segmentLen;

      if (distanceAccum - lastArrowDist >= this._arrowSpacing) {
        const mag = Math.sqrt(curr.vx ** 2 + curr.vy ** 2);
        if (mag > 1e-10) {
          const arrowLen = Math.min(this._arrowSpacing * 0.3, 0.2);
          const dirX = curr.vx / mag;
          const dirY = curr.vy / mag;

          const arrow = new Arrow({
            start: [curr.x - (dirX * arrowLen) / 2, curr.y - (dirY * arrowLen) / 2, 0],
            end: [curr.x + (dirX * arrowLen) / 2, curr.y + (dirY * arrowLen) / 2, 0],
            color,
            strokeWidth: this._strokeWidth,
            tipLength: arrowLen * 0.5,
            tipWidth: arrowLen * 0.3,
          });
          arrow.opacity = this._opacity;
          this.add(arrow);

          lastArrowDist = distanceAccum;
        }
      }
    }
  }

  /**
   * Start continuous flowing animation
   */
  startAnimation(options: ContinuousMotionOptions = {}): this {
    const { warmUp = true, flowSpeed = 1, timeWidth = 0.3 } = options;

    if (this._animationUpdater) {
      this.endAnimation();
    }

    const numLines = this._streamlineData.length;
    if (numLines === 0) return this;

    this._savedOriginalPoints = [];
    for (let i = 0; i < numLines; i++) {
      const vmob = this._streamlineVMobjects[i];
      if (vmob) {
        this._savedOriginalPoints.push(vmob.points3D.map(p => [...p]));
      } else {
        this._savedOriginalPoints.push([]);
      }
    }

    const runTimes: number[] = this._lineDurations.map((d) => d / Math.max(flowSpeed, 1e-6));
    const virtualTime = this._virtualTime;

    this._phases = new Array(numLines);
    for (let i = 0; i < numLines; i++) {
      const randTime = Math.random() * virtualTime;
      this._phases[i] = warmUp ? -randTime : randTime;
    }

    this._animationUpdater = (_mob, dt: number) => {
      for (let i = 0; i < numLines; i++) {
        const vmob = this._streamlineVMobjects[i];
        const origPoints = this._savedOriginalPoints[i];
        if (!vmob || !origPoints || origPoints.length < 4) continue;

        const runTime = runTimes[i];

        this._phases[i] += dt * flowSpeed;
        if (this._phases[i] >= virtualTime) {
          this._phases[i] -= virtualTime;
        }

        const alpha = Math.max(0, Math.min(this._phases[i] / runTime, 1));

        let upper = alpha * (1 + timeWidth);
        let lower = upper - timeWidth;
        upper = Math.min(upper, 1);
        lower = Math.max(lower, 0);

        if (upper <= lower || alpha <= 0) {
          vmob.opacity = 0;
          vmob.markDirty();
          continue;
        }

        const partialPoints = getPartialBezierPoints(origPoints, lower, upper);
        if (partialPoints.length < 4) {
          vmob.opacity = 0;
          vmob.markDirty();
          continue;
        }

        vmob.setPoints3D(partialPoints);
        vmob.opacity = this._opacity;
        vmob.markDirty();
      }
    };

    this.addUpdater(this._animationUpdater);
    return this;
  }

  /**
   * Stop the continuous animation
   */
  endAnimation(): this {
    if (this._animationUpdater) {
      this.removeUpdater(this._animationUpdater);
      this._animationUpdater = null;
    }

    for (let i = 0; i < this._streamlineVMobjects.length; i++) {
      const vmob = this._streamlineVMobjects[i];
      if (!vmob) continue;

      if (this._savedOriginalPoints[i] && this._savedOriginalPoints[i].length > 0) {
        vmob.setPoints3D(this._savedOriginalPoints[i]);
      } else {
        const linePoints = this._streamlineData[i];
        if (linePoints && linePoints.length >= 2) {
          const bezierPoints = this._pointsToBezier(linePoints);
          vmob.setPoints3D(bezierPoints);
        }
      }

      vmob.opacity = this._opacity;
      vmob.markDirty();
    }

    this._savedOriginalPoints = [];
    this._phases = [];
    return this;
  }
}
