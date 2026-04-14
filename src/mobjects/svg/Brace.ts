import { VMobject } from '../../core/VMobject';
import { Mobject } from '../../core/Mobject';
import { WHITE } from '../../constants';

// Direction constants
const DOWN: [number, number, number] = [0, -1, 0];
const UP: [number, number, number] = [0, 1, 0];
const LEFT: [number, number, number] = [-1, 0, 0];
const RIGHT: [number, number, number] = [1, 0, 0];

type Vector3Tuple = [number, number, number];

/**
 * Options for creating a Brace
 */
export interface BraceOptions {
  /** Direction to place the brace relative to the mobject. Default: DOWN */
  direction?: Vector3Tuple;
  /** Buffer distance from the mobject. Default: 0.2 */
  buff?: number;
  /** Stroke color as CSS color string. Default: WHITE */
  color?: string;
  /** Sharpness of the brace tip (0-1). Default: 2 */
  sharpness?: number;
}

/**
 * Options for creating a BraceBetweenPoints
 */
export interface BraceBetweenPointsOptions {
  /** Start point of the brace */
  start: Vector3Tuple;
  /** End point of the brace */
  end: Vector3Tuple;
  /** Direction perpendicular to the line between points. Default: computed from points */
  direction?: Vector3Tuple;
  /** Buffer distance. Default: 0.2 */
  buff?: number;
  /** Stroke color as CSS color string. Default: WHITE */
  color?: string;
  /** Sharpness of the brace tip (0-1). Default: 2 */
  sharpness?: number;
}

/**
 * Get key points from a mobject for brace placement.
 */
function getMobjectKeyPoints(mobject: Mobject): number[][] {
  if (mobject instanceof VMobject) {
    const pts = mobject.points3D;
    if (pts.length > 0) return pts.map(p => [...p]);
  }
  
  // Fallback: use bounding box corners
  const center = mobject.getCenter();
  const w = 1;
  const h = 1;
  return [
    [center[0] - w / 2, center[1] - h / 2, center[2]],
    [center[0] + w / 2, center[1] - h / 2, center[2]],
    [center[0] + w / 2, center[1] + h / 2, center[2]],
    [center[0] - w / 2, center[1] + h / 2, center[2]],
  ];
}

/**
 * Brace - A curly brace shape constructed with cubic Bezier curves
 */
export class Brace extends VMobject {
  readonly mobject: Mobject | null;
  readonly braceDirection: Vector3Tuple;
  readonly buff: number;
  readonly sharpness: number;
  protected _tipPoint: Vector3Tuple;

  constructor(mobject: Mobject, options: BraceOptions = {}) {
    super();

    const { direction = DOWN, buff = 0.2, color = WHITE, sharpness = 2 } = options;

    this.mobject = mobject;
    this.braceDirection = [...direction] as Vector3Tuple;
    this.buff = buff;
    this.sharpness = sharpness;
    this._tipPoint = [0, 0, 0];

    this.color = color;
    this.fillOpacity = 1;
    this.strokeWidth = 0;

    this._generateBracePoints();
  }

