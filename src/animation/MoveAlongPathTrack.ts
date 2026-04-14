import { BaseAnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { RateFunction, Vec3 } from '../core/types';
import type { VMobject } from '../core/VMobject';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function evaluateCubicBezier(
  p0: number[],
  p1: number[],
  p2: number[],
  p3: number[],
  t: number,
): number[] {
  const oneMinusT = 1 - t;
  const oneMinusT2 = oneMinusT * oneMinusT;
  const oneMinusT3 = oneMinusT2 * oneMinusT;
  const t2 = t * t;
  const t3 = t2 * t;

  return [
    oneMinusT3 * p0[0] + 3 * oneMinusT2 * t * p1[0] + 3 * oneMinusT * t2 * p2[0] + t3 * p3[0],
    oneMinusT3 * p0[1] + 3 * oneMinusT2 * t * p1[1] + 3 * oneMinusT * t2 * p2[1] + t3 * p3[1],
    oneMinusT3 * p0[2] + 3 * oneMinusT2 * t * p1[2] + 3 * oneMinusT * t2 * p2[2] + t3 * p3[2],
  ];
}

export interface MoveAlongPathOptions {
  path: VMobject;
  duration?: number;
  rateFunc?: RateFunction;
  rotateAlongPath?: boolean;
}

export class MoveAlongPathTrack extends BaseAnimationTrack {
  private pathPoints: number[][];
  private numSegments: number;
  private centerOffset: Vec3;
  private rotateAlongPath: boolean;

  constructor(mobject: Mobject, options: MoveAlongPathOptions) {
    const { path, duration = 1, rateFunc = (t) => t, rotateAlongPath = false } = options;
    super(mobject, duration, rateFunc);

    this.pathPoints = path.points3D;
    this.numSegments = Math.max(0, Math.floor((this.pathPoints.length - 1) / 3));

    this.centerOffset = [
      mobject.getCenter()[0] - mobject.position[0],
      mobject.getCenter()[1] - mobject.position[1],
      mobject.getCenter()[2] - mobject.position[2],
    ];

    this.rotateAlongPath = rotateAlongPath;
  }

  prepare(): void {}

  private getPositionAtAlpha(alpha: number): Vec3 {
    if (this.numSegments === 0 || this.pathPoints.length < 4) {
      return this.mobject.getCenter();
    }

    alpha = Math.max(0, Math.min(1, alpha));
    const totalProgress = alpha * this.numSegments;
    const segmentIndex = Math.min(Math.floor(totalProgress), this.numSegments - 1);
    const localT = totalProgress - segmentIndex;

    const baseIndex = segmentIndex * 3;
    const p0 = this.pathPoints[baseIndex];
    const p1 = this.pathPoints[baseIndex + 1];
    const p2 = this.pathPoints[baseIndex + 2];
    const p3 = this.pathPoints[baseIndex + 3];

    const position = evaluateCubicBezier(p0, p1, p2, p3, localT);
    return [position[0], position[1], position[2]];
  }

  interpolate(alpha: number): void {
    const position = this.getPositionAtAlpha(alpha);

    const targetPos: Vec3 = [
      position[0] - this.centerOffset[0],
      position[1] - this.centerOffset[1],
      position[2] - this.centerOffset[2],
    ];

    // Set position directly - all mobjects (including Dot) use position now
    this.mobject.position = targetPos;
    this.mobject.markDirty();
  }
}
