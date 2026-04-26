import type { AnimationTrack } from './AnimationTrack';
import type { VMobject } from '../core/VMobject';
import type { Mobject } from '../core/Mobject';
import type { RateFunction, Vec3 } from '../core/types';
import { MorphTrack } from './MorphTrack';
import { hungarian } from '../utils/hungarian';
import { lerpVec3 } from '../utils/svgPathConverter';

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
 * VGroupMorphTrack — Morphs between two groups of VMobjects using Hungarian matching.
 *
 * - Matched pairs: MorphTrack (shape + opacity interpolation)
 * - Unmatched sources: fade out (opacity captured at first interpolate() call, not forced)
 * - Unmatched targets: fade in  (opacity starts at 0, no forced initial value)
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

  private startGroupPos!: Vec3;
  private endGroupPos!: Vec3;
  private groupPosCaptured = false;

  get mobject() {
    // Return first source child as representative mobject
    return this.sourceChildren[0] as unknown as Mobject;
  }

  get rateFunc(): RateFunction {
    return this.trackRateFunc;
  }

  get duration() {
    return Math.max(
      ...this.childTracks.map(t => t?.duration ?? 0),
      ...this.fadeInTracks.map(t => t.duration),
      ...this.fadeOutTracks.map(t => t.duration),
      0,
    );
  }

  constructor(
    private sourceGroup: Mobject,
    private targetGroup: Mobject,
    private trackDuration: number = 1,
    private trackRateFunc: RateFunction = (t) => t,
  ) {
    this.sourceChildren = getVMobjectChildren(sourceGroup);
    this.targetChildren = getVMobjectChildren(targetGroup);

    // Build cost matrix using point count difference (shape identity)
    const costMatrix: number[][] = this.sourceChildren.map(src =>
      this.targetChildren.map(tgt =>
        Math.abs(src.points3D.length - tgt.points3D.length)
      )
    );

    const result = hungarian(costMatrix);

    // Matched pairs → MorphTrack (pure local space, no offsets)
    for (let i = 0; i < this.sourceChildren.length; i++) {
      const j = result.assignments[i];
      if (j >= 0) {
        this.childTracks.push(new MorphTrack(
          this.sourceChildren[i],
          this.targetChildren[j],
          this.trackDuration, this.trackRateFunc,
        ));
      } else {
        this.fadeOutTracks.push(this.createFadeOut(this.sourceChildren[i]));
      }
    }

    // Unmatched targets → fade in
    for (let j = 0; j < this.targetChildren.length; j++) {
      if (!result.assignedCols.has(j)) {
        this.fadeInTracks.push(this.createFadeIn(this.targetChildren[j]));
      }
    }
  }

  prepare(): void {
    // Reset group position capture flag for scrub/seek support
    this.groupPosCaptured = false;
    for (const track of this.childTracks) track?.prepare();
    for (const track of this.fadeInTracks) track.prepare();
    for (const track of this.fadeOutTracks) track.prepare();
  }

  interpolate(alpha: number): void {
    // Capture group positions lazily on first call
    if (!this.groupPosCaptured) {
      this.startGroupPos = [...this.sourceGroup.position] as Vec3;
      this.endGroupPos = [...this.targetGroup.position] as Vec3;
      this.groupPosCaptured = true;
    }
    // Animate sourceGroup position toward targetGroup position
    this.sourceGroup.position = lerpVec3(this.startGroupPos, this.endGroupPos, alpha);
    this.sourceGroup.markDirty();

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

    // Target local position of this glyph within targetGroup (frozen at construction)
    const targetLocalPos: Vec3 = [...mob.position] as Vec3;

    // Positions captured lazily in interpolate()
    let startLocalPos: Vec3 = [0, 0, 0];
    let positionCaptured = false;

    return {
      id: crypto.randomUUID(),
      mobject: mob,
      duration: this.trackDuration,
      rateFunc: this.trackRateFunc,
      remover: false,
      prepare: () => {
        if (!clone) {
          clone = mob.copy() as VMobject;
          this.sourceGroup.add(clone);
        }
        // Reset so positions are recalculated on first interpolate
        positionCaptured = false;
        clone.opacity = 0;
        clone.markDirty();
      },
      interpolate: (alpha: number) => {
        if (!clone) return;
        if (!positionCaptured) {
          // Start from average position of source children in local space
          const matched = this.sourceChildren;
          startLocalPos = matched.length > 0 ? matched.reduce((acc, m) => [
            acc[0] + m.position[0] / matched.length,
            acc[1] + m.position[1] / matched.length,
            acc[2] + m.position[2] / matched.length,
          ], [0, 0, 0]) as Vec3 : [0, 0, 0] as Vec3;
          positionCaptured = true;
        }
        clone.opacity = alpha;
        // Lerp from startLocalPos to targetLocalPos (both in local space)
        clone.position = [
          startLocalPos[0] + (targetLocalPos[0] - startLocalPos[0]) * alpha,
          startLocalPos[1] + (targetLocalPos[1] - startLocalPos[1]) * alpha,
          startLocalPos[2] + (targetLocalPos[2] - startLocalPos[2]) * alpha,
        ] as Vec3;
        clone.markDirty();
      },
      dispose: () => {
        // clone stays in sourceGroup — it's now part of the morphed expression
      },
    };
  }

  /**
   * Fade out an unmatched source glyph (has no corresponding target).
   * Captures actual opacity at first interpolate() call — never forces a value.
   * Moves the glyph from its current position toward the target group center while fading out.
   */
  private createFadeOut(mob: VMobject): AnimationTrack {
    let capturedOpacity = 1;
    let opacityCaptured = false;
    let startLocalPos: Vec3 = [0, 0, 0];

    return {
      id: crypto.randomUUID(),
      mobject: mob,
      duration: this.trackDuration,
      rateFunc: this.trackRateFunc,
      remover: false,
      prepare: () => {
        // Reset flag so opacity is re-captured on first interpolate() call.
        opacityCaptured = false;
      },
      interpolate: (alpha: number) => {
        // Capture opacity and position on first call (when alpha is 0).
        if (!opacityCaptured) {
          capturedOpacity = mob.opacity;
          startLocalPos = [...mob.position] as Vec3;
          opacityCaptured = true;
        }
        // Fade out
        mob.opacity = capturedOpacity * (1 - alpha);
        // Move from start position toward group center [0, 0, 0] in local space
        mob.position = [
          startLocalPos[0] * (1 - alpha),
          startLocalPos[1] * (1 - alpha),
          startLocalPos[2] * (1 - alpha),
        ] as Vec3;
        mob.markDirty();
      },
      dispose: () => { },
    };
  }
}