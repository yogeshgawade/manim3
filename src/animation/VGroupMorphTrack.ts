import type { AnimationTrack } from './AnimationTrack';
import type { VMobject } from '../core/VMobject';
import type { Mobject } from '../core/Mobject';
import type { RateFunction } from '../core/types';
import { MorphTrack } from './MorphTrack';

/**
 * Extracts all leaf VMobjects (with points3D) from a Mobject hierarchy.
 * Flattens the tree — skips pure VGroup containers, returns only renderable glyphs.
 */
function getVMobjectChildren(mob: Mobject): VMobject[] {
  const result: VMobject[] = [];
  for (const child of mob.children) {
    const vmob = child as VMobject;
    if (vmob.points3D && vmob.points3D.length > 0) {
      result.push(vmob);
    }
    // Recurse into nested groups
    result.push(...getVMobjectChildren(child));
  }
  return result;
}

/**
 * Greedy Hungarian-style matching between source and target VMobjects.
 * Matches by shape similarity (size + point count + spatial proximity).
 * Lower cost = better match.
 */
export function hungarianMatching(
  sources: VMobject[],
  targets: VMobject[],
): Map<number, number> {
  const n = Math.max(sources.length, targets.length);
  const costMatrix: number[][] = [];

  for (let i = 0; i < sources.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < targets.length; j++) {
      row.push(computeSimilarityCost(sources[i], targets[j]));
    }
    while (row.length < n) row.push(1000);
    costMatrix.push(row);
  }

  while (costMatrix.length < n) {
    costMatrix.push(Array(n).fill(1000));
  }

  const matches = new Map<number, number>();
  const usedTargets = new Set<number>();

  for (let i = 0; i < sources.length; i++) {
    let bestJ = -1;
    let bestCost = Infinity;
    for (let j = 0; j < targets.length; j++) {
      if (!usedTargets.has(j) && costMatrix[i][j] < bestCost) {
        bestCost = costMatrix[i][j];
        bestJ = j;
      }
    }
    if (bestJ >= 0) {
      matches.set(i, bestJ);
      usedTargets.add(bestJ);
    }
  }

  return matches;
}

function computeSimilarityCost(a: VMobject, b: VMobject): number {
  const boundsA = getBounds(a.points3D);
  const boundsB = getBounds(b.points3D);
  const sizeDiff = Math.abs(boundsA.width - boundsB.width) +
    Math.abs(boundsA.height - boundsB.height);
  const countDiff = Math.abs(a.points3D.length - b.points3D.length) * 0.1;
  const dx = a.position[0] - b.position[0];
  const dy = a.position[1] - b.position[1];
  const distance = Math.sqrt(dx * dx + dy * dy) * 0.01;
  return sizeDiff + countDiff + distance;
}

