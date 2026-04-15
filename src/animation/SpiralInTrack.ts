/**
 * SpiralInTrack.ts
 * SpiralIn animation - objects fly in on spiral trajectories
 * Ported from Python Manim's SpiralIn
 */

import { BaseAnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { Group } from '../core/Group';
import type { RateFunction, Vec3 } from '../core/types';

const TAU = Math.PI * 2;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/**
 * Compute vector subtraction: a - b
 */
function subVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/**
 * Compute vector addition: a + b
 */
function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/**
 * Scale a vector by a scalar
 */
function scaleVec3(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/**
 * Store for each sub-mobject's animation state
 */
interface SubMobjectState {
  mobject: Mobject;
  finalPosition: Vec3;
  initialPosition: Vec3;
  finalRotation: Vec3;
  initialFillOpacity: number;
  initialStrokeOpacity: number;
}

/**
 * SpiralInTrack - Creates mobjects by flying them in on spiral trajectories.
 * Sub-mobjects start far from center and spiral inward while rotating.
 */
export class SpiralInTrack extends BaseAnimationTrack {
  private scaleFactor: number;
  private fadeInFraction: number;
  private groupCenter: Vec3 | null = null;
  private subStates: SubMobjectState[] = [];
  private _prepared = false;

  constructor(
    mobject: Mobject,
    scaleFactor: number = 8,
    fadeInFraction: number = 0.3,
    duration: number = 2,
    rateFunc: RateFunction = (t: number) => t,
  ) {
    super(mobject, duration, rateFunc);
    this.scaleFactor = scaleFactor;
    this.fadeInFraction = fadeInFraction;
  }

  private _initialized = false;

  prepare(): void {
    if (this._prepared) return;
    this._prepared = true;

    // Get group center
    this.groupCenter = this.mobject.getCenter();

    // Get all sub-mobjects (family members excluding self)
    const family = this.mobject.getFamily();
    const subMobjects: Mobject[] = [];
    for (const member of family) {
      if (member !== this.mobject) {
        subMobjects.push(member);
      }
    }

    // If no sub-mobjects, treat the main mobject as the only one
    if (subMobjects.length === 0) {
      subMobjects.push(this.mobject);
    }

    // Prepare state for each sub-mobject (capture only, don't modify yet)
    for (const mob of subMobjects) {
      const finalPosition = [...mob.position] as Vec3;

      // initialPosition = finalPosition + (finalPosition - groupCenter) * scaleFactor
      const offset = subVec3(finalPosition, this.groupCenter!);
      const scaledOffset = scaleVec3(offset, this.scaleFactor);
      const initialPosition = addVec3(finalPosition, scaledOffset);

      // Store state
      this.subStates.push({
        mobject: mob,
        finalPosition,
        initialPosition,
        finalRotation: [...mob.rotation] as Vec3,
        initialFillOpacity: (mob as any).fillOpacity ?? 0,
        initialStrokeOpacity: (mob as any).strokeOpacity ?? 1,
      });
    }
  }

  interpolate(alpha: number): void {
    const adjustedAlpha = this.rateFunc(alpha);

    // On first frame, apply initial state (far positions, rotated, invisible)
    if (!this._initialized) {
      this._initialized = true;
      for (const state of this.subStates) {
        const mob = state.mobject;
        mob.position = [...state.initialPosition] as Vec3;
        mob.rotation = [
          state.finalRotation[0],
          state.finalRotation[1],
          state.finalRotation[2] + TAU,
        ];
        (mob as any).fillOpacity = 0;
        (mob as any).strokeOpacity = 0;
        mob.markDirty();
      }
    }

    for (const state of this.subStates) {
      const mob = state.mobject;

      // 1. Position: lerp from initial to final
      mob.position = lerpVec3(state.initialPosition, state.finalPosition, adjustedAlpha);

      // 2. Rotate around group center by TAU * alpha
      // This creates the spiral effect
      const groupCenter = this.groupCenter!;
      const posOffset = subVec3(mob.position, groupCenter);

      // Rotate the offset around Z axis
      const cosA = Math.cos(TAU * adjustedAlpha);
      const sinA = Math.sin(TAU * adjustedAlpha);
      const rotatedOffset: Vec3 = [
        posOffset[0] * cosA - posOffset[1] * sinA,
        posOffset[0] * sinA + posOffset[1] * cosA,
        posOffset[2],
      ];

      // Apply rotated position
      mob.position = addVec3(groupCenter, rotatedOffset);

      // 3. Self-rotation: rotate around own center by -TAU * alpha
      mob.rotation = [
        state.finalRotation[0],
        state.finalRotation[1],
        state.finalRotation[2] - TAU * adjustedAlpha,
      ];

      // 4. Fade in during fadeInFraction of animation
      const fadeAlpha = Math.min(1, adjustedAlpha / this.fadeInFraction);
      (mob as any).fillOpacity = lerp(0, state.initialFillOpacity, fadeAlpha);
      (mob as any).strokeOpacity = lerp(0, state.initialStrokeOpacity, fadeAlpha);

      mob.markDirty();
    }
  }

  dispose(): void {
    // No cleanup needed
  }
}

// Factory function
export function spiralIn(
  mobject: Mobject,
  scaleFactor: number = 8,
  fadeInFraction: number = 0.3,
  duration: number = 2,
  rateFunc?: RateFunction,
): SpiralInTrack {
  return new SpiralInTrack(mobject, scaleFactor, fadeInFraction, duration, rateFunc);
}
