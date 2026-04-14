import { Mobject } from '../../core/Mobject';
import { Surface3D } from './Surface3D';
import type { Vec3, MobjectState } from '../../core/types';

/**
 * Options for creating a TexturedSurface
 */
export interface TexturedSurfaceOptions {
  /** The parametric surface to apply the texture to */
  surface: Surface3D;
  /** URL of the primary texture image */
  textureUrl: string;
  /** Optional URL of a secondary (dark/night) texture for day/night blending */
  darkTextureUrl?: string;
  /** Light direction vector for day/night blending. Default: [1, 0, 0] (from +X) */
  lightDirection?: Vec3;
  /** Opacity from 0 to 1. Default: 1 */
  opacity?: number;
  /** Texture repeat in [u, v]. Default: [1, 1] */
  textureRepeat?: [number, number];
  /** Texture offset in [u, v]. Default: [0, 0] */
  textureOffset?: [number, number];
  /** Whether to render both sides. Default: true */
  doubleSided?: boolean;
}

/**
 * Options for the texturedSphere convenience factory
 */
export interface TexturedSphereOptions {
  /** URL of the primary texture image */
  textureUrl: string;
  /** Optional URL of a secondary (dark/night) texture */
  darkTextureUrl?: string;
  /** Radius of the sphere. Default: 1 */
  radius?: number;
  /** Center position [x, y, z]. Default: [0, 0, 0] */
  center?: Vec3;
  /** Number of segments in each direction. Default: 64 */
  resolution?: number;
  /** Opacity from 0 to 1. Default: 1 */
  opacity?: number;
  /** Light direction for day/night blending. Default: [1, 0, 0] */
  lightDirection?: Vec3;
  /** Texture repeat in [u, v]. Default: [1, 1] */
  textureRepeat?: [number, number];
  /** Texture offset in [u, v]. Default: [0, 0] */
  textureOffset?: [number, number];
}

/**
 * TexturedSurface - Apply texture images to 3D parametric surfaces
 *
 * Wraps a Surface3D and applies one or two textures.
 * Supports single-texture mode and day/night mode (blending between
 * two textures based on a light direction).
 *
 * @example
 * ```typescript
 * // Single texture on a sphere
 * import { SurfacePresets } from './ParametricSurface';
 * const sphere = SurfacePresets.sphere(2);
 * const earth = new TexturedSurface({
 *   surface: sphere,
 *   textureUrl: '/textures/earth_day.jpg',
 * });
 *
 * // Day/night blending
 * const earthDayNight = new TexturedSurface({
 *   surface: sphere,
 *   textureUrl: '/textures/earth_day.jpg',
 *   darkTextureUrl: '/textures/earth_night.jpg',
 *   lightDirection: [1, 0.5, 0],
 * });
 *
 * // Convenience factory
 * const globe = texturedSphere({
 *   textureUrl: '/textures/earth_day.jpg',
 *   radius: 2,
 * });
 * ```
 */
export class TexturedSurface extends Mobject {
  surface: Surface3D;
  textureUrl: string;
  darkTextureUrl: string | null;
  lightDirection: Vec3;
  textureRepeat: [number, number];
  textureOffset: [number, number];
  doubleSided: boolean;
  fillColor: string;
  fillOpacity: number;

  constructor(options: TexturedSurfaceOptions) {
    super();

    this.surface = options.surface;
    this.textureUrl = options.textureUrl;
    this.darkTextureUrl = options.darkTextureUrl ?? null;
    this.lightDirection = options.lightDirection ?? [1, 0, 0];
    this.textureRepeat = options.textureRepeat ?? [1, 1];
    this.textureOffset = options.textureOffset ?? [0, 0];
    this.doubleSided = options.doubleSided ?? true;
    this.fillColor = '#ffffff';
    this.fillOpacity = options.opacity ?? 1;
    this.opacity = options.opacity ?? 1;

    // Copy position from the surface
    this.position = [...this.surface.position];

    this.markDirty();
  }

  /**
   * Get the underlying parametric surface
   */
  getSurface(): Surface3D {
    return this.surface;
  }

  /**
   * Get the primary texture URL
   */
  getTextureUrl(): string {
    return this.textureUrl;
  }

  /**
   * Get the dark texture URL (null if not set)
   */
  getDarkTextureUrl(): string | null {
    return this.darkTextureUrl;
  }

