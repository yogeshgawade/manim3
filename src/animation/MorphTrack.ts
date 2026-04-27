import { BaseAnimationTrack } from './AnimationTrack';
import type { VMobject } from '../core/VMobject';
import type { RateFunction, Vec3 } from '../core/types';
import { gsap } from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { lerp, lerpColor, lerpVec3 } from '../utils/svgPathConverter';

// Register GSAP plugin
gsap.registerPlugin(MorphSVGPlugin);

/**
 * MorphTrack – Uses GSAP MorphSVGPlugin with live render callback (like manim-web).
 *
 * Strategy:
 * 1. Convert both shapes to SVG paths directly from 3D points
 * 2. Create GSAP tween with morphSVG.render callback
 * 3. In render callback, convert rawPath to VMobject points
 * 4. Update source points and interpolate rotation/position/scale/opacity
 *
 * Scrubbing safety:
 * - prepare() always kills + recreates the tween and DOM node (safe to call multiple times)
 * - interpolate() calls tween.render() with force=true to flush GSAP synchronously
 * - startOpacity is captured in prepare() after a one-frame delay via a flag
 * - dispose() removes the temp DOM node and kills the tween
 */
export class MorphTrack extends BaseAnimationTrack {
  private startRotation!: Vec3;
  private endRotation: Vec3;
  private startPosition!: Vec3;
  private endPosition: Vec3;
  private startScale!: Vec3;
  private endScale: Vec3;
  private startOpacity: number = 1;
  private endOpacity: number;
  private startColor!: string;
  private endColor: string;
  private startFillColor!: string;
  private endFillColor: string;
  private startFillOpacity!: number;
  private endFillOpacity: number;
  private target: VMobject;

  private gsapTween: gsap.core.Tween | null = null;
  private tempPath: SVGPathElement | null = null;
  private startPath: string = '';
  private endPath: string = '';

  // Flag: capture all start-state (opacity, rotation, position, scale, color) lazily
  // on the very first interpolate() call, so prior animations are respected.
  private startCaptured: boolean = false;

  constructor(
    source: VMobject,
    target: VMobject,
    duration: number = 1,
    rateFunc: RateFunction = (t) => t,
  ) {
    super(source, duration, rateFunc);
    this.target = target;
    this.endRotation = [...target.rotation];
    this.endPosition = [...target.position];
    this.endScale = [...(target.scale || [1, 1, 1])];
    this.endOpacity = target.opacity;
    this.endColor = target.color ?? '#ffffff';
    this.endFillColor = (target as any).fillColor ??  this.endColor;
    this.endFillOpacity = (target as any).fillOpacity ?? 0;
  }

  prepare(): void {
    // --- Teardown any previous state (safe to call on re-seek) ---
    if (this.gsapTween) {
      this.gsapTween.kill();
      this.gsapTween = null;
    }
    if (this.tempPath) {
      this.tempPath.remove();
      this.tempPath = null;
    }
    this.startCaptured = false;
  }

