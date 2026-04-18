import { Mobject } from '../../core/Mobject';
import type { Vec3, MobjectState } from '../../core/types';

/**
 * Surface3DOptions — Configuration for parametric 3D surface.
 */
export interface Surface3DOptions {
  /** Parametric function (u, v) => [x, y, z] */
  uvFunction: (u: number, v: number) => Vec3;
  /** U parameter range [min, max]. Default: [0, 1] */
  uRange?: [number, number];
  /** V parameter range [min, max]. Default: [0, 1] */
  vRange?: [number, number];
  /** Number of segments in U direction. Default: 32 */
  uResolution?: number;
  /** Number of segments in V direction. Default: 32 */
  vResolution?: number;
  /** Color as hex string. Default: '#ffffff' */
  color?: string;
  /** Opacity from 0 to 1. Default: 1 */
  opacity?: number;
  /** Whether to render as wireframe. Default: false */
  wireframe?: boolean;
  /** Whether to render both sides. Default: true */
  doubleSided?: boolean;
  /** Two alternating colors for checkerboard pattern. */
  checkerboardColors?: [string, string];
  /** X position for clipping plane (clips everything with x > clipX). Default: undefined (no clipping) */
  clipX?: number;
  /** Y position for clipping plane (clips everything with y > clipY). Default: undefined (no clipping) */
  clipY?: number;
  /** Z position for clipping plane (clips everything with z > clipZ). Default: undefined (no clipping) */
  clipZ?: number;
}

/**
 * Surface3D — Parametric 3D surface mobject.
 *
 * This is a LOGICAL mobject — it stores the parametric function and parameters.
 * The actual THREE.js geometry is created by Surface3DRenderNode.
 *
 * @example
 * ```typescript
 * // Sphere
 * const sphere = new Surface3D({
 *   uvFunction: (u, v) => {
 *     const theta = u * Math.PI * 2;
 *     const phi = v * Math.PI;
 *     return [
 *       Math.sin(phi) * Math.cos(theta),
 *       Math.sin(phi) * Math.sin(theta),
 *       Math.cos(phi)
 *     ];
 *   },
 *   uResolution: 64,
 *   vResolution: 32,
 *   color: '#4ECCA3'
 * });
 * ```
 */
export class Surface3D extends Mobject {
  uvFunction: (u: number, v: number) => Vec3;
  uRange: [number, number];
  vRange: [number, number];
  uResolution: number;
  vResolution: number;
  fillColor: string;
  fillOpacity: number;
  wireframe: boolean;
  doubleSided: boolean;
  checkerboardColors?: [string, string];
  clipX?: number; // Clipping plane at X position (clips x > clipX)
  clipY?: number; // Clipping plane at Y position (clips y > clipY)
  clipZ?: number; // Clipping plane at Z position (clips z > clipZ)

  constructor(options: Surface3DOptions) {
    super();

    this.uvFunction = options.uvFunction;
    this.uRange = options.uRange ?? [0, 1];
    this.vRange = options.vRange ?? [0, 1];
    this.uResolution = options.uResolution ?? 32;
    this.vResolution = options.vResolution ?? 32;
    this.fillColor = options.color ?? '#ffffff';
    this.fillOpacity = options.opacity ?? 1;
    this.opacity = options.opacity ?? 1; // Set inherited opacity for FadeTrack
    this.wireframe = options.wireframe ?? false;
    this.doubleSided = options.doubleSided ?? true;
    this.checkerboardColors = options.checkerboardColors;
    this.clipX = options.clipX;
    this.clipY = options.clipY;
    this.clipZ = options.clipZ;

    this.markDirty();
  }

  // ── Evaluation ────────────────────────────────────────────────────────────

  /**
   * Evaluate the surface at given (u, v) parameters.
   */
  evaluate(u: number, v: number): Vec3 {
    return this.uvFunction(u, v);
  }

  /**
   * Get point on surface at normalized coordinates (u, v in [0, 1]).
   */
  getPointAt(u: number, v: number): Vec3 {
    const [uMin, uMax] = this.uRange;
    const [vMin, vMax] = this.vRange;
    const uActual = uMin + u * (uMax - uMin);
    const vActual = vMin + v * (vMax - vMin);
    return this.evaluate(uActual, vActual);
  }

  // ── Setters (mark dirty for renderer update) ─────────────────────────────

  setUVFunction(fn: (u: number, v: number) => Vec3): this {
    this.uvFunction = fn;
    this.markDirty();
    return this;
  }

  setResolution(uRes: number, vRes: number): this {
    this.uResolution = uRes;
    this.vResolution = vRes;
    this.markDirty();
    return this;
  }

  setWireframe(value: boolean): this {
    this.wireframe = value;
    this.markDirty();
    return this;
  }

  setDoubleSided(value: boolean): this {
    this.doubleSided = value;
    this.markDirty();
    return this;
  }

  setFillColor(color: string): this {
    this.fillColor = color;
    this.markDirty();
    return this;
  }

  setFillOpacity(opacity: number): this {
    this.fillOpacity = opacity;
    this.markDirty();
    return this;
  }

  setClipX(clipX: number | undefined): this {
    this.clipX = clipX;
    this.markDirty();
    return this;
  }

  setClipY(clipY: number | undefined): this {
    this.clipY = clipY;
    this.markDirty();
    return this;
  }

  setClipZ(clipZ: number | undefined): this {
    this.clipZ = clipZ;
    this.markDirty();
    return this;
  }

  // ── State Management ─────────────────────────────────────────────────────

  override captureState(): MobjectState {
    const base = super.captureState();
    return {
      ...base,
      extra: {
        ...base.extra,
        uvFunction: this.uvFunction,
        uRange: [...this.uRange],
        vRange: [...this.vRange],
        uResolution: this.uResolution,
        vResolution: this.vResolution,
        fillColor: this.fillColor,
        fillOpacity: this.fillOpacity,
        wireframe: this.wireframe,
        doubleSided: this.doubleSided,
        checkerboardColors: this.checkerboardColors ? [...this.checkerboardColors] : undefined,
        clipX: this.clipX,
        clipY: this.clipY,
        clipZ: this.clipZ,
      },
    };
  }

  override restoreState(state: MobjectState): this {
    super.restoreState(state);
    const extra = state.extra as any;
    if (extra) {
      this.uvFunction = extra.uvFunction;
      this.uRange = [extra.uRange[0], extra.uRange[1]] as [number, number];
      this.vRange = [extra.vRange[0], extra.vRange[1]] as [number, number];
      this.uResolution = extra.uResolution;
      this.vResolution = extra.vResolution;
      this.fillColor = extra.fillColor;
      this.fillOpacity = extra.fillOpacity;
      this.wireframe = extra.wireframe;
      this.doubleSided = extra.doubleSided;
      this.checkerboardColors = extra.checkerboardColors ? [extra.checkerboardColors[0], extra.checkerboardColors[1]] as [string, string] : undefined;
      this.clipX = extra.clipX;
      this.clipY = extra.clipY;
      this.clipZ = extra.clipZ;
    }
    this.markDirty();
    return this;
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new Surface3D({
      uvFunction: this.uvFunction,
      uRange: this.uRange,
      vRange: this.vRange,
      uResolution: this.uResolution,
      vResolution: this.vResolution,
      color: this.fillColor,
      opacity: this.fillOpacity,
      wireframe: this.wireframe,
      doubleSided: this.doubleSided,
      checkerboardColors: this.checkerboardColors,
      clipX: this.clipX,
      clipY: this.clipY,
      clipZ: this.clipZ,
    });
    copy.position = [...this.position];
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}