  /**
   * Set the light direction for day/night blending
   */
  setLightDirection(dir: Vec3): this {
    this.lightDirection = [...dir];
    this.markDirty();
    return this;
  }

  /**
   * Get the light direction
   */
  getLightDirection(): Vec3 {
    return [...this.lightDirection];
  }

  /**
   * Set texture repeat
   */
  setTextureRepeat(repeat: [number, number]): this {
    this.textureRepeat = [...repeat];
    this.markDirty();
    return this;
  }

  /**
   * Get the texture repeat
   */
  getTextureRepeat(): [number, number] {
    return [...this.textureRepeat];
  }

  /**
   * Set texture offset
   */
  setTextureOffset(offset: [number, number]): this {
    this.textureOffset = [...offset];
    this.markDirty();
    return this;
  }

  /**
   * Get the texture offset
   */
  getTextureOffset(): [number, number] {
    return [...this.textureOffset];
  }

  /**
   * Set whether to render both sides of the surface
   */
  setDoubleSided(value: boolean): this {
    this.doubleSided = value;
    this.markDirty();
    return this;
  }

  /**
   * Get whether double-sided rendering is enabled
   */
  isDoubleSided(): boolean {
    return this.doubleSided;
  }

  // ── State Management ─────────────────────────────────────────────────────

  override captureState(): MobjectState {
    const base = super.captureState();
    return {
      ...base,
      extra: {
        ...base.extra,
        textureUrl: this.textureUrl,
        darkTextureUrl: this.darkTextureUrl,
        lightDirection: [...this.lightDirection],
        textureRepeat: [...this.textureRepeat],
        textureOffset: [...this.textureOffset],
        doubleSided: this.doubleSided,
        fillColor: this.fillColor,
        fillOpacity: this.fillOpacity,
      },
    };
  }

  override restoreState(state: MobjectState): this {
    super.restoreState(state);
    const extra = state.extra as any;
    if (extra) {
      this.textureUrl = extra.textureUrl;
      this.darkTextureUrl = extra.darkTextureUrl;
      this.lightDirection = [...extra.lightDirection] as Vec3;
      this.textureRepeat = [...extra.textureRepeat] as [number, number];
      this.textureOffset = [...extra.textureOffset] as [number, number];
      this.doubleSided = extra.doubleSided;
      this.fillColor = extra.fillColor;
      this.fillOpacity = extra.fillOpacity;
    }
    this.markDirty();
    return this;
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new TexturedSurface({
      surface: this.surface,
      textureUrl: this.textureUrl,
      darkTextureUrl: this.darkTextureUrl ?? undefined,
      lightDirection: [...this.lightDirection],
      opacity: this.fillOpacity,
      textureRepeat: [...this.textureRepeat],
      textureOffset: [...this.textureOffset],
      doubleSided: this.doubleSided,
    });
    copy.position = [...this.position];
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}

/**
 * Create a textured sphere -- a common use case for Earth, Moon, etc.
 *
 * This builds a ParametricSurface sphere internally and wraps it with a
 * TexturedSurface, returning the ready-to-use mobject.
 *
 * @example
 * ```typescript
 * const earth = texturedSphere({
 *   textureUrl: '/textures/earth_day.jpg',
 *   darkTextureUrl: '/textures/earth_night.jpg',
 *   radius: 2,
 *   lightDirection: [1, 0.5, 0],
 * });
 * scene.add(earth);
 * ```
 */
export function texturedSphere(options: TexturedSphereOptions): TexturedSurface {
  const {
    textureUrl,
    darkTextureUrl,
    radius = 1,
    center = [0, 0, 0],
    resolution = 64,
    opacity = 1,
    lightDirection = [1, 0, 0],
    textureRepeat = [1, 1],
    textureOffset = [0, 0],
  } = options;

  // Build a parametric sphere surface
  // u -> longitude [0, 2PI], v -> latitude [0, PI]
  const surface = new Surface3D({
    uvFunction: (u: number, v: number): Vec3 => {
      const theta = u * Math.PI * 2;
      const phi = v * Math.PI;
      return [
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
      ];
    },
    uRange: [0, 1],
    vRange: [0, 1],
    uResolution: resolution,
    vResolution: resolution,
    color: '#ffffff',
    opacity,
  });
  surface.position = [...center];

  return new TexturedSurface({
    surface,
    textureUrl,
    darkTextureUrl,
    lightDirection,
    opacity,
    textureRepeat,
    textureOffset,
  });
}
