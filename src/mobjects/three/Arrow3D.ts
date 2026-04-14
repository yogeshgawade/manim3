import { Mobject } from '../../core/Mobject';
import type { Vec3, MobjectState } from '../../core/types';

/**
 * Arrow3DOptions — Configuration for 3D arrow with cylindrical shaft and cone tip.
 */
export interface Arrow3DOptions {
  /** Start point [x, y, z]. Default: [0, 0, 0] */
  start?: Vec3;
  /** End point [x, y, z]. Required */
  end: Vec3;
  /** Color as CSS color string. Default: '#ffffff' */
  color?: string;
  /** Opacity from 0 to 1. Default: 1 */
  opacity?: number;
  /** Length of the cone tip. Default: 0.2 */
  tipLength?: number;
  /** Radius of the cone tip base. Default: 0.08 */
  tipRadius?: number;
  /** Radius of the cylindrical shaft. Default: 0.02 */
  shaftRadius?: number;
  /** Number of radial segments for shaft and tip. Default: 16 */
  radialSegments?: number;
}

/**
 * Arrow3D — A 3D arrow with cylindrical shaft and cone tip.
 *
 * Creates a 3D arrow suitable for axes and vector visualization.
 * The arrow consists of a cylinder (shaft) and a cone (tip).
 *
 * @example
 * ```typescript
 * // Simple arrow from origin to (2, 0, 0)
 * const arrow = new Arrow3D({ end: [2, 0, 0] });
 *
 * // Styled arrow with custom tip
 * const styled = new Arrow3D({
 *   start: [-1, 0, 0],
 *   end: [1, 1, 1],
 *   color: '#ff0000',
 *   tipLength: 0.3,
 *   tipRadius: 0.1,
 *   shaftRadius: 0.03
 * });
 * ```
 */
export class Arrow3D extends Mobject {
  start: Vec3;
  end: Vec3;
  tipLength: number;
  tipRadius: number;
  shaftRadius: number;
  radialSegments: number;
  fillColor: string;
  fillOpacity: number;

  constructor(options: Arrow3DOptions) {
    super();

    this.start = options.start ?? [0, 0, 0];
    this.end = options.end;
    this.tipLength = options.tipLength ?? 0.2;
    this.tipRadius = options.tipRadius ?? 0.08;
    this.shaftRadius = options.shaftRadius ?? 0.02;
    this.radialSegments = options.radialSegments ?? 16;
    this.fillColor = options.color ?? '#ffffff';
    this.color = this.fillColor;
    this.fillOpacity = options.opacity ?? 1;
    this.opacity = options.opacity ?? 1;

    this.markDirty();
  }

  // ── Getters ─────────────────────────────────────────────────────────────

  get length(): number {
    const dx = this.end[0] - this.start[0];
    const dy = this.end[1] - this.start[1];
    const dz = this.end[2] - this.start[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  get direction(): Vec3 {
    const len = this.length;
    if (len === 0) return [1, 0, 0];
    return [
      (this.end[0] - this.start[0]) / len,
      (this.end[1] - this.start[1]) / len,
      (this.end[2] - this.start[2]) / len,
    ];
  }

  // ── State Management ─────────────────────────────────────────────────────

  override captureState(): MobjectState {
    const base = super.captureState();
    return {
      ...base,
      extra: {
        ...base.extra,
        start: [...this.start] as Vec3,
        end: [...this.end] as Vec3,
        tipLength: this.tipLength,
        tipRadius: this.tipRadius,
        shaftRadius: this.shaftRadius,
        radialSegments: this.radialSegments,
        fillColor: this.fillColor,
        fillOpacity: this.fillOpacity,
      },
    };
  }

  override restoreState(state: MobjectState): this {
    super.restoreState(state);
    const extra = state.extra as any;
    if (extra) {
      this.start = [...extra.start] as Vec3;
      this.end = [...extra.end] as Vec3;
      this.tipLength = extra.tipLength;
      this.tipRadius = extra.tipRadius;
      this.shaftRadius = extra.shaftRadius;
      this.radialSegments = extra.radialSegments;
      this.fillColor = extra.fillColor;
      this.fillOpacity = extra.fillOpacity;
    }
    this.markDirty();
    return this;
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new Arrow3D({
      start: this.start,
      end: this.end,
      color: this.fillColor,
      opacity: this.fillOpacity,
      tipLength: this.tipLength,
      tipRadius: this.tipRadius,
      shaftRadius: this.shaftRadius,
      radialSegments: this.radialSegments,
    });
    copy.position = [...this.position];
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}
