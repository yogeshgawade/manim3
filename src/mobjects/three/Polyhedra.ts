import { Mobject } from '../../core/Mobject';
import type { Vec3, MobjectState } from '../../core/types';

/**
 * Base options for all polyhedra
 */
export interface PolyhedronOptions {
  /** Side length of the polyhedron. Default: 1 */
  sideLength?: number;
  /** Center position [x, y, z]. Default: [0, 0, 0] */
  center?: Vec3;
  /** Color as CSS color string. Default: '#ffffff' */
  color?: string;
  /** Opacity from 0 to 1. Default: 1 */
  opacity?: number;
  /** Whether to render as wireframe. Default: false */
  wireframe?: boolean;
  /** Level of detail (subdivision level). Default: 0 */
  detail?: number;
}

/**
 * Base class for all polyhedra (platonic solids)
 *
 * Provides common functionality for polyhedra including side length,
 * wireframe mode, and material properties.
 */
export abstract class Polyhedron extends Mobject {
  sideLength: number;
  wireframe: boolean;
  detail: number;
  fillColor: string;
  fillOpacity: number;

  constructor(options: PolyhedronOptions = {}) {
    super();

    this.sideLength = options.sideLength ?? 1;
    this.wireframe = options.wireframe ?? false;
    this.detail = options.detail ?? 0;
    this.fillColor = options.color ?? '#ffffff';
    this.color = this.fillColor;
    this.fillOpacity = options.opacity ?? 1;
    this.opacity = options.opacity ?? 1;

    const center = options.center ?? [0, 0, 0];
    this.position = [...center];

    this.markDirty();
  }

  /**
   * Get the side length
   */
  getSideLength(): number {
    return this.sideLength;
  }

  /**
   * Set the side length
   */
  setSideLength(value: number): this {
    this.sideLength = value;
    this.markDirty();
    return this;
  }

  /**
   * Get whether wireframe mode is enabled
   */
  isWireframe(): boolean {
    return this.wireframe;
  }

  /**
   * Set wireframe mode
   */
  setWireframe(value: boolean): this {
    this.wireframe = value;
    this.markDirty();
    return this;
  }

  /**
   * Get the detail level
   */
  getDetail(): number {
    return this.detail;
  }

  /**
   * Set the detail level (subdivision)
   */
  setDetail(value: number): this {
    this.detail = Math.max(0, Math.floor(value));
    this.markDirty();
    return this;
  }

  /**
   * Get the number of faces for this polyhedron
   */
  abstract getFaceCount(): number;

  /**
   * Get the number of vertices for this polyhedron
   */
  abstract getVertexCount(): number;

  /**
   * Get the number of edges for this polyhedron
   */
  abstract getEdgeCount(): number;

  // ── State Management ─────────────────────────────────────────────────────

  override captureState(): MobjectState {
    const base = super.captureState();
    return {
      ...base,
      extra: {
        ...base.extra,
        sideLength: this.sideLength,
        wireframe: this.wireframe,
        detail: this.detail,
        fillColor: this.fillColor,
        fillOpacity: this.fillOpacity,
      },
    };
  }

  override restoreState(state: MobjectState): this {
    super.restoreState(state);
    const extra = state.extra as any;
    if (extra) {
      this.sideLength = extra.sideLength;
      this.wireframe = extra.wireframe;
      this.detail = extra.detail;
      this.fillColor = extra.fillColor;
      this.fillOpacity = extra.fillOpacity;
    }
    this.markDirty();
    return this;
  }
}

/**
 * Tetrahedron - A 4-faced triangular pyramid (platonic solid)
 *
 * @example
 * ```typescript
 * const tetra = new Tetrahedron({ sideLength: 2, color: '#ff0000' });
 * ```
 */
export class Tetrahedron extends Polyhedron {
  /**
   * Convert side length to circumradius for Three.js TetrahedronGeometry.
   * For a tetrahedron: circumradius = sideLength * sqrt(6) / 4
   */
  getRadius(): number {
    return (this.sideLength * Math.sqrt(6)) / 4;
  }

  getFaceCount(): number {
    return 4;
  }

  getVertexCount(): number {
    return 4;
  }

  getEdgeCount(): number {
    return 6;
  }

  /**
   * Get the surface area of the tetrahedron
   */
  getSurfaceArea(): number {
    return Math.sqrt(3) * this.sideLength * this.sideLength;
  }