  protected _generateBracePoints(): void {
    if (!this.mobject) return;

    const mobjectCenter = this.mobject.getCenter();
    const keyPoints = getMobjectKeyPoints(this.mobject);

    // Normalize direction
    const dirMag = Math.sqrt(
      this.braceDirection[0] ** 2 + this.braceDirection[1] ** 2 + this.braceDirection[2] ** 2,
    );
    const normDir: Vector3Tuple = [
      this.braceDirection[0] / dirMag,
      this.braceDirection[1] / dirMag,
      this.braceDirection[2] / dirMag,
    ];

    // Perpendicular direction
    const perpDir: Vector3Tuple = [-normDir[1], normDir[0], 0];

    // Project all key points
    let maxNormProj = -Infinity;
    let minPerpProj = Infinity;
    let maxPerpProj = -Infinity;

    for (const p of keyPoints) {
      const dx = p[0] - mobjectCenter[0];
      const dy = p[1] - mobjectCenter[1];
      const normProj = dx * normDir[0] + dy * normDir[1];
      const perpProj = dx * perpDir[0] + dy * perpDir[1];
      if (normProj > maxNormProj) maxNormProj = normProj;
      if (perpProj < minPerpProj) minPerpProj = perpProj;
      if (perpProj > maxPerpProj) maxPerpProj = perpProj;
    }

    // Brace placement
    const offset = maxNormProj + this.buff;

    const braceStart: Vector3Tuple = [
      mobjectCenter[0] + normDir[0] * offset + perpDir[0] * minPerpProj,
      mobjectCenter[1] + normDir[1] * offset + perpDir[1] * minPerpProj,
      mobjectCenter[2],
    ];

    const braceEnd: Vector3Tuple = [
      mobjectCenter[0] + normDir[0] * offset + perpDir[0] * maxPerpProj,
      mobjectCenter[1] + normDir[1] * offset + perpDir[1] * maxPerpProj,
      mobjectCenter[2],
    ];

    this._generateBraceFromPoints(braceStart, braceEnd, normDir);
  }

  protected _generateBraceFromPoints(
    start: Vector3Tuple,
    end: Vector3Tuple,
    direction: Vector3Tuple,
  ): void {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length < 1e-6) {
      this.setPoints3D([[...start], [...start], [...start], [...start]]);
      return;
    }

    const t: Vector3Tuple = [dx / length, dy / length, 0];
    const n = direction;

    // Fixed centerline heights
    const CURL_HEIGHT = 0.14;
    const TIP_HEIGHT = 0.25;
    const tipProt = TIP_HEIGHT - CURL_HEIGHT;

    // Compute widths
    const SVG_MIN_WIDTH = 0.90552;
    const linearSection = Math.max(0, (length * this.sharpness - SVG_MIN_WIDTH) / 2);
    const svgTotalWidth = SVG_MIN_WIDTH + 2 * linearSection;
    const wScale = length / svgTotalWidth;

    const curlW = 0.23 * wScale;
    const tipTransW = 0.22 * wScale;
    const armLen = linearSection * wScale;

    const midX = (start[0] + end[0]) / 2;
    const midY = (start[1] + end[1]) / 2;
    const midZ = (start[2] + end[2]) / 2;
    this._tipPoint = [midX + n[0] * TIP_HEIGHT, midY + n[1] * TIP_HEIGHT, midZ];

    const pt = (ox: number[], td: number, nd: number): number[] => [
      ox[0] + t[0] * td + n[0] * nd,
      ox[1] + t[1] * td + n[1] * nd,
      ox[2],
    ];

    const lArmStart = pt(start, curlW, CURL_HEIGHT);
    const lArmEnd = pt(lArmStart, armLen, 0);
    const rArmEnd = pt(end, -curlW, CURL_HEIGHT);
    const rArmStart = pt(rArmEnd, -armLen, 0);

    const c1H1 = pt(start, curlW * 0.3, CURL_HEIGHT * 0.85);
    const c1H2 = pt(start, curlW * 0.78, CURL_HEIGHT * 1.0);
    const c2H1 = pt(lArmStart, armLen / 3, 0);
    const c2H2 = pt(lArmStart, (armLen * 2) / 3, 0);
    const c3H1 = pt(lArmEnd, tipTransW * 0.55, tipProt * 0.05);
    const c3H2: number[] = [
      this._tipPoint[0] - t[0] * tipTransW * 0.02 - n[0] * tipProt * 0.45,
      this._tipPoint[1] - t[1] * tipTransW * 0.02 - n[1] * tipProt * 0.45,
      this._tipPoint[2],
    ];
    const c4H1: number[] = [
      this._tipPoint[0] + t[0] * tipTransW * 0.02 - n[0] * tipProt * 0.45,
      this._tipPoint[1] + t[1] * tipTransW * 0.02 - n[1] * tipProt * 0.45,
      this._tipPoint[2],
    ];
    const c4H2 = pt(rArmStart, -tipTransW * 0.55, tipProt * 0.05);
    const c5H1 = pt(rArmStart, armLen / 3, 0);
    const c5H2 = pt(rArmStart, (armLen * 2) / 3, 0);
    const c6H1 = pt(end, -curlW * 0.78, CURL_HEIGHT * 1.0);
    const c6H2 = pt(end, -curlW * 0.3, CURL_HEIGHT * 0.85);

    const cl: number[][] = [
      [...start], c1H1, c1H2, lArmStart, c2H1, c2H2, lArmEnd,
      c3H1, c3H2, [...this._tipPoint], c4H1, c4H2, rArmStart,
      c5H1, c5H2, rArmEnd, c6H1, c6H2, [...end],
    ];

    const H = 0.025;
    const ht = [0, H * 0.3, H * 0.8, H, H, H, H, H * 0.7, H * 0.15, 0,
      H * 0.15, H * 0.7, H, H, H, H, H * 0.8, H * 0.3, 0];

    const normals: number[][] = [];
    for (let i = 0; i < 19; i++) {
      const prev = cl[Math.max(0, i - 1)];
      const next = cl[Math.min(18, i + 1)];
      const ddx = next[0] - prev[0];
      const ddy = next[1] - prev[1];
      const len = Math.sqrt(ddx * ddx + ddy * ddy);
      if (len < 1e-10) {
        normals.push([n[0], n[1]]);
        continue;
      }
      const tx = ddx / len;
      const ty = ddy / len;
      let nx = -ty, ny = tx;
      if (nx * n[0] + ny * n[1] < 0) {
        nx = -nx; ny = -ny;
      }
      normals.push([nx, ny]);
    }

    const upper: number[][] = [];
    const lower: number[][] = [];
    for (let i = 0; i < 19; i++) {
      const h = ht[i];
      upper.push([cl[i][0] + normals[i][0] * h, cl[i][1] + normals[i][1] * h, cl[i][2]]);
      lower.push([cl[i][0] - normals[i][0] * h, cl[i][1] - normals[i][1] * h, cl[i][2]]);
    }

    this.setPoints3D([
      upper[0], upper[1], upper[2], upper[3], upper[4], upper[5], upper[6],
      upper[7], upper[8], upper[9], upper[10], upper[11], upper[12],
      upper[13], upper[14], upper[15], upper[16], upper[17], upper[18],
      lower[17], lower[16], lower[15], lower[14], lower[13], lower[12],
      lower[11], lower[10], lower[9], lower[8], lower[7], lower[6],
      lower[5], lower[4], lower[3], lower[2], lower[1], lower[0],
    ]);
  }

  getTip(): Vector3Tuple {
    return [...this._tipPoint];
  }

  getDirection(): Vector3Tuple {
    const mag = Math.sqrt(
      this.braceDirection[0] ** 2 + this.braceDirection[1] ** 2 + this.braceDirection[2] ** 2,
    );
    return [
      this.braceDirection[0] / mag,
      this.braceDirection[1] / mag,
      this.braceDirection[2] / mag,
    ];
  }

  protected _createCopy(): Brace {
    const brace = new Brace(this.mobject!, {
      direction: this.braceDirection,
      buff: this.buff,
      color: this.color,
      sharpness: this.sharpness,
    });
    return brace;
  }
}

/**
 * BraceBetweenPoints - A curly brace between two arbitrary points
 */
export class BraceBetweenPoints extends VMobject {
  protected _start: Vector3Tuple;
  protected _end: Vector3Tuple;
  protected _direction: Vector3Tuple;
  protected _buff: number;
  protected _sharpness: number;
  protected _tipPoint: Vector3Tuple;

