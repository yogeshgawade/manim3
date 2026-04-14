import { Surface3D, Surface3DOptions } from './Surface3D';
import type { Vec3 } from '../../core/types';

/**
 * Options for creating a ParametricSurface
 * (Alias for Surface3DOptions for compatibility)
 */
export type ParametricSurfaceOptions = Surface3DOptions;

/**
 * ParametricSurface - Alias for Surface3D
 *
 * This class is provided for compatibility and naming consistency
 * with Manim's ParametricSurface class. It is functionally identical
 * to Surface3D.
 *
 * @example
 * ```typescript
 * // Create a mobius strip
 * const mobius = new ParametricSurface({
 *   uvFunction: (u, v) => {
 *     const theta = u * 2 * Math.PI;
 *     const w = 2 * v - 1;
 *     return [
 *       (1 + w / 2 * Math.cos(theta / 2)) * Math.cos(theta),
 *       (1 + w / 2 * Math.cos(theta / 2)) * Math.sin(theta),
 *       w / 2 * Math.sin(theta / 2)
 *     ];
 *   },
 *   uRange: [0, 1],
 *   vRange: [0, 1],
 *   uResolution: 64,
 *   vResolution: 16
 * });
 *
 * // Create a Klein bottle segment
 * const klein = new ParametricSurface({
 *   uvFunction: (u, v) => {
 *     const theta = u * Math.PI * 2;
 *     const phi = v * Math.PI * 2;
 *     return [
 *       Math.cos(theta) * (Math.cos(theta/2) * Math.sin(phi) - Math.sin(theta/2) * Math.sin(2*phi) * 0.5),
 *       Math.sin(theta) * (Math.cos(theta/2) * Math.sin(phi) - Math.sin(theta/2) * Math.sin(2*phi) * 0.5),
 *       Math.sin(theta/2) * Math.sin(phi) + Math.cos(theta/2) * Math.sin(2*phi) * 0.5
 *     ];
 *   }
 * });
 * ```
 */
export class ParametricSurface extends Surface3D {
  constructor(options: ParametricSurfaceOptions) {
    super(options);
  }

  /**
   * Create a copy of this ParametricSurface
   */
  override copy(): this {
    const copy = new ParametricSurface({
      uvFunction: this.uvFunction,
      uRange: [...this.uRange] as [number, number],
      vRange: [...this.vRange] as [number, number],
      uResolution: this.uResolution,
      vResolution: this.vResolution,
      color: this.fillColor,
      opacity: this.fillOpacity,
      wireframe: this.wireframe,
      doubleSided: this.doubleSided,
      checkerboardColors: this.checkerboardColors ? [...this.checkerboardColors] as [string, string] : undefined,
    });
    copy.position = [...this.position];
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}

/**
 * Helper function to create common parametric surfaces
 */
export const SurfacePresets = {
  /**
   * Create a sphere surface
   */
  sphere(
    radius: number = 1,
    options: Partial<Omit<Surface3DOptions, 'uvFunction'>> = {},
  ): ParametricSurface {
    return new ParametricSurface({
      uvFunction: (u: number, v: number): Vec3 => {
        const theta = u * Math.PI * 2;
        const phi = v * Math.PI;
        return [
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi),
        ];
      },
      ...options,
    });
  },

  /**
   * Create a torus surface
   */
  torus(
    majorRadius: number = 1,
    minorRadius: number = 0.3,
    options: Partial<Omit<Surface3DOptions, 'uvFunction'>> = {},
  ): ParametricSurface {
    return new ParametricSurface({
      uvFunction: (u: number, v: number): Vec3 => {
        const theta = u * Math.PI * 2;
        const phi = v * Math.PI * 2;
        return [
          (majorRadius + minorRadius * Math.cos(phi)) * Math.cos(theta),
          (majorRadius + minorRadius * Math.cos(phi)) * Math.sin(theta),
          minorRadius * Math.sin(phi),
        ];
      },
      ...options,
    });
  },

  /**
   * Create a mobius strip surface
   */
  mobiusStrip(
    radius: number = 1,
    width: number = 0.5,
    options: Partial<Omit<Surface3DOptions, 'uvFunction'>> = {},
  ): ParametricSurface {
    return new ParametricSurface({
      uvFunction: (u: number, v: number): Vec3 => {
        const theta = u * Math.PI * 2;
        const w = width * (2 * v - 1);
        return [
          (radius + w * Math.cos(theta / 2)) * Math.cos(theta),
          (radius + w * Math.cos(theta / 2)) * Math.sin(theta),
          w * Math.sin(theta / 2),
        ];
      },
      uResolution: 64,
      vResolution: 16,
      ...options,
    });
  },

  /**
   * Create a paraboloid surface
   */
  paraboloid(
    scale: number = 1,
    options: Partial<Omit<Surface3DOptions, 'uvFunction'>> = {},
  ): ParametricSurface {
    return new ParametricSurface({
      uvFunction: (u: number, v: number): Vec3 => {
        const x = scale * (2 * u - 1);
        const y = scale * (2 * v - 1);
        return [x, y, (x * x + y * y) / scale];
      },
      ...options,
    });
  },

  /**
   * Create a saddle surface (hyperbolic paraboloid)
   */
  saddle(
    scale: number = 1,
    options: Partial<Omit<Surface3DOptions, 'uvFunction'>> = {},
  ): ParametricSurface {
    return new ParametricSurface({
      uvFunction: (u: number, v: number): Vec3 => {
        const x = scale * (2 * u - 1);
        const y = scale * (2 * v - 1);
        return [x, y, (x * x - y * y) / scale];
      },
      ...options,
    });
  },

  /**
   * Create a helicoid surface
   */
  helicoid(
    radius: number = 1,
    pitch: number = 0.5,
    options: Partial<Omit<Surface3DOptions, 'uvFunction'>> = {},
  ): ParametricSurface {
    return new ParametricSurface({
      uvFunction: (u: number, v: number): Vec3 => {
        const theta = u * Math.PI * 4;
        const r = radius * (2 * v - 1);
        return [r * Math.cos(theta), r * Math.sin(theta), pitch * theta];
      },
      uResolution: 64,
      vResolution: 16,
      ...options,
    });
  },
};
