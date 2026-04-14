import { VMobject } from '../../core/VMobject';
import type { Vec3 } from '../../core/types';
import { BLUE, DEFAULT_STROKE_WIDTH } from '../../constants/colors';

/**
 * Options for creating a Polygon
 */
export interface PolygonOptions {
  /** Array of vertices defining the polygon. Default: triangle */
  vertices?: Vec3[];
  /** Stroke color as CSS color string. Default: Manim's blue (#58C4DD) */
  color?: string;
  /** Fill opacity from 0 to 1. Default: 0 */
  fillOpacity?: number;
  /** Stroke width in pixels. Default: 4 (Manim's default) */
  strokeWidth?: number;
}

/**
 * Polygon - A polygon defined by its vertices
 *
 * Creates a polygon from an array of vertices connected by straight edges.
 *
 * @example
 * ```typescript
 * // Create a triangle
 * const triangle = new Polygon({
 *   vertices: [[-1, -1, 0], [1, -1, 0], [0, 1, 0]]
 * });
 *
 * // Create a pentagon
 * const pentagon = new Polygon({
 *   vertices: [
 *     [0, 1, 0],
 *     [0.95, 0.31, 0],
 *     [0.59, -0.81, 0],
 *     [-0.59, -0.81, 0],
 *     [-0.95, 0.31, 0]
 *   ]
 * });
 * ```
 */
export class Polygon extends VMobject {
  private _vertices: Vec3[];

  constructor(options: PolygonOptions = {}) {
    super();

    // Default triangle vertices
    const defaultVertices: Vec3[] = [
      [-1, -1, 0],
      [1, -1, 0],
      [0, 1, 0],
    ];

    const {
      vertices = defaultVertices,
      color = BLUE,
      fillOpacity = 0,
      strokeWidth = DEFAULT_STROKE_WIDTH,
    } = options;

    this._vertices = vertices.map(v => [...v]);

    this.color = color;
    this.fillOpacity = fillOpacity;
    this.strokeWidth = strokeWidth;

    this._generatePoints();
  }

  /**
   * Generate the polygon points from vertices
   */
  private _generatePoints(): void {
    if (this._vertices.length < 3) {
      this.setPoints3D([]);
      return;
    }

    const points: number[][] = [];

    for (let i = 0; i < this._vertices.length; i++) {
      const current = this._vertices[i];
      const next = this._vertices[(i + 1) % this._vertices.length];

      const dx = next[0] - current[0];
      const dy = next[1] - current[1];
      const dz = next[2] - current[2];

      if (i === 0) {
        // First vertex includes the anchor
        points.push([...current]);
      }

      // Add cubic Bezier control points (degenerate for straight lines)
      points.push([current[0] + dx / 3, current[1] + dy / 3, current[2] + dz / 3]);
      points.push([current[0] + (2 * dx) / 3, current[1] + (2 * dy) / 3, current[2] + (2 * dz) / 3]);
      points.push([...next]);
    }

    this.setPoints3D(points);
  }

  /**
   * Get the vertices of the polygon
   */
  getVertices(): Vec3[] {
    return this._vertices.map(v => [...v]);
  }

  /**
   * Set the vertices of the polygon
   */
  setVertices(vertices: Vec3[]): this {
    this._vertices = vertices.map(v => [...v]);
    this._generatePoints();
    return this;
  }

  /**
   * Get the number of vertices
   */
  getNumVertices(): number {
    return this._vertices.length;
  }

  /**
   * Get the center of the polygon (centroid)
   */
  getPolygonCenter(): Vec3 {
    if (this._vertices.length === 0) {
      return [0, 0, 0];
    }

    let x = 0, y = 0, z = 0;
    for (const v of this._vertices) {
      x += v[0];
      y += v[1];
      z += v[2];
    }

    return [x / this._vertices.length, y / this._vertices.length, z / this._vertices.length];
  }

  /**
   * Get the perimeter of the polygon
   */
  getPerimeter(): number {
    let perimeter = 0;
    for (let i = 0; i < this._vertices.length; i++) {
      const current = this._vertices[i];
      const next = this._vertices[(i + 1) % this._vertices.length];
      const dx = next[0] - current[0];
      const dy = next[1] - current[1];
      const dz = next[2] - current[2];
      perimeter += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    return perimeter;
  }

  /**
   * Create a copy of this Polygon
   */
  copy(): this {
    const clone = new Polygon({
      vertices: this._vertices,
      color: this.color,
      fillOpacity: this.fillOpacity,
      strokeWidth: this.strokeWidth,
    });
    return clone as this;
  }
}

/**
 * Triangle - A polygon with 3 vertices
 */
export class Triangle extends Polygon {
  constructor(options: Omit<PolygonOptions, 'vertices'> & { vertices?: Vec3[] } = {}) {
    // Default equilateral triangle
    const defaultTriangle: Vec3[] = [
      [-1, -1, 0],
      [1, -1, 0],
      [0, 1, 0],
    ];
    super({ ...options, vertices: options.vertices || defaultTriangle });
  }
}

/**
 * RegularPolygon - A polygon with equal sides and angles
 */
export class RegularPolygon extends Polygon {
  private _numSides: number;
  private _radius: number;

  constructor(options: Omit<PolygonOptions, 'vertices'> & { numSides?: number; radius?: number } = {}) {
    const { numSides = 6, radius = 1, ...rest } = options;

    // Generate vertices for regular polygon
    const vertices: Vec3[] = [];
    for (let i = 0; i < numSides; i++) {
      const angle = (i / numSides) * Math.PI * 2;
      vertices.push([radius * Math.cos(angle), radius * Math.sin(angle), 0]);
    }

    super({ ...rest, vertices });
    this._numSides = numSides;
    this._radius = radius;
  }

  /**
   * Get the number of sides
   */
  getNumSides(): number {
    return this._numSides;
  }

  /**
   * Get the radius (circumradius)
   */
  getRadius(): number {
    return this._radius;
  }

  /**
   * Get the side length
   */
  getSideLength(): number {
    return 2 * this._radius * Math.sin(Math.PI / this._numSides);
  }

  /**
   * Get the apothem (inradius)
   */
  getApothem(): number {
    return this._radius * Math.cos(Math.PI / this._numSides);
  }
}

/**
 * Hexagon - A regular 6-sided polygon
 */
export class Hexagon extends RegularPolygon {
  constructor(options: Omit<PolygonOptions, 'vertices' | 'numSides' | 'radius'> & { radius?: number } = {}) {
    const { radius = 1, ...rest } = options;
    super({ ...rest, numSides: 6, radius });
  }
}

/**
 * Pentagon - A regular 5-sided polygon
 */
export class Pentagon extends RegularPolygon {
  constructor(options: Omit<PolygonOptions, 'vertices' | 'numSides' | 'radius'> & { radius?: number } = {}) {
    const { radius = 1, ...rest } = options;
    super({ ...rest, numSides: 5, radius });
  }
}
