import { BaseAnimationTrack } from './AnimationTrack';
import type { Mobject } from '../core/Mobject';
import type { RateFunction, Vec3 } from '../core/types';

const TAU = Math.PI * 2;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function subVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scaleVec3(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

interface SubMobjectState {
  mobject: Mobject;
  finalPosition: Vec3;
  initialPosition: Vec3;
  finalRotation: Vec3;
  finalFillOpacity: number;
  finalStrokeOpacity: number;
  finalOpacity: number;
}

export class SpiralInTrack extends BaseAnimationTrack {
  private scaleFactor: number;
  private fadeInFraction: number;
  private groupCenter: Vec3 | null = null;
  private subStates: SubMobjectState[] = [];
  private _prepared = false;
  private _initialized = false;

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

  prepare(): void {
    this._prepared = false;
    this._initialized = false;
    this.groupCenter = null;
    this.subStates = [];
  }

  captureStartState(): void {
    if (this._prepared) return;
    this._prepared = true;
    this.groupCenter = this.mobject.getCenter();

    const family = this.mobject.getFamily();
    const subMobjects: Mobject[] = [];
    for (const member of family) {
      if (member !== this.mobject) {
        subMobjects.push(member);
      }
    }

    if (subMobjects.length === 0) {
      subMobjects.push(this.mobject);
    }

    for (const mob of subMobjects) {
      const finalPosition = [...mob.position] as Vec3;
      const offset = subVec3(finalPosition, this.groupCenter);
      const scaledOffset = scaleVec3(offset, this.scaleFactor);
      const initialPosition = addVec3(finalPosition, scaledOffset);

      this.subStates.push({
        mobject: mob,
        finalPosition,
        initialPosition,
        finalRotation: [...mob.rotation] as Vec3,
        finalFillOpacity: (mob as any).fillOpacity ?? 0,
        finalStrokeOpacity: (mob as any).strokeOpacity ?? 1,
        finalOpacity: 1,
      });
    }
  }

  interpolate(alpha: number): void {
    if (!this._prepared || this.groupCenter === null) {
      return;
    }

    const adjustedAlpha = this.rateFunc(alpha);

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
        mob.opacity = 0;
        mob.markDirty();
      }
    }

    for (const state of this.subStates) {
      const mob = state.mobject;

      mob.position = lerpVec3(state.initialPosition, state.finalPosition, adjustedAlpha);

      const posOffset = subVec3(mob.position, this.groupCenter);
      const cosA = Math.cos(TAU * adjustedAlpha);
      const sinA = Math.sin(TAU * adjustedAlpha);
      const rotatedOffset: Vec3 = [
        posOffset[0] * cosA - posOffset[1] * sinA,
        posOffset[0] * sinA + posOffset[1] * cosA,
        posOffset[2],
      ];

      mob.position = addVec3(this.groupCenter, rotatedOffset);
      mob.rotation = [
        state.finalRotation[0],
        state.finalRotation[1],
        state.finalRotation[2] - TAU * adjustedAlpha,
      ];

      const fadeAlpha = Math.min(1, adjustedAlpha / this.fadeInFraction);
      (mob as any).fillOpacity = lerp(0, state.finalFillOpacity, fadeAlpha);
      (mob as any).strokeOpacity = lerp(0, state.finalStrokeOpacity, fadeAlpha);
      mob.opacity = lerp(0, state.finalOpacity, fadeAlpha);

      mob.markDirty();
    }
  }

  dispose(): void {}
}

export function spiralIn(
  mobject: Mobject,
  scaleFactor: number = 8,
  fadeInFraction: number = 0.3,
  duration: number = 2,
  rateFunc?: RateFunction,
): SpiralInTrack {
  return new SpiralInTrack(mobject, scaleFactor, fadeInFraction, duration, rateFunc);
}