function getBounds(points: number[][]): { width: number; height: number } {
  if (points.length === 0) return { width: 0, height: 0 };
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

/**
 * VGroupMorphTrack — Morphs between two groups of VMobjects using Hungarian matching.
 *
 * - Matched pairs: MorphTrack (shape + opacity interpolation)
 * - Unmatched sources: fade out (opacity captured at prepare time, not forced)
 * - Unmatched targets: fade in  (opacity captured at prepare time, not forced)
 *
 * prepare() is idempotent and safe to call multiple times (no _prepared guard),
 * so scrub/seek re-initializes all child tracks correctly.
 */
export class VGroupMorphTrack implements AnimationTrack {
  id = crypto.randomUUID();
  remover = false;

  private childTracks: (MorphTrack | null)[] = [];
  private fadeInTracks: AnimationTrack[] = [];
  private fadeOutTracks: AnimationTrack[] = [];

  private sourceChildren: VMobject[];
  private targetChildren: VMobject[];

  get mobject() {
    // Return first source child as representative mobject
    return this.sourceChildren[0] as unknown as Mobject;
  }

  get duration() {
    return Math.max(
      ...this.childTracks.map(t => t?.duration ?? 0),
      ...this.fadeInTracks.map(t => t.duration),
      ...this.fadeOutTracks.map(t => t.duration),
      0,
    );
  }

  get rateFunc() {
    return (t: number) => t;
  }

  constructor(
    private sourceGroup: Mobject,
    private targetGroup: Mobject,
    private trackDuration: number = 1,
    private trackRateFunc: RateFunction = (t) => t,
  ) {
    this.sourceChildren = getVMobjectChildren(sourceGroup);
    this.targetChildren = getVMobjectChildren(targetGroup);

    const matches = hungarianMatching(this.sourceChildren, this.targetChildren);

    // Matched pairs → MorphTrack
    for (const [srcIdx, tgtIdx] of matches) {
      const src = this.sourceChildren[srcIdx];
      const tgt = this.targetChildren[tgtIdx];
      if (src && tgt) {
        this.childTracks.push(new MorphTrack(src, tgt, this.trackDuration, this.trackRateFunc));
      }
    }

    // Unmatched sources → fade out
    const matchedSources = new Set(matches.keys());
    for (let i = 0; i < this.sourceChildren.length; i++) {
      if (!matchedSources.has(i)) {
        this.fadeOutTracks.push(this.createFadeOut(this.sourceChildren[i]));
      }
    }

    // Unmatched targets → fade in
    const matchedTargets = new Set(matches.values());
    for (let i = 0; i < this.targetChildren.length; i++) {
      if (!matchedTargets.has(i)) {
        this.fadeInTracks.push(this.createFadeIn(this.targetChildren[i]));
      }
    }
  }

  prepare(): void {
    // No _prepared guard — safe to call multiple times.
    // MorphTrack.prepare() tears down and rebuilds its GSAP tween each time.
    // fadeIn/fadeOut inline tracks capture opacity fresh each time.
    for (const track of this.childTracks) track?.prepare();
    for (const track of this.fadeInTracks) track.prepare();
    for (const track of this.fadeOutTracks) track.prepare();
  }

  interpolate(alpha: number): void {
    for (const track of this.childTracks) track?.interpolate(alpha);
    for (const track of this.fadeInTracks) track.interpolate(alpha);
    for (const track of this.fadeOutTracks) track.interpolate(alpha);
  }

  dispose(): void {
    for (const track of this.childTracks) track?.dispose();
    for (const track of this.fadeInTracks) track.dispose();
    for (const track of this.fadeOutTracks) track.dispose();
    this.childTracks = [];
    this.fadeInTracks = [];
    this.fadeOutTracks = [];
  }

  /**
   * Fade in an unmatched target glyph (was not present in source group).
   * Captures actual opacity at prepare() time — never forces a value.
   * This avoids flashing glyphs visible for one frame before the animation starts.
   */
  private createFadeIn(mob: VMobject): AnimationTrack {
    let clone: VMobject | null = null;
    let capturedOpacity = 0;

    return {
      id: crypto.randomUUID(),
      mobject: mob,
      duration: this.trackDuration,
      rateFunc: this.trackRateFunc,
      remover: false,
      prepare: () => {
        if (!clone) {
          // First time — create clone and add to scene
          clone = mob.copy() as VMobject;
          this.sourceGroup.add(clone);
        }
        // Always reset opacity — works for first play AND replay
        clone.opacity = 0;
        clone.markDirty();
        capturedOpacity = 0;
      },
      interpolate: (alpha: number) => {
        if (!clone) return;
        clone.opacity = capturedOpacity + (1 - capturedOpacity) * alpha;
        clone.markDirty();
      },
      dispose: () => {
        if (clone) {
          this.sourceGroup.remove?.(clone);
          clone = null;
        }
      },
    };
  }

  /**
   * Fade out an unmatched source glyph (has no corresponding target).
   * Captures actual opacity at prepare() time — never forces a value.
   * This avoids flashing glyphs visible (opacity=1) for one frame on addTrack.
   */
  private createFadeOut(mob: VMobject): AnimationTrack {
    let capturedOpacity = 1;
    return {
      id: crypto.randomUUID(),
      mobject: mob,
      duration: this.trackDuration,
      rateFunc: this.trackRateFunc,
      remover: true,
      prepare: () => {
        // Read current opacity — don't force to 1
        capturedOpacity = mob.opacity;
      },
      interpolate: (alpha: number) => {
        mob.opacity = capturedOpacity * (1 - alpha);
        mob.markDirty();
      },
      dispose: () => { },
    };
  }
}