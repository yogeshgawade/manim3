import type { AnimationTrack } from './AnimationTrack';
import type { VMobject } from '../core/VMobject';
import type { Mobject } from '../core/Mobject';
import type { RateFunction, Vec3 } from '../core/types';
import { MorphTrack } from './MorphTrack';
import { hungarian } from '../utils/hungarian';
import { lerpVec3 } from '../utils/svgPathConverter';

type Vec2 = [number, number];

/**
 * Compute the bounding box of a VMobject
 */
function getBoundingBox(vmobject: VMobject): {
  min: Vec3;
  max: Vec3;
  center: Vec3;
  size: Vec3;
} {
  const points = vmobject.points3D;
  if (points.length === 0) {
    const pos = vmobject.position;
    return {
      min: pos,
      max: pos,
      center: pos,
      size: [0, 0, 0],
    };
  }

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p[0]);
    minY = Math.min(minY, p[1]);
    minZ = Math.min(minZ, p[2]);
    maxX = Math.max(maxX, p[0]);
    maxY = Math.max(maxY, p[1]);
    maxZ = Math.max(maxZ, p[2]);
  }

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
    size: [maxX - minX, maxY - minY, maxZ - minZ],
  };
}

function cubicBezierPoint(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  const a = mt2 * mt;
  const b = 3 * mt2 * t;
  const c = 3 * mt * t2;
  const d = t * t2;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

function distance2D(a: Vec2, b: Vec2): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function normalizeSamples(samples: Vec2[]): Vec2[] {
  if (samples.length === 0) return [];

  let cx = 0;
  let cy = 0;
  for (const [x, y] of samples) {
    cx += x;
    cy += y;
  }
  cx /= samples.length;
  cy /= samples.length;

  const centered = samples.map(([x, y]) => [x - cx, y - cy] as Vec2);

  let scale = 0;
  for (const [x, y] of centered) {
    scale = Math.max(scale, Math.sqrt(x * x + y * y));
  }
  scale = Math.max(scale, 1e-6);

  return centered.map(([x, y]) => [x / scale, y / scale] as Vec2);
}

function resamplePolyline(points: Vec2[], sampleCount: number): Vec2[] {
  if (points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: sampleCount }, () => [...points[0]] as Vec2);

  const cumulative = [0];
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1] + distance2D(points[i - 1], points[i]));
  }

  const totalLength = cumulative[cumulative.length - 1];
  if (totalLength <= 1e-6) {
    return Array.from({ length: sampleCount }, () => [...points[0]] as Vec2);
  }

  const result: Vec2[] = [];
  let segmentIndex = 1;

  for (let i = 0; i < sampleCount; i++) {
    const targetLength = (i / sampleCount) * totalLength;
    while (segmentIndex < cumulative.length - 1 && cumulative[segmentIndex] < targetLength) {
      segmentIndex++;
    }

    const start = points[segmentIndex - 1];
    const end = points[segmentIndex];
    const segmentStart = cumulative[segmentIndex - 1];
    const segmentLength = Math.max(cumulative[segmentIndex] - segmentStart, 1e-6);
    const t = (targetLength - segmentStart) / segmentLength;

    result.push([
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
    ]);
  }

  return result;
}

function extractContourSamples(
  vmobject: VMobject,
  segmentSamples: number = 8,
  finalSamples: number = 48,
): Vec2[] {
  const points = vmobject.points3D;
  if (points.length < 4) {
    return points.map(([x, y]) => [x, y] as Vec2);
  }

  const dense: Vec2[] = [];
  const subpaths = vmobject.getSubpaths?.() || { lengths: [points.length], closed: [false] };
  const lengths = subpaths.lengths || [points.length];

  let offset = 0;
  for (const subpathLength of lengths) {
    const subpathEnd = Math.min(offset + subpathLength, points.length);
    if (offset >= subpathEnd) break;

    const subpathPoints = points.slice(offset, subpathEnd).map(([x, y]) => [x, y] as Vec2);
    if (subpathPoints.length >= 4) {
      let firstSegment = true;
      for (let i = 0; i + 3 < subpathPoints.length; i += 3) {
        const startStep = firstSegment ? 0 : 1;
        for (let step = startStep; step <= segmentSamples; step++) {
          dense.push(cubicBezierPoint(
            subpathPoints[i],
            subpathPoints[i + 1],
            subpathPoints[i + 2],
            subpathPoints[i + 3],
            step / segmentSamples,
          ));
        }
        firstSegment = false;
      }
    }

    offset = subpathEnd;
  }

  return resamplePolyline(dense, finalSamples);
}