  /**
   * Get the volume of the tetrahedron
   */
  getVolume(): number {
    return (Math.sqrt(2) / 12) * Math.pow(this.sideLength, 3);
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new Tetrahedron({
      sideLength: this.sideLength,
      center: [...this.position],
      color: this.fillColor,
      opacity: this.fillOpacity,
      wireframe: this.wireframe,
      detail: this.detail,
    });
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}

/**
 * Octahedron - An 8-faced polyhedron (platonic solid)
 *
 * @example
 * ```typescript
 * const octa = new Octahedron({ sideLength: 2, color: '#0000ff' });
 * ```
 */
export class Octahedron extends Polyhedron {
  /**
   * Convert side length to circumradius for Three.js OctahedronGeometry.
   * For an octahedron: circumradius = sideLength / sqrt(2)
   */
  getRadius(): number {
    return this.sideLength / Math.sqrt(2);
  }

  getFaceCount(): number {
    return 8;
  }

  getVertexCount(): number {
    return 6;
  }

  getEdgeCount(): number {
    return 12;
  }

  /**
   * Get the surface area of the octahedron
   */
  getSurfaceArea(): number {
    return 2 * Math.sqrt(3) * this.sideLength * this.sideLength;
  }

  /**
   * Get the volume of the octahedron
   */
  getVolume(): number {
    return (Math.sqrt(2) / 3) * Math.pow(this.sideLength, 3);
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new Octahedron({
      sideLength: this.sideLength,
      center: [...this.position],
      color: this.fillColor,
      opacity: this.fillOpacity,
      wireframe: this.wireframe,
      detail: this.detail,
    });
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}

/**
 * Icosahedron - A 20-faced polyhedron (platonic solid)
 *
 * @example
 * ```typescript
 * const icosa = new Icosahedron({ sideLength: 2, color: '#00ff00' });
 * ```
 */
export class Icosahedron extends Polyhedron {
  /**
   * Convert side length to circumradius for Three.js IcosahedronGeometry.
   * For an icosahedron: circumradius = sideLength * sqrt(10 + 2*sqrt(5)) / 4
   */
  getRadius(): number {
    return (this.sideLength * Math.sqrt(10 + 2 * Math.sqrt(5))) / 4;
  }

  getFaceCount(): number {
    return 20;
  }

  getVertexCount(): number {
    return 12;
  }

  getEdgeCount(): number {
    return 30;
  }

  /**
   * Get the surface area of the icosahedron
   */
  getSurfaceArea(): number {
    return 5 * Math.sqrt(3) * this.sideLength * this.sideLength;
  }

  /**
   * Get the volume of the icosahedron
   */
  getVolume(): number {
    return (5 / 12) * (3 + Math.sqrt(5)) * Math.pow(this.sideLength, 3);
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new Icosahedron({
      sideLength: this.sideLength,
      center: [...this.position],
      color: this.fillColor,
      opacity: this.fillOpacity,
      wireframe: this.wireframe,
      detail: this.detail,
    });
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}

/**
 * Dodecahedron - A 12-faced polyhedron (platonic solid)
 *
 * @example
 * ```typescript
 * const dodeca = new Dodecahedron({ sideLength: 2, color: '#800080' });
 * ```
 */
export class Dodecahedron extends Polyhedron {
  /**
   * Convert side length to circumradius for Three.js DodecahedronGeometry.
   * For a dodecahedron: circumradius = sideLength * phi * sqrt(3) / 2
   * where phi = (1 + sqrt(5)) / 2 (golden ratio)
   */
  getRadius(): number {
    const phi = (1 + Math.sqrt(5)) / 2;
    return (this.sideLength * phi * Math.sqrt(3)) / 2;
  }

  getFaceCount(): number {
    return 12;
  }

  getVertexCount(): number {
    return 20;
  }

  getEdgeCount(): number {
    return 30;
  }

  /**
   * Get the surface area of the dodecahedron
   */
  getSurfaceArea(): number {
    return 3 * Math.sqrt(25 + 10 * Math.sqrt(5)) * this.sideLength * this.sideLength;
  }