  constructor(options: BraceBetweenPointsOptions) {
    super();

    const { start, end, direction, buff = 0.2, color = WHITE, sharpness = 2 } = options;

    this._start = [...start];
    this._end = [...end];
    this._buff = buff;
    this._sharpness = sharpness;
    this._tipPoint = [0, 0, 0];

    if (direction) {
      this._direction = [...direction];
    } else {
      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 1e-6) {
        this._direction = [-dy / length, dx / length, 0];
      } else {
        this._direction = [0, -1, 0];
      }
    }

    this.color = color;
    this.fillOpacity = 1;
    this.strokeWidth = 0;

    this._generateBracePoints();
  }

  protected _generateBracePoints(): void {
    const dirMag = Math.sqrt(
      this._direction[0] ** 2 + this._direction[1] ** 2 + this._direction[2] ** 2,
    );
    const normDir: Vector3Tuple = [
      this._direction[0] / dirMag,
      this._direction[1] / dirMag,
      this._direction[2] / dirMag,
    ];

    const adjustedStart: Vector3Tuple = [
      this._start[0] + normDir[0] * this._buff,
      this._start[1] + normDir[1] * this._buff,
      this._start[2],
    ];
    const adjustedEnd: Vector3Tuple = [
      this._end[0] + normDir[0] * this._buff,
      this._end[1] + normDir[1] * this._buff,
      this._end[2],
    ];

    this._generateBraceFromPoints(adjustedStart, adjustedEnd, normDir);
  }

  protected _generateBraceFromPoints(
    start: Vector3Tuple,
    end: Vector3Tuple,
    direction: Vector3Tuple,
  ): void {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length < 1e-6) {
      this.setPoints3D([[...start], [...start], [...start], [...start]]);
      return;
    }

    const t: Vector3Tuple = [dx / length, dy / length, 0];
    const n = direction;

    const CURL_HEIGHT = 0.14;
    const TIP_HEIGHT = 0.25;
    const SVG_MIN_WIDTH = 0.90552;
    const linearSection = Math.max(0, (length * this._sharpness - SVG_MIN_WIDTH) / 2);
    const svgTotalWidth = SVG_MIN_WIDTH + 2 * linearSection;
    const wScale = length / svgTotalWidth;

    const curlW = 0.23 * wScale;
    const tipTransW = 0.22 * wScale;
    const armLen = linearSection * wScale;
    const tipProt = TIP_HEIGHT - CURL_HEIGHT;

    const midX = (start[0] + end[0]) / 2;
    const midY = (start[1] + end[1]) / 2;
    const midZ = (start[2] + end[2]) / 2;
    this._tipPoint = [midX + n[0] * TIP_HEIGHT, midY + n[1] * TIP_HEIGHT, midZ];

    const pt = (ox: number[], td: number, nd: number): number[] => [
      ox[0] + t[0] * td + n[0] * nd,
      ox[1] + t[1] * td + n[1] * nd,
      ox[2],
    ];

    const lArmStart = pt(start, curlW, CURL_HEIGHT);
    const lArmEnd = pt(lArmStart, armLen, 0);
    const rArmEnd = pt(end, -curlW, CURL_HEIGHT);
    const rArmStart = pt(rArmEnd, -armLen, 0);

    const c1H1 = pt(start, curlW * 0.3, CURL_HEIGHT * 0.85);
    const c1H2 = pt(start, curlW * 0.78, CURL_HEIGHT * 1.0);
    const c2H1 = pt(lArmStart, armLen / 3, 0);
    const c2H2 = pt(lArmStart, (armLen * 2) / 3, 0);
    const c3H1 = pt(lArmEnd, tipTransW * 0.55, tipProt * 0.05);
    const c3H2: number[] = [
      this._tipPoint[0] - t[0] * tipTransW * 0.02 - n[0] * tipProt * 0.45,
      this._tipPoint[1] - t[1] * tipTransW * 0.02 - n[1] * tipProt * 0.45,
      this._tipPoint[2],
    ];
    const c4H1: number[] = [
      this._tipPoint[0] + t[0] * tipTransW * 0.02 - n[0] * tipProt * 0.45,
      this._tipPoint[1] + t[1] * tipTransW * 0.02 - n[1] * tipProt * 0.45,
      this._tipPoint[2],
    ];
    const c4H2 = pt(rArmStart, -tipTransW * 0.55, tipProt * 0.05);
    const c5H1 = pt(rArmStart, armLen / 3, 0);
    const c5H2 = pt(rArmStart, (armLen * 2) / 3, 0);
    const c6H1 = pt(end, -curlW * 0.78, CURL_HEIGHT * 1.0);
    const c6H2 = pt(end, -curlW * 0.3, CURL_HEIGHT * 0.85);

    const cl: number[][] = [
      [...start], c1H1, c1H2, lArmStart, c2H1, c2H2, lArmEnd,
      c3H1, c3H2, [...this._tipPoint], c4H1, c4H2, rArmStart,
      c5H1, c5H2, rArmEnd, c6H1, c6H2, [...end],
    ];

    const H = 0.025;
    const ht = [0, H * 0.3, H * 0.8, H, H, H, H, H * 0.7, H * 0.15, 0,
      H * 0.15, H * 0.7, H, H, H, H, H * 0.8, H * 0.3, 0];

    const normals: number[][] = [];
    for (let i = 0; i < 19; i++) {
      const prev = cl[Math.max(0, i - 1)];
      const next = cl[Math.min(18, i + 1)];
      const ddx = next[0] - prev[0];
      const ddy = next[1] - prev[1];
      const len = Math.sqrt(ddx * ddx + ddy * ddy);
      if (len < 1e-10) {
        normals.push([n[0], n[1]]);
        continue;
      }
      const tx = ddx / len;
      const ty = ddy / len;
      let nx = -ty, ny = tx;
      if (nx * n[0] + ny * n[1] < 0) {
        nx = -nx; ny = -ny;
      }
      normals.push([nx, ny]);
    }

    const upper: number[][] = [];
    const lower: number[][] = [];
    for (let i = 0; i < 19; i++) {
      const h = ht[i];
      upper.push([cl[i][0] + normals[i][0] * h, cl[i][1] + normals[i][1] * h, cl[i][2]]);
      lower.push([cl[i][0] - normals[i][0] * h, cl[i][1] - normals[i][1] * h, cl[i][2]]);
    }

    this.setPoints3D([
      upper[0], upper[1], upper[2], upper[3], upper[4], upper[5], upper[6],
      upper[7], upper[8], upper[9], upper[10], upper[11], upper[12],
      upper[13], upper[14], upper[15], upper[16], upper[17], upper[18],
      lower[17], lower[16], lower[15], lower[14], lower[13], lower[12],
      lower[11], lower[10], lower[9], lower[8], lower[7], lower[6],
      lower[5], lower[4], lower[3], lower[2], lower[1], lower[0],
    ]);
  }

  getTip(): Vector3Tuple {
    return [...this._tipPoint];
  }

  getDirection(): Vector3Tuple {
    const mag = Math.sqrt(
      this._direction[0] ** 2 + this._direction[1] ** 2 + this._direction[2] ** 2,
    );
    return [this._direction[0] / mag, this._direction[1] / mag, this._direction[2] / mag];
  }

  getStart(): Vector3Tuple {
    return [...this._start];
  }

  getEnd(): Vector3Tuple {
    return [...this._end];
  }

  protected _createCopy(): BraceBetweenPoints {
    return new BraceBetweenPoints({
      start: this._start,
      end: this._end,
      direction: this._direction,
      buff: this._buff,
      color: this.color,
      sharpness: this._sharpness,
    });
  }
}
