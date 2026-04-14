/**
 * Line2Renderer — uses THREE Line2 for CreateTrack dash-reveal animations.
 * Falls back gracefully if Line2 isn't available.
 */
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import type { StrokeRenderer } from './StrokeRenderer';
import type { VMobject } from '../../core/VMobject';

// Sample points along cubic bezier curves (with deduplication like manim-web)
function sampleBezierPath(points: number[][], samplesPerSegment = 16): number[][] {
  if (points.length < 4) return points;
  
  const result: number[][] = [];
  const numSegments = Math.floor((points.length - 1) / 3);
  
  for (let seg = 0; seg < numSegments; seg++) {
    const base = seg * 3;
    const p0 = points[base];
    const p1 = points[base + 1];
    const p2 = points[base + 2];
    const p3 = points[base + 3];
    
    for (let i = 0; i < samplesPerSegment; i++) {
      const t = i / (samplesPerSegment - 1);
      // Cubic bezier formula
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const t2 = t * t;
      const t3 = t2 * t;
      
      const x = mt3 * p0[0] + 3 * mt2 * t * p1[0] + 3 * mt * t2 * p2[0] + t3 * p3[0];
      const y = mt3 * p0[1] + 3 * mt2 * t * p1[1] + 3 * mt * t2 * p2[1] + t3 * p3[1];
      const z = mt3 * (p0[2] ?? 0) + 3 * mt2 * t * (p1[2] ?? 0) + 3 * mt * t2 * (p2[2] ?? 0) + t3 * (p3[2] ?? 0);
      
      // Deduplication: skip if very close to previous point (manim-web style)
      if (
        result.length === 0 ||
        Math.abs(x - result[result.length - 1][0]) > 0.0001 ||
        Math.abs(y - result[result.length - 1][1]) > 0.0001 ||
        Math.abs(z - (result[result.length - 1][2] ?? 0)) > 0.0001
      ) {
        result.push([x, y, z]);
      }
    }
  }
  
  return result;
}

export function getLine2TotalLength(line: Line2): number {
  const geom = line.geometry;
  const distEnd = geom.getAttribute('instanceDistanceEnd') as
    | THREE.InterleavedBufferAttribute
    | THREE.BufferAttribute
    | null;
  if (distEnd && distEnd.count > 0) {
    const arr = 'data' in distEnd && distEnd.data ? distEnd.data.array : distEnd.array;
    return (arr[arr.length - 1] as number) || 1;
  }
  return 1;
}

export class Line2Renderer implements StrokeRenderer {
  private _group: THREE.Group;
  private _cachedLine2Array: Line2[] = [];  // Multi-subpath support
  private _material: LineMaterial | null = null;
  private _resolution: [number, number];
  private _pixelRatio: number;
  private _frameWidth: number = 14;  // Camera frame width for linewidth calculation
  private static _stencilCounter = 0;
  private _stencilRef: number;

  constructor(resolution: [number, number] = [800, 450], pixelRatio = 1) {
    this._group = new THREE.Group();
    this._resolution = resolution;
    this._pixelRatio = pixelRatio;
    this._stencilRef = (Line2Renderer._stencilCounter++ % 254) + 1;
  }

  get mesh(): THREE.Object3D { return this._group; }

  /**
   * Compute linewidth in pixels: strokeWidth * 0.01 * (rendererWidth / frameWidth)
   */
  private _computeLinewidth(strokeWidth: number): number {
    return strokeWidth * 0.01 * (this._resolution[0] / this._frameWidth);
  }

  /**
   * Build Line2 position array from sampled points, with corner-wrap for closed paths.
   * ALWAYS corner-wrap — overlap is resolved by render-to-texture compositing.
   */
  private _buildLine2Positions(sampledPoints: number[][], closed: boolean): number[] {
    const positions: number[] = [];
    for (const pt of sampledPoints) {
      positions.push(pt[0], pt[1], pt[2]);
    }
    // Corner-wrap for closed paths — always wrap, opacity compositing handles overlap
    if (closed && sampledPoints.length >= 3) {
      const wrap = Math.min(2, sampledPoints.length - 1);
      for (let i = 1; i <= wrap; i++) {
        const pt = sampledPoints[i];
        positions.push(pt[0], pt[1], pt[2]);
      }
    }
    return positions;
  }