  /**
   * Get the volume of the dodecahedron
   */
  getVolume(): number {
    return (1 / 4) * (15 + 7 * Math.sqrt(5)) * Math.pow(this.sideLength, 3);
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new Dodecahedron({
      sideLength: this.sideLength,
      center: [...this.position],
      color: this.fillColor,
      opacity: this.fillOpacity,
      wireframe: this.wireframe,
      detail: this.detail,
    });
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}

/**
 * Options for creating a Prism
 */
export interface PrismOptions {
  /** Radius of the circumscribed circle. Default: 1 */
  radius?: number;
  /** Height of the prism. Default: 2 */
  height?: number;
  /** Number of sides. Default: 6 (hexagonal prism) */
  sides?: number;
  /** Center position [x, y, z]. Default: [0, 0, 0] */
  center?: Vec3;
  /** Color as CSS color string. Default: '#ffffff' */
  color?: string;
  /** Opacity from 0 to 1. Default: 1 */
  opacity?: number;
  /** Whether to render as wireframe. Default: false */
  wireframe?: boolean;
}

/**
 * Prism - A 3D prism with regular polygon base
 *
 * Creates a prism using CylinderGeometry with the appropriate number of sides.
 *
 * @example
 * ```typescript
 * // Hexagonal prism
 * const hexPrism = new Prism();
 *
 * // Triangular prism
 * const triPrism = new Prism({ sides: 3 });
 *
 * // Pentagonal prism
 * const pentPrism = new Prism({ sides: 5, radius: 1.5, height: 3 });
 * ```
 */
export class Prism extends Mobject {
  radius: number;
  height: number;
  sides: number;
  wireframe: boolean;
  fillColor: string;
  fillOpacity: number;

  constructor(options: PrismOptions = {}) {
    super();

    this.radius = options.radius ?? 1;
    this.height = options.height ?? 2;
    this.sides = options.sides ?? 6;
    this.wireframe = options.wireframe ?? false;
    this.fillColor = options.color ?? '#ffffff';
    this.color = this.fillColor;
    this.fillOpacity = options.opacity ?? 1;
    this.opacity = options.opacity ?? 1;

    const center = options.center ?? [0, 0, 0];
    this.position = [...center];

    this.markDirty();
  }

  /**
   * Get the radius
   */
  getRadius(): number {
    return this.radius;
  }

  /**
   * Set the radius
   */
  setRadius(value: number): this {
    this.radius = value;
    this.markDirty();
    return this;
  }

  /**
   * Get the height
   */
  getHeight(): number {
    return this.height;
  }

  /**
   * Set the height
   */
  setHeight(value: number): this {
    this.height = value;
    this.markDirty();
    return this;
  }

  /**
   * Get the number of sides
   */
  getSides(): number {
    return this.sides;
  }

  /**
   * Set the number of sides
   */
  setSides(value: number): this {
    this.sides = Math.max(3, Math.floor(value));
    this.markDirty();
    return this;
  }

  /**
   * Get whether wireframe mode is enabled
   */
  isWireframe(): boolean {
    return this.wireframe;
  }

  /**
   * Set wireframe mode
   */
  setWireframe(value: boolean): this {
    this.wireframe = value;
    this.markDirty();
    return this;
  }

  /**
   * Get the side length of the base polygon
   */
  getSideLength(): number {
    return 2 * this.radius * Math.sin(Math.PI / this.sides);
  }

  /**
   * Get the surface area of the prism
   */
  getSurfaceArea(): number {
    const baseArea = (this.sides * this.radius * this.radius * Math.sin(2 * Math.PI / this.sides)) / 2;
    const sideArea = this.sides * this.getSideLength() * this.height;
    return 2 * baseArea + sideArea;
  }

  /**
   * Get the volume of the prism
   */
  getVolume(): number {
    const baseArea = (this.sides * this.radius * this.radius * Math.sin(2 * Math.PI / this.sides)) / 2;
    return baseArea * this.height;
  }

  // ── State Management ─────────────────────────────────────────────────────

  override captureState(): MobjectState {
    const base = super.captureState();
    return {
      ...base,
      extra: {
        ...base.extra,
        radius: this.radius,
        height: this.height,
        sides: this.sides,
        wireframe: this.wireframe,
        fillColor: this.fillColor,
        fillOpacity: this.fillOpacity,
      },
    };
  }

  override restoreState(state: MobjectState): this {
    super.restoreState(state);
    const extra = state.extra as any;
    if (extra) {
      this.radius = extra.radius;
      this.height = extra.height;
      this.sides = extra.sides;
      this.wireframe = extra.wireframe;
      this.fillColor = extra.fillColor;
      this.fillOpacity = extra.fillOpacity;
    }
    this.markDirty();
    return this;
  }

  // ── Copy ─────────────────────────────────────────────────────────────────

  override copy(): this {
    const copy = new Prism({
      radius: this.radius,
      height: this.height,
      sides: this.sides,
      center: [...this.position],
      color: this.fillColor,
      opacity: this.fillOpacity,
      wireframe: this.wireframe,
    });
    copy.rotation = [...this.rotation];
    copy.scale = [...this.scale];
    return copy as this;
  }
}
