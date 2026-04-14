import { Mobject } from '../../core/Mobject';
import type { Vec3, MobjectState } from '../../core/types';

/**
 * Line3DOptions — Configuration for a 3D line segment.
 */
export interface Line3DOptions {
  /** Start point [x, y, z]. Default: [0, 0, 0] */
  start?: Vec3;
  /** End point [x, y, z]. Required */
  end: Vec3;
  /** Color as CSS color string. Default: '#ffffff' */
  color?: string;
  /** Line width in pixels. Default: 2 */
  lineWidth?: number;
  /** Opacity from 0 to 1. Default: 1 */
  opacity?: number;
}

/**
 * Line3D — A 3D line segment.
 *
 * Creates a line between two 3D points. Useful for tick marks,
 * grid lines, and simple connections in 3D space.
 *
 * @example
 * ```typescript
 * // Simple line from origin to (1, 1, 1)
 * const line = new Line3D({ end: [1, 1, 1] });
 *
 * // Styled line
 * const styled = new Line3D({
 *   start: [-1, 0, 0],
 *   end: [1, 0, 0],
 *   color: '#ff0000',
 *   lineWidth: 4
 * });
 * ```
 */
export class Line3D extends Mobject {
  start: Vec3;
  end: Vec3;
  lineWidth: number;
  strokeColor: string;
  strokeOpacity: number;

  constructor(options: Line3DOptions) {
    super();

    this.start = options.start ?? [0, 0, 0];
    this.end = options.end;
    this.lineWidth = options.lineWidth ?? 2;
    this.strokeColor = options.color ?? '#ffffff';
    this.color = this.strokeColor;
    this.strokeOpacity = options.opacity ?? 1;
    this.opacity = options.opacity ?? 1;

    this.markDirty();
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
        lineWidth: this.lineWidth,
        strokeColor: this.strokeColor,
        strokeOpacity: this.strokeOpacity,
      },
    };
  }

  override restoreState(state: MobjectState): this {
    super.restoreState(state);
    const extra = state.extra as any;
    if (extra) {
      this.start = [...extra.start] as Vec3;
      this.end = [...extra.end] as Vec3;
      this.lineWidth = extra.lineWidth;
      this.strokeColor = extra.strokeColor;
      this.strokeOpacity = extra.strokeOpacity;
    }
    this.markDirty();
    return this;
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new Line3D({
      start: this.start,
      end: this.end,
      color: this.strokeColor,
      opacity: this.strokeOpacity,
      lineWidth: this.lineWidth,
    });
    copy.position = [...this.position];
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}