  /**
   * Update a single Line2 with sampled points.
   */
  private _updateSingleLine2(
    line: Line2 | null,
    points: number[][],
    closed: boolean,
    strokeWidth: number,
    color: string,
    opacity: number
  ): Line2 {
    const sampledPoints = sampleBezierPath(points, 24);
    if (sampledPoints.length < 2) {
      if (line) line.visible = false;
      return line!;
    }
    const positions = this._buildLine2Positions(sampledPoints, closed);
    const linewidth = this._computeLinewidth(strokeWidth);
    if (!this._material) {
      this._material = new LineMaterial({
        color: new THREE.Color(color).getHex(),
        linewidth: linewidth,
        opacity: opacity,
        transparent: opacity < 1,
        depthWrite: opacity >= 1,
        resolution: new THREE.Vector2(this._resolution[0] * this._pixelRatio, this._resolution[1] * this._pixelRatio),
        dashed: false,
      });
    } else {
      this._material.color.set(color);
      this._material.linewidth = linewidth;
      this._material.opacity = opacity;
      this._material.transparent = opacity < 1;
      this._material.depthWrite = opacity >= 1;
    }
    // Stencil for transparency - prevents double-blending at segment joins
    if (opacity < 1) {
      this._material.stencilWrite = true;
      this._material.stencilFunc = THREE.NotEqualStencilFunc;
      this._material.stencilRef = this._stencilRef;
      this._material.stencilFuncMask = 0xff;
      this._material.stencilFail = THREE.KeepStencilOp;
      this._material.stencilZFail = THREE.KeepStencilOp;
      this._material.stencilZPass = THREE.ReplaceStencilOp;
    } else {
      this._material.stencilWrite = false;
    }
    if (line) {
      line.geometry.dispose();
      const geometry = new LineGeometry();
      geometry.setPositions(positions);
      line.geometry = geometry;
      line.computeLineDistances();
      line.visible = true;
    } else {
      const geometry = new LineGeometry();
      geometry.setPositions(positions);
      line = new Line2(geometry, this._material);
      line.computeLineDistances();
      line.frustumCulled = false;
      this._group.add(line);
    }
    return line;
  }

  /**
   * Update all Line2 objects based on VMobject state.
   * Handles multi-subpath shapes by creating one Line2 per subpath.
   */
  update(mob: VMobject): void {
    const subpaths = mob.getSubpathPoints();
    // Remove excess cached lines if subpath count decreased
    while (this._cachedLine2Array.length > subpaths.length) {
      const old = this._cachedLine2Array.pop()!;
      old.geometry.dispose();
      this._group.remove(old);
    }
    // Calculate final opacity
    const finalOpacity = mob.opacity * mob.strokeOpacity;
    
    // Update or create Line2 for each subpath
    for (let i = 0; i < subpaths.length; i++) {
      const { points, closed } = subpaths[i];
      const line = this._updateSingleLine2(
        this._cachedLine2Array[i] ?? null,
        points,
        closed,
        mob.strokeWidth,
        mob.color,
        finalOpacity
      );
      this._cachedLine2Array[i] = line;
    }
    // Handle visibleFraction for CreateTrack animation using dash
    // Use 0.9999 threshold to disable dashing near completion and avoid floating-point artifacts
    if (mob.visibleFraction !== undefined && mob.visibleFraction < 0.9999) {
      for (const line of this._cachedLine2Array) {
        if (!line || !line.visible) continue;
        const material = line.material as LineMaterial;
        const totalLen = getLine2TotalLength(line);
        material.dashed = true;
        material.dashScale = 1;
        // Clamp visibleFraction to avoid edge states near 1.0
        const clampedFraction = Math.min(mob.visibleFraction, 0.9999);
        const visibleLength = clampedFraction * totalLen;
        material.dashSize = visibleLength;
        // Use meaningful fraction of totalLen as minimum gap to prevent near-zero gapSize artifacts
        material.gapSize = Math.max(totalLen - visibleLength, totalLen * 0.001);
        material.needsUpdate = true;
      }
    } else {
      for (const line of this._cachedLine2Array) {
        if (!line || !line.visible) continue;
        const material = line.material as LineMaterial;
        if (material.dashed) {
          material.dashed = false;
          material.needsUpdate = true;
        }
      }
    }
    this._group.visible = mob.visible && subpaths.length > 0;
  }

  setResolution(width: number, height: number, pixelRatio = this._pixelRatio): void {
    this._resolution = [width, height];
    this._pixelRatio = pixelRatio;
    if (this._material) {
      this._material.resolution.set(width * pixelRatio, height * pixelRatio);
    }
  }

  setHoverHighlight(active: boolean): void {
    if (this._material) {
      const color = this._material.color.clone();
      color.offsetHSL(0, 0, active ? 0.15 : -0.15);
      this._material.color = color;
    }
  }

  dispose(): void {
    for (const line of this._cachedLine2Array) {
      line.geometry.dispose();
    }
    this._cachedLine2Array = [];
    this._material?.dispose();
    this._material = null;
    this._group.clear();
  }
}
