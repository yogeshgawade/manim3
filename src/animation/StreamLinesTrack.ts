import { BaseAnimationTrack } from './AnimationTrack';
import type { RateFunction } from '../core/types';
import type { StreamLines } from '../mobjects/graphing/StreamLines';
import { getPartialBezierPoints } from '../mobjects/graphing/StreamLines';

export interface StreamLinesAnimateOptions {
  /** Total animation duration in seconds. Default: virtualTime */
  duration?: number;
  /** Rate function. Default: linear */
  rateFunc?: RateFunction;
  /** Visible window fraction (0-1). Default: 0.3 */
  timeWidth?: number;
  /** Flow speed multiplier. Default: 1 */
  flowSpeed?: number;
  /** Stagger phase offsets so lines don't all start together. Default: true */
  stagger?: boolean;
}

export class StreamLinesTrack extends BaseAnimationTrack {
  private _sl: StreamLines;
  private _timeWidth: number;
  private _flowSpeed: number;
  private _offsets: number[] = [];         // per-line phase offset (0-1 of virtualTime)
  private _origPoints: number[][][] = [];  // snapshot taken at prepare()
  private _prepared = false;

  constructor(streamLines: StreamLines, options: StreamLinesAnimateOptions = {}) {
    const {
      duration,
      rateFunc = (t) => t,
      timeWidth = 0.3,
      flowSpeed = 1,
      stagger = true,
    } = options;

    // Default duration = virtualTime so one pass = one full flow cycle
    super(streamLines, duration ?? streamLines.virtualTime, rateFunc);

    this._sl = streamLines;
    this._timeWidth = timeWidth;
    this._flowSpeed = flowSpeed;

    // Bake random offsets NOW (constructor), so they're stable across
    // prepare() calls (replay-safe — same offsets every time)
    const n = (streamLines as any)._streamlineVMobjects?.length ?? 0;
    for (let i = 0; i < n; i++) {
      // Spread lines across the full virtualTime so they don't all
      // appear at the same moment
      this._offsets[i] = stagger ? i / Math.max(n - 1, 1) : 0;
    }
  }

  prepare(): void {
    if (this._prepared) return;
    this._prepared = true;

    // Snapshot the fully-integrated Bezier points for every line
    const vmobs: any[] = (this._sl as any)._streamlineVMobjects ?? [];
    this._origPoints = vmobs.map((v) =>
      v ? v.points3D.map((p: number[]) => [...p]) : []
    );

    // Hide all lines initially — interpolate(0) will show them
    for (const v of vmobs) {
      if (v) {
        v.opacity = 0;
        v.markDirty();
      }
    }
  }

  interpolate(alpha: number): void {
    const vmobs: any[] = (this._sl as any)._streamlineVMobjects ?? [];
    const vt = this._sl.virtualTime;

    for (let i = 0; i < vmobs.length; i++) {
      const vmob = vmobs[i];
      const orig = this._origPoints[i];
      if (!vmob || !orig || orig.length < 4) continue;

      // Map global alpha → per-line local phase
      // phase runs 0→1 over one virtualTime cycle, offset by stagger
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

    // Restore all lines to full static state
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

// Factory
export function animateStreamLines(
  sl: StreamLines,
  options?: StreamLinesAnimateOptions
): StreamLinesTrack {
  return new StreamLinesTrack(sl, options);
}