function radialSignature(samples: Vec2[]): number[] {
  return samples.map(([x, y]) => Math.sqrt(x * x + y * y));
}

function angleSignature(samples: Vec2[]): number[] {
  if (samples.length < 3) return [];

  const result: number[] = [];
  const n = samples.length;
  for (let i = 0; i < n; i++) {
    const prev = samples[(i - 1 + n) % n];
    const curr = samples[i];
    const next = samples[(i + 1) % n];

    const v1x = curr[0] - prev[0];
    const v1y = curr[1] - prev[1];
    const v2x = next[0] - curr[0];
    const v2y = next[1] - curr[1];

    const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (len1 <= 1e-6 || len2 <= 1e-6) {
      result.push(0);
      continue;
    }

    const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
    result.push(Math.acos(Math.max(-1, Math.min(1, dot))) / Math.PI);
  }
  return result;
}

function bestCyclicSequenceDistance(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 1;

  let best = Infinity;
  const n = a.length;
  for (let shift = 0; shift < n; shift++) {
    let sumForward = 0;
    let sumReverse = 0;
    for (let i = 0; i < n; i++) {
      sumForward += Math.abs(a[i] - b[(i + shift) % n]);
      sumReverse += Math.abs(a[i] - b[(n - i + shift) % n]);
    }
    best = Math.min(best, sumForward / n, sumReverse / n);
  }
  return best;
}

function bestCyclicPointDistance(a: Vec2[], b: Vec2[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 1;

  let best = Infinity;
  const n = a.length;
  for (let shift = 0; shift < n; shift++) {
    let sumForward = 0;
    let sumReverse = 0;
    for (let i = 0; i < n; i++) {
      sumForward += distance2D(a[i], b[(i + shift) % n]);
      sumReverse += distance2D(a[i], b[(n - i + shift) % n]);
    }
    best = Math.min(best, sumForward / n, sumReverse / n);
  }
  return best;
}

/**
 * Calculate similarity between two shapes based on normalized contour geometry.
 * Returns a value in [0, 1] where 1 means highly similar outlines.
 */
function shapeSimilarity(a: VMobject, b: VMobject): number {
  const boxA = getBoundingBox(a);
  const boxB = getBoundingBox(b);

  const samplesA = normalizeSamples(extractContourSamples(a));
  const samplesB = normalizeSamples(extractContourSamples(b));

  const contourDistance = bestCyclicPointDistance(samplesA, samplesB);
  const radialDistance = bestCyclicSequenceDistance(radialSignature(samplesA), radialSignature(samplesB));
  const angleDistance = bestCyclicSequenceDistance(angleSignature(samplesA), angleSignature(samplesB));

  const contourSimilarity = Math.max(0, 1 - contourDistance);
  const radialSimilarity = Math.max(0, 1 - radialDistance);
  const angleSimilarity = Math.max(0, 1 - angleDistance);

  // Keep size as a weak secondary signal.
  const sizeA = Math.sqrt(boxA.size[0] ** 2 + boxA.size[1] ** 2);
  const sizeB = Math.sqrt(boxB.size[0] ** 2 + boxB.size[1] ** 2);
  const maxSize = Math.max(sizeA, sizeB, 0.001);
  const sizeSimilarity = 1 - Math.abs(sizeA - sizeB) / maxSize;

  return (
    contourSimilarity * 0.55 +
    radialSimilarity * 0.20 +
    angleSimilarity * 0.20 +
    sizeSimilarity * 0.05
  );
}

/**
 * Extracts all leaf VMobjects (with points3D) from a Mobject hierarchy.
 * Flattens the tree, skips pure VGroup containers, returns only renderable glyphs.
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
 * VGroupMorphTrack morphs between two groups of VMobjects using Hungarian matching.
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
  private fadeInClones: VMobject[] = [];
  private fadeOutMobs: VMobject[] = [];

  private sourceChildren: VMobject[] = [];
  private targetChildren: VMobject[] = [];

  private startGroupPos!: Vec3;
  private endGroupPos!: Vec3;
  private groupPosCaptured = false;
  private prepared = false;

  get mobject() {
    return this.sourceGroup;
  }

  get rateFunc(): RateFunction {
    return this.trackRateFunc;
  }

  get duration() {
    return this.trackDuration;
  }

  constructor(
    private sourceGroup: Mobject,
    private targetGroup: Mobject,
    private trackDuration: number = 1,
    private trackRateFunc: RateFunction = (t) => t,
  ) {}

  prepare(): void {
    for (const track of this.childTracks) track?.dispose();
    for (const track of this.fadeInTracks) track.dispose();
    for (const track of this.fadeOutTracks) track.dispose();
    // Remove fade-in clones and fade-out mobs added during previous animation runs
    for (const clone of this.fadeInClones) {
      this.sourceGroup.remove(clone);
    }
    for (const mob of this.fadeOutMobs) {
      this.sourceGroup.add(mob);
    }
    this.childTracks = [];
    this.fadeInTracks = [];
    this.fadeOutTracks = [];
    this.fadeInClones = [];
    this.fadeOutMobs = [];
    this.sourceChildren = [];
    this.targetChildren = [];
    this.groupPosCaptured = false;
    this.prepared = false;
  }

  captureStartState(): void {
    if (!this.prepared) {
      this.prepared = true;
      this.sourceChildren = getVMobjectChildren(this.sourceGroup);
      this.targetChildren = getVMobjectChildren(this.targetGroup);
      const costMatrix: number[][] = this.sourceChildren.map(src =>
        this.targetChildren.map(tgt =>
          1 - shapeSimilarity(src, tgt),
        )
      );

      const result = hungarian(costMatrix);

      for (let i = 0; i < this.sourceChildren.length; i++) {
        const j = result.assignments[i];
        if (j >= 0) {
          const track = new MorphTrack(
            this.sourceChildren[i],
            this.targetChildren[j],
            this.trackDuration, this.trackRateFunc,
          );
          track.prepare();
          this.childTracks.push(track);
        } else {
          const track = this.createFadeOut(this.sourceChildren[i]);
          track.prepare();
          this.fadeOutTracks.push(track);
        }
      }

      for (let j = 0; j < this.targetChildren.length; j++) {
        if (!result.assignedCols.has(j)) {
          const track = this.createFadeIn(this.targetChildren[j]);
          track.prepare();
          this.fadeInTracks.push(track);
        }
      }
    }

    if (!this.groupPosCaptured) {
      this.startGroupPos = [...this.sourceGroup.position] as Vec3;
      this.endGroupPos = [...this.targetGroup.position] as Vec3;
      this.groupPosCaptured = true;
    }
    for (const track of this.childTracks) track?.captureStartState?.();
    for (const track of this.fadeInTracks) track.captureStartState?.();
    for (const track of this.fadeOutTracks) track.captureStartState?.();
  }

  interpolate(alpha: number): void {
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
    this.fadeInClones = [];
    this.fadeOutMobs = [];
  }

  /**
   * Fade in an unmatched target glyph (was not present in source group).
   * Captures actual opacity at prepare() time, never forces a value.
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
          this.fadeInClones.push(clone);
        }
        // Reset so positions are recalculated on first interpolate
        positionCaptured = false;
        clone.opacity = 0;
        clone.markDirty();
      },
      captureStartState: () => {
        if (!clone || positionCaptured) return;
        const matched = this.sourceChildren;
        startLocalPos = matched.length > 0 ? matched.reduce((acc, m) => [
          acc[0] + m.position[0] / matched.length,
          acc[1] + m.position[1] / matched.length,
          acc[2] + m.position[2] / matched.length,
        ], [0, 0, 0]) as Vec3 : [0, 0, 0] as Vec3;
        positionCaptured = true;
      },
      interpolate: (alpha: number) => {
        if (!clone) return;
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
        // clone stays in sourceGroup, it's now part of the morphed expression
      },
    };
  }

  /**
   * Fade out an unmatched source glyph (has no corresponding target).
   * Captures actual opacity at first interpolate() call, never forces a value.
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
      captureStartState: () => {
        if (opacityCaptured) return;
        capturedOpacity = mob.opacity;
        startLocalPos = [...mob.position] as Vec3;
        opacityCaptured = true;
      },
      interpolate: (alpha: number) => {
        // Fade out
        mob.opacity = capturedOpacity * (1 - alpha);
        // Move from start position toward group center [0, 0, 0] in local space
        mob.position = [
          startLocalPos[0] * (1 - alpha),
          startLocalPos[1] * (1 - alpha),
          startLocalPos[2] * (1 - alpha),
        ] as Vec3;
        mob.markDirty();
        // Remove from sourceGroup when animation completes
        if (alpha >= 0.999) {
          this.sourceGroup.remove(mob);
          this.fadeOutMobs.push(mob);
        }
      },
      dispose: () => { },
    };
  }
}
