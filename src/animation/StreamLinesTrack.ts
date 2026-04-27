import { BaseAnimationTrack } from './AnimationTrack';
import type { RateFunction } from '../core/types';
import type { StreamLines } from '../mobjects/graphing/StreamLines';
import { getPartialBezierPoints } from '../mobjects/graphing/StreamLines';

export interface StreamLinesAnimateOptions {
  duration?: number;
  rateFunc?: RateFunction;
  timeWidth?: number;
  flowSpeed?: number;
  stagger?: boolean;
}

export class StreamLinesTrack extends BaseAnimationTrack {
  private _sl: StreamLines;
  private _timeWidth: number;
  private _flowSpeed: number;
  private _offsets: number[] = [];
  private _origPoints: number[][][] = [];
  private _prepared = false;

  constructor(streamLines: StreamLines, options: StreamLinesAnimateOptions = {}) {
    const {
      duration,
      rateFunc = (t) => t,
      timeWidth = 0.3,
      flowSpeed = 1,
      stagger = true,
    } = options;

    super(streamLines, duration ?? streamLines.virtualTime, rateFunc);

    this._sl = streamLines;
    this._timeWidth = timeWidth;
    this._flowSpeed = flowSpeed;

    const n = (streamLines as any)._streamlineVMobjects?.length ?? 0;
    for (let i = 0; i < n; i++) {
      this._offsets[i] = stagger ? i / Math.max(n - 1, 1) : 0;
    }
  }

  prepare(): void {
    this._prepared = false;
    this._origPoints = [];
  }

  captureStartState(): void {
    if (this._prepared) return;
    this._prepared = true;

    const vmobs: any[] = (this._sl as any)._streamlineVMobjects ?? [];
    this._origPoints = vmobs.map((v) =>
      v ? v.points3D.map((p: number[]) => [...p]) : []
    );

    for (const v of vmobs) {
      if (v) {
        v.opacity = 0;
        v.markDirty();
      }
    }
  }

  interpolate(alpha: number): void {
    const vmobs: any[] = (this._sl as any)._streamlineVMobjects ?? [];

    for (let i = 0; i < vmobs.length; i++) {
      const vmob = vmobs[i];
      const orig = this._origPoints[i];
      if (!vmob || !orig || orig.length < 4) continue;

      const rawPhase = (alpha * this._flowSpeed + this._offsets[i]) % 1;

      const upper = Math.min(rawPhase * (1 + this._timeWidth), 1);
      const lower = Math.max(upper - this._timeWidth, 0);

      if (upper <= lower || rawPhase <= 0) {
        vmob.opacity = 0;
        vmob.markDirty();
        continue;
      }

      const partial = getPartialBezierPoints(orig, lower, upper);
      if (partial.length < 4) {
        vmob.opacity = 0;
        vmob.markDirty();
        continue;
      }

      vmob.setPoints3D(partial);
      vmob.opacity = (this._sl as any)._opacity ?? 1;
      vmob.markDirty();
    }
  }

  dispose(): void {
    this._prepared = false;

    const vmobs: any[] = (this._sl as any)._streamlineVMobjects ?? [];
    for (let i = 0; i < vmobs.length; i++) {
      const vmob = vmobs[i];
      if (!vmob) continue;
      if (this._origPoints[i]?.length > 0) {
        vmob.setPoints3D(this._origPoints[i]);
      }
      vmob.opacity = (this._sl as any)._opacity ?? 1;
      vmob.markDirty();
    }
    this._origPoints = [];
  }
}

export function animateStreamLines(
  sl: StreamLines,
  options?: StreamLinesAnimateOptions
): StreamLinesTrack {
  return new StreamLinesTrack(sl, options);
}