  interpolate(alpha: number): void {
    // Build tween on first interpolate() call to capture fresh source state.
    // This ensures chained morphs start from the actual post-morph state.
    if (!this.startCaptured) {
      const source = this.mobject as VMobject;
      this.startOpacity  = source.opacity;
      this.startRotation = [...source.rotation] as Vec3;
      this.startPosition = [...source.position] as Vec3;
      this.startScale    = [...(source.scale || [1, 1, 1])] as Vec3;
      this.startColor    = source.color ?? '#ffffff';
      this.startFillColor = (source as any).fillColor ??  this.startColor;
      this.startFillOpacity = (source as any).fillOpacity ?? 0;
      this.endOpacity    = 1;

      // Build paths from actual current source state (pure local space, no offsets)
      this.startPath = this.pointsToSvgPath(source);
      this.endPath   = this.pointsToSvgPath(this.target);

      // Create hidden SVG path element for GSAP
      this.tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      this.tempPath.setAttribute('d', this.startPath);
      this.tempPath.style.display = 'none';
      document.body.appendChild(this.tempPath);

      // Build the render callback
      const onRender = (rawPath: Array<{ closed: boolean; length: number } & Array<number>>) => {
        const newPoints: number[][] = [];
        const subpathLengths: number[] = [];

        for (const segment of rawPath) {
          const coords = segment as unknown as number[];
          const startIdx = newPoints.length;

          // First anchor point
          newPoints.push([coords[0], coords[1], 0]);

          // Remaining points as cubic Bezier triples: handle1, handle2, anchor
          for (let i = 2; i < coords.length; i += 6) {
            if (i + 5 >= coords.length) break;
            newPoints.push([coords[i],     coords[i + 1], 0]); // handle1
            newPoints.push([coords[i + 2], coords[i + 3], 0]); // handle2
            newPoints.push([coords[i + 4], coords[i + 5], 0]); // anchor
          }

          subpathLengths.push(newPoints.length - startIdx);
        }

        // Reconstruct subpaths on VMobject when multiple subpaths exist
        if (subpathLengths.length > 1 && source.setSubpaths) {
          source.setSubpaths(subpathLengths, subpathLengths.map(() => true));
        }

        // Read progress directly from the tween
        const progress = this.gsapTween?.progress() ?? 0;

        // Points stay in local space throughout (group transform handles world position)
        source.points3D = newPoints;
        source.rotation = lerpVec3(this.startRotation, this.endRotation, progress);
        source.position = lerpVec3(this.startPosition, this.endPosition, progress);
        source.scale    = lerpVec3(this.startScale,    this.endScale,    progress);
        source.color    = lerpColor(this.startColor, this.endColor, progress);
        source.opacity = lerp(this.startOpacity, this.endOpacity, progress);
        source.fillColor = lerpColor(this.startFillColor, this.endFillColor, progress);
        source.markDirty();
      };

      // Create a paused GSAP tween
      this.gsapTween = gsap.to(this.tempPath, {
        duration: 1,
        ease: 'none',
        morphSVG: {
          shape: this.endPath,
          render: onRender,
        },
        paused: true,
      });

      this.startCaptured = true;
    }

    if (!this.tempPath || !this.gsapTween) return;

    // Drive the tween to the requested progress and force an immediate synchronous render
    this.gsapTween.render(alpha, false, true);
  }

  dispose(): void {
    if (this.gsapTween) {
      this.gsapTween.kill();
      this.gsapTween = null;
    }
    if (this.tempPath) {
      this.tempPath.remove();
      this.tempPath = null;
    }
  }

  /** Convert VMobject points to an SVG path string, handling multiple subpaths. */
  private pointsToSvgPath(vmobject: VMobject, offset: Vec3 = [0, 0, 0]): string {
    const points = vmobject.points3D;
    if (points.length < 2) return '';

    const subpaths = vmobject.getSubpaths?.() || { lengths: [points.length], closed: [false] };
    const subpathLengths = subpaths.lengths || [points.length];

    const ox = offset[0];
    const oy = offset[1];

    let path = '';
    let pointIdx = 0;

    if (subpathLengths.length > 1) {
      for (let spIdx = 0; spIdx < subpathLengths.length; spIdx++) {
        const subpathLen = subpathLengths[spIdx];
        const subpathEnd = pointIdx + subpathLen;

        if (pointIdx >= points.length) break;

        path += `M ${points[pointIdx][0] + ox},${points[pointIdx][1] + oy}`;

        for (let i = pointIdx + 1; i < subpathEnd; i += 3) {
          if (i + 2 >= subpathEnd) break;
          const h1 = points[i];
          const h2 = points[i + 1];
          const anchor = points[i + 2];
          path += ` C ${h1[0] + ox},${h1[1] + oy}, ${h2[0] + ox},${h2[1] + oy}, ${anchor[0] + ox},${anchor[1] + oy}`;
        }

        const first = points[pointIdx];
        const last  = points[Math.min(subpathEnd - 1, points.length - 1)];
        const isClosed = Math.abs(first[0] - last[0]) < 1e-6 && Math.abs(first[1] - last[1]) < 1e-6;
        if (isClosed) path += ' Z';

        if (spIdx < subpathLengths.length - 1) path += ' ';

        pointIdx = subpathEnd;
      }
    } else {
      path = `M ${points[0][0] + ox},${points[0][1] + oy}`;

      for (let i = 1; i < points.length; i += 3) {
        if (i + 2 >= points.length) break;
        const h1 = points[i];
        const h2 = points[i + 1];
        const anchor = points[i + 2];
        path += ` C ${h1[0] + ox},${h1[1] + oy}, ${h2[0] + ox},${h2[1] + oy}, ${anchor[0] + ox},${anchor[1] + oy}`;
      }

      const first = points[0];
      const last  = points[points.length - 1];
      const isClosed = Math.abs(first[0] - last[0]) < 1e-6 && Math.abs(first[1] - last[1]) < 1e-6;
      if (isClosed) path += ' Z';
    }

    return path;
  }
}

// Factory function
export function morphTo(source: VMobject, target: VMobject, duration = 1, rateFunc?: RateFunction): MorphTrack {
  return new MorphTrack(source, target, duration, rateFunc);
}