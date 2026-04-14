import { BaseAnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { VMobject } from '../core/VMobject';
import type { RateFunction, Vec3, Color } from '../core/types';
import { UP, DOWN, LEFT, RIGHT } from '../core/types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/**
 * Compute bounding box from VMobject points3D.
 * Returns [minX, minY, minZ, maxX, maxY, maxZ].
 */
function getBoundingBoxFromPoints(mob: Mobject): [number, number, number, number, number, number] {
  const family = mob.getFamily();
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let hasPoints = false;

  for (const member of family) {
    const vmob = member as VMobject;
    if (vmob.points3D && vmob.points3D.length > 0) {
      hasPoints = true;
      for (const pt of vmob.points3D) {
        const [x, y, z = 0] = pt;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        minZ = Math.min(minZ, z);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        maxZ = Math.max(maxZ, z);
      }
    }
  }

  if (!hasPoints) {
    // Default to position as center if no points
    const [px, py, pz] = mob.position;
    return [px, py, pz, px, py, pz];
  }

  return [minX, minY, minZ, maxX, maxY, maxZ];
}

/**
 * Get the critical point on a bounding box edge based on direction.
 * Direction should be a normalized vector like UP, DOWN, LEFT, RIGHT.
 */
function getCriticalPoint(mob: Mobject, direction: Vec3): Vec3 {
  const [minX, minY, minZ, maxX, maxY, maxZ] = getBoundingBoxFromPoints(mob);
  const [dx, dy, dz] = direction;

  // For each axis, pick min or max based on direction sign
  const x = dx > 0 ? maxX : (dx < 0 ? minX : (minX + maxX) / 2);
  const y = dy > 0 ? maxY : (dy < 0 ? minY : (minY + maxY) / 2);
  const z = dz > 0 ? maxZ : (dz < 0 ? minZ : (minZ + maxZ) / 2);

  return [x, y, z];
}

/**
 * GrowFromPointTrack — Introduces a mobject by growing it from a point.
 * Animates scale from 0 to 1 while moving from the grow point to final position.
 */
export class GrowFromPointTrack extends BaseAnimationTrack {
  private growPoint: Vec3;
  private pointColor: Color | null;
  private startScale: Vec3 | null = null;
  private endScale: Vec3 | null = null;
  private endPosition: Vec3 | null = null;
  private originalColor: Color | null = null;
  private targetColor: Color | null = null;
  private _prepared = false;

  constructor(
    mobject: Mobject,
    point: Vec3,
    pointColor: Color | null = null,
    duration: number = 1,
    rateFunc: RateFunction = (t) => t,
  ) {
    super(mobject, duration, rateFunc);
    this.growPoint = [...point] as Vec3;
    this.pointColor = pointColor;
  }

  prepare(): void {
    if (this._prepared) return;
    this._prepared = true;

    // Capture target state only - defer modifications to interpolate()
    this.endScale = [...this.mobject.scale] as Vec3;
    this.endPosition = [...this.mobject.position] as Vec3;
    this.targetColor = this.mobject.color;

    // Save original color if we need to animate it
    if (this.pointColor) {
      this.originalColor = this.mobject.color;
    }
  }

  interpolate(alpha: number): void {
    // On first call, set the starting state (scale 0 at grow point)
    if (this.startScale === null) {
      this.startScale = [0, 0, 0];
      // Apply initial state now
      this.mobject.scale = [0, 0, 0];
      this.mobject.position = [...this.growPoint] as Vec3;
      if (this.pointColor && this.originalColor) {
        this.mobject.color = this.pointColor;
      }
    }

    // Now interpolate
    this.mobject.scale = lerpVec3(this.startScale, this.endScale!, alpha);
    this.mobject.position = lerpVec3(this.growPoint, this.endPosition!, alpha);

    // Interpolate color if pointColor was specified
    if (this.pointColor && this.targetColor && this.originalColor) {
      this.mobject.color = alpha > 0.5 ? this.targetColor : this.originalColor;
    }

    this.mobject.markDirty();
  }
}

/**
 * GrowFromCenterTrack — Grows a mobject from its center point.
 */
export class GrowFromCenterTrack extends GrowFromPointTrack {
  constructor(
    mobject: Mobject,
    pointColor: Color | null = null,
    duration: number = 1,
    rateFunc: RateFunction = (t) => t,
  ) {
    const center = mobject.getCenter();
    super(mobject, center, pointColor, duration, rateFunc);
  }
}

/**
 * GrowFromEdgeTrack — Grows a mobject from one of its bounding box edges.
 * Edge should be a direction vector like UP, DOWN, LEFT, RIGHT.
 */
export class GrowFromEdgeTrack extends GrowFromPointTrack {
  constructor(
    mobject: Mobject,
    edge: Vec3,
    pointColor: Color | null = null,
    duration: number = 1,
    rateFunc: RateFunction = (t) => t,
  ) {
    const edgePoint = getCriticalPoint(mobject, edge);
    super(mobject, edgePoint, pointColor, duration, rateFunc);
  }
}

// Factory functions

/**
 * Grow a mobject from a specific point.
 */
export function growFromPoint(
  mob: Mobject,
  point: Vec3,
  duration = 1,
  rateFunc?: RateFunction,
): GrowFromPointTrack {
  return new GrowFromPointTrack(mob, point, null, duration, rateFunc);
}

/**
 * Grow a mobject from a specific point with initial color.
 */
export function growFromPointWithColor(
  mob: Mobject,
  point: Vec3,
  pointColor: Color,
  duration = 1,
  rateFunc?: RateFunction,
): GrowFromPointTrack {
  return new GrowFromPointTrack(mob, point, pointColor, duration, rateFunc);
}

/**
 * Grow a mobject from its center.
 */
export function growFromCenter(
  mob: Mobject,
  duration = 1,
  rateFunc?: RateFunction,
): GrowFromCenterTrack {
  return new GrowFromCenterTrack(mob, null, duration, rateFunc);
}

/**
 * Grow a mobject from its center with initial color.
 */
export function growFromCenterWithColor(
  mob: Mobject,
  pointColor: Color,
  duration = 1,
  rateFunc?: RateFunction,
): GrowFromCenterTrack {
  return new GrowFromCenterTrack(mob, pointColor, duration, rateFunc);
}

/**
 * Grow a mobject from a bounding box edge.
 * Edge should be a direction like UP, DOWN, LEFT, RIGHT.
 */
export function growFromEdge(
  mob: Mobject,
  edge: Vec3,
  duration = 1,
  rateFunc?: RateFunction,
): GrowFromEdgeTrack {
  return new GrowFromEdgeTrack(mob, edge, null, duration, rateFunc);
}

/**
 * Grow a mobject from a bounding box edge with initial color.
 */
export function growFromEdgeWithColor(
  mob: Mobject,
  edge: Vec3,
  pointColor: Color,
  duration = 1,
  rateFunc?: RateFunction,
): GrowFromEdgeTrack {
  return new GrowFromEdgeTrack(mob, edge, pointColor, duration, rateFunc);
}
