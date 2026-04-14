import { BaseAnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { RateFunction, Vec3, Color } from '../core/types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// Default angle for spin: PI/2 (90 degrees)
const DEFAULT_SPIN_ANGLE = Math.PI / 2;

/**
 * SpinInFromNothingTrack — Introduces a mobject by growing it from its center
 * while simultaneously spinning it.
 *
 * Combines scaling from 0 with rotation around the Z-axis.
 * Unlike Python Manim's version which uses a spiral path, this implementation
 * animates scale and rotation independently for simplicity.
 */
export class SpinInFromNothingTrack extends BaseAnimationTrack {
  private angle: number;
  private pointColor: Color | null;
  private center: Vec3;
  private endScale: Vec3 | null = null;
  private endRotation: Vec3 | null = null;
  private originalColor: Color | null = null;
  private targetColor: Color | null = null;
  private _prepared = false;

  constructor(
    mobject: Mobject,
    angle: number = DEFAULT_SPIN_ANGLE,
    pointColor: Color | null = null,
    duration: number = 1,
    rateFunc: RateFunction = (t) => t,
  ) {
    super(mobject, duration, rateFunc);
    this.angle = angle;
    this.pointColor = pointColor;
    this.center = mobject.getCenter();
  }

  prepare(): void {
    if (this._prepared) return;
    this._prepared = true;

    // Capture target state only
    this.endScale = [...this.mobject.scale] as Vec3;
    this.endRotation = [...this.mobject.rotation] as Vec3;
    this.targetColor = this.mobject.color;

    // Save original color if needed
    if (this.pointColor) {
      this.originalColor = this.mobject.color;
    }
  }

  interpolate(alpha: number): void {
    // Ensure end values are set
    if (this.endScale === null) {
      this.endScale = [1, 1, 1];
    }
    if (this.endRotation === null) {
      this.endRotation = [0, 0, 0];
    }

    // On first frame, apply initial state
    if (this.mobject.scale[0] !== 0 && alpha < 0.01) {
      this.mobject.scale = [0, 0, 0];
      this.mobject.rotation = [
        this.endRotation[0],
        this.endRotation[1],
        this.endRotation[2] - this.angle,
      ];
      if (this.pointColor && this.originalColor) {
        this.mobject.color = this.pointColor;
      }
    }

    // Interpolate scale from 0 to endScale
    const startScale: Vec3 = [0, 0, 0];
    this.mobject.scale = lerpVec3(startScale, this.endScale, alpha);

    // Interpolate rotation
    const startRotation: Vec3 = [
      this.endRotation[0],
      this.endRotation[1],
      this.endRotation[2] - this.angle,
    ];
    this.mobject.rotation = lerpVec3(startRotation, this.endRotation, alpha);

    // Interpolate color if pointColor was specified
    if (this.pointColor && this.targetColor && this.originalColor) {
      this.mobject.color = alpha > 0.5 ? this.targetColor : this.originalColor;
    }

    this.mobject.markDirty();
  }
}

// Factory functions

/**
 * Spin a mobject in from nothing while growing from its center.
 * @param angle - Amount of rotation during the animation (default: PI/2)
 */
export function spinInFromNothing(
  mob: Mobject,
  angle: number = DEFAULT_SPIN_ANGLE,
  duration = 1,
  rateFunc?: RateFunction,
): SpinInFromNothingTrack {
  return new SpinInFromNothingTrack(mob, angle, null, duration, rateFunc);
}

/**
 * Spin a mobject in from nothing with initial color.
 * @param angle - Amount of rotation during the animation (default: PI/2)
 */
export function spinInFromNothingWithColor(
  mob: Mobject,
  pointColor: Color,
  angle: number = DEFAULT_SPIN_ANGLE,
  duration = 1,
  rateFunc?: RateFunction,
): SpinInFromNothingTrack {
  return new SpinInFromNothingTrack(mob, angle, pointColor, duration, rateFunc);
}
