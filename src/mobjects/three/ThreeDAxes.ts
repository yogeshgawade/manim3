import { Group } from '../../core/Group';
import { Mobject } from '../../core/Mobject';
import { Arrow3D } from './Arrow3D';
import { Line3D } from './Line3D';
import type { Vec3 } from '../../core/types';

/**
 * ThreeDAxes — X/Y/Z axes for 3D scenes with arrows, ticks, and labels.
 *
 * Creates three perpendicular 3D axes with:
 * - Cylindrical shafts with cone tips (arrows)
 * - Tick marks at each step
 * - Optional labels at tick positions
 *
 * Matches the behavior of manim-web's ThreeDAxes.
 */
export interface ThreeDAxesOptions {
  /** X-axis range [min, max, step]. Default: [-5, 5, 1] */
  xRange?: [number, number, number];
  /** Y-axis range [min, max, step]. Default: [-5, 5, 1] */
  yRange?: [number, number, number];
  /** Z-axis range [min, max, step]. Default: [-5, 5, 1] */
  zRange?: [number, number, number];
  /** Default color for all axes. Default: '#ffffff' */
  axisColor?: string;
  /** Color for x-axis (overrides axisColor). Default: '#E65A4C' (red) */
  xColor?: string;
  /** Color for y-axis (overrides axisColor). Default: '#4ECCA3' (green) */
  yColor?: string;
  /** Color for z-axis (overrides axisColor). Default: '#4C9EE6' (blue) */
  zColor?: string;
  /** Whether to show tick marks. Default: true */
  showTicks?: boolean;
  /** Length of tick marks. Default: 0.15 */
  tickLength?: number;
  /** Whether to show labels. Default: true */
  withLabels?: boolean;
  /** Label size. Default: 0.3 */
  labelSize?: number;
  /** Arrow tip length. Default: 0.25 */
  tipLength?: number;
  /** Arrow tip radius. Default: 0.1 */
  tipRadius?: number;
  /** Arrow shaft radius. Default: 0.02 */
  shaftRadius?: number;
}

/**
 * ThreeDAxes — 3D coordinate axes with proper 3D arrows and tick marks.
 * Extends Group containing Arrow3D and Line3D mobjects.
 */
export class ThreeDAxes extends Group {
  xRange: [number, number, number];
  yRange: [number, number, number];
  zRange: [number, number, number];
  showTicks: boolean;
  tickLength: number;
  withLabels: boolean;
  labelSize: number;
  tipLength: number;
  tipRadius: number;
  shaftRadius: number;

  private xAxis: Arrow3D;
  private yAxis: Arrow3D;
  private zAxis: Arrow3D;
  private ticks: Line3D[] = [];
  private labels: Mobject[] = [];

  constructor(options: ThreeDAxesOptions = {}) {
    super();

    this.xRange = options.xRange ?? [-5, 5, 1];
    this.yRange = options.yRange ?? [-5, 5, 1];
    this.zRange = options.zRange ?? [-5, 5, 1];
    this.showTicks = options.showTicks ?? true;
    this.tickLength = options.tickLength ?? 0.15;
    this.withLabels = options.withLabels ?? true;
    this.labelSize = options.labelSize ?? 0.3;
    this.tipLength = options.tipLength ?? 0.25;
    this.tipRadius = options.tipRadius ?? 0.1;
    this.shaftRadius = options.shaftRadius ?? 0.02;

    const axisColor = options.axisColor ?? '#ffffff';
    const xColor = options.xColor ?? '#E65A4C';
    const yColor = options.yColor ?? '#4ECCA3';
    const zColor = options.zColor ?? '#4C9EE6';

    // X-axis arrow (red, points along +X)
    this.xAxis = new Arrow3D({
      start: [this.xRange[0], 0, 0],
      end: [this.xRange[1], 0, 0],
      color: xColor,
      tipLength: this.tipLength,
      tipRadius: this.tipRadius,
      shaftRadius: this.shaftRadius,
    });

    // Y-axis arrow (green, points along +Y)
    this.yAxis = new Arrow3D({
      start: [0, this.yRange[0], 0],
      end: [0, this.yRange[1], 0],
      color: yColor,
      tipLength: this.tipLength,
      tipRadius: this.tipRadius,
      shaftRadius: this.shaftRadius,
    });

    // Z-axis arrow (blue, points along +Z)
    this.zAxis = new Arrow3D({
      start: [0, 0, this.zRange[0]],
      end: [0, 0, this.zRange[1]],
      color: zColor,
      tipLength: this.tipLength,
      tipRadius: this.tipRadius,
      shaftRadius: this.shaftRadius,
    });

    this.add(this.xAxis, this.yAxis, this.zAxis);

    // Create tick marks
    if (this.showTicks) {
      this._createTicks(xColor, yColor, zColor);
    }

    // Create labels
    if (this.withLabels) {
      this._createLabels();
    }
  }

  // ── Coordinate Mapping ──────────────────────────────────────────────────

  /**
   * Map 3D coordinates to a point in the scene.
   */
  coordsToPoint(x: number, y: number, z: number): Vec3 {
    return [x + this.position[0], y + this.position[1], z + this.position[2]];
  }

  /**
   * Map a point to 3D coordinates.
   */
  pointToCoords(point: Vec3): [number, number, number] {
    return [
      point[0] - this.position[0],
      point[1] - this.position[1],
      point[2] - this.position[2],
    ];
  }

  /**
   * Get the X-axis arrow.
   */
  getXAxis(): Arrow3D {
    return this.xAxis;
  }

  /**
   * Get the Y-axis arrow.
   */
  getYAxis(): Arrow3D {
    return this.yAxis;
  }

  /**
   * Get the Z-axis arrow.
   */
  getZAxis(): Arrow3D {
    return this.zAxis;
  }

  /**
   * Get the X-axis endpoint position.
   */
  getXAxisEnd(): Vec3 {
    return [this.xRange[1], 0, 0];
  }

  /**
   * Get the Y-axis endpoint position.
   */
  getYAxisEnd(): Vec3 {
    return [0, this.yRange[1], 0];
  }

  /**
   * Get the Z-axis endpoint position.
   */
  getZAxisEnd(): Vec3 {
    return [0, 0, this.zRange[1]];
  }

  // ── Label Management ─────────────────────────────────────────────────────

  /**
   * Get all tick mark mobjects.
   */
  getTicks(): readonly Line3D[] {
    return this.ticks;
  }

  /**
   * Get all label mobjects (for HUD rendering).
   */
  getLabels(): readonly Mobject[] {
    return this.labels;
  }

  /**
   * Add a custom label at a specific position.
   * Returns the label mobject for fixed-in-frame rendering.
   */
  addLabel(text: string, position: Vec3, options: { size?: number; color?: string } = {}): Mobject {
    const label = new Mobject();
    label.position = [...position];
    label.scale = [options.size ?? this.labelSize, options.size ?? this.labelSize, 1];

    // Store label data for renderer
    (label as any).labelText = text;
    (label as any).labelColor = options.color ?? '#ffffff';
    (label as any).isHUD = true;

    this.labels.push(label);
    this.add(label);
    return label;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _createTicks(xColor: string, yColor: string, zColor: string): void {
    const t = this.tickLength / 2;
    const [xMin, xMax, xStep] = this.xRange;
    const [yMin, yMax, yStep] = this.yRange;
    const [zMin, zMax, zStep] = this.zRange;

    // X-axis ticks: perpendicular marks in Z direction
    for (let x = xMin; x <= xMax; x += xStep) {
      if (Math.abs(x) < 0.001) continue; // Skip origin
      if (Math.abs(x - xMin) < 0.001 || Math.abs(x - xMax) < 0.001) continue; // Skip ends

      const tick = new Line3D({
        start: [x, 0, -t],
        end: [x, 0, t],
        color: xColor,
        lineWidth: 2,
      });
      this.ticks.push(tick);
      this.add(tick);
    }

    // Y-axis ticks: perpendicular marks in Z direction
    for (let y = yMin; y <= yMax; y += yStep) {
      if (Math.abs(y) < 0.001) continue;
      if (Math.abs(y - yMin) < 0.001 || Math.abs(y - yMax) < 0.001) continue;

      const tick = new Line3D({
        start: [0, y, -t],
        end: [0, y, t],
        color: yColor,
        lineWidth: 2,
      });
      this.ticks.push(tick);
      this.add(tick);
    }

    // Z-axis ticks: perpendicular marks in X direction
    for (let z = zMin; z <= zMax; z += zStep) {
      if (Math.abs(z) < 0.001) continue;
      if (Math.abs(z - zMin) < 0.001 || Math.abs(z - zMax) < 0.001) continue;

      const tick = new Line3D({
        start: [-t, 0, z],
        end: [t, 0, z],
        color: zColor,
        lineWidth: 2,
      });
      this.ticks.push(tick);
      this.add(tick);
    }
  }

  private _createLabels(): void {
    const [xMin, xMax, xStep] = this.xRange;
    const [yMin, yMax, yStep] = this.yRange;
    const [zMin, zMax, zStep] = this.zRange;

    // X-axis labels
    for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
      if (Math.abs(x) < 0.001) continue;
      this.addLabel(String(x), [x, -0.3, 0], { color: '#E65A4C' });
    }

    // Y-axis labels
    for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) {
      if (Math.abs(y) < 0.001) continue;
      this.addLabel(String(y), [-0.3, y, 0], { color: '#4ECCA3' });
    }

    // Z-axis labels
    for (let z = Math.ceil(zMin / zStep) * zStep; z <= zMax; z += zStep) {
      if (Math.abs(z) < 0.001) continue;
      this.addLabel(String(z), [0, -0.3, z], { color: '#4C9EE6' });
    }
  }
}
