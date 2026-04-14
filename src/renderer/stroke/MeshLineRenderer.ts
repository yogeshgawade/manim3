// src/renderer/stroke/MeshLineRenderer.ts

import * as THREE from 'three';
import type { VMobject } from '../../core/VMobject';
import type { StrokeRenderer } from './StrokeRenderer';

// Adjust import paths to wherever you put these files
import { MeshLineGeometry } from './MeshLineGeometry';
import { MeshLineMaterial } from './MeshLineMaterial';

/**
 * MeshLineRenderer
 * ----------------------
 * Stroke renderer that uses MeshLineGeometry + MeshLineMaterial
 * to render thick lines and support smooth "Create" animations
 * via the `visibility` uniform (0..1 along the path).
 */
export class MeshLineRenderer implements StrokeRenderer {
  private group: THREE.Group;
  private lines: Array<{
    geom: MeshLineGeometry;
    mat: MeshLineMaterial;
    mesh: THREE.Mesh;
  }> = [];

  private resolution: [number, number];
  private pixelRatio: number;
  private frameWidth: number = 14;  // Camera frame width for linewidth calculation

  constructor(
    resolution: [number, number] = [800, 450],
    pixelRatio = 1,
  ) {
    this.group = new THREE.Group();
    this.resolution = resolution;
    this.pixelRatio = pixelRatio;
  }

  get mesh(): THREE.Object3D {
    return this.group;
  }

  update(mob: VMobject): void {
    const subpaths = mob.getSubpathPoints(); // same method Line2Renderer uses
    const finalOpacity = mob.opacity * mob.strokeOpacity;

    // Remove extra lines if subpath count shrank
    while (this.lines.length > subpaths.length) {
      const last = this.lines.pop()!;
      last.geom.dispose();
      last.mat.dispose();
      this.group.remove(last.mesh);
    }

    // Update / create one MeshLine per subpath
    for (let i = 0; i < subpaths.length; i++) {
      const { points, closed } = subpaths[i];

      let line = this.lines[i];
      if (!line) {
        line = this.createLine();
        this.lines[i] = line;
      }

      this.updateSingleLine(
        line,
        points.flat(),
        closed,
        mob.strokeWidth,
        mob.color,
        finalOpacity,
        mob.visibleFraction,
      );
    }

    this.group.visible = mob.visible && subpaths.length > 0;
  }

  setHoverHighlight(active: boolean): void {
    // Simple lightness tweak similar to Line2Renderer
    for (const { mat } of this.lines) {
      const c = mat.color.clone();
      c.offsetHSL(0, 0, active ? 0.15 : -0.15);
      mat.color.copy(c);
      mat.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const { geom, mat, mesh } of this.lines) {
      geom.dispose();
      mat.dispose();
      this.group.remove(mesh);
    }
    this.lines.length = 0;
  }

  // --- private helpers ---

  /**
   * Compute linewidth: strokeWidth * 0.01 * (rendererWidth / frameWidth)
   * Same scaling as Line2Renderer for consistent units
   */
  private computeLinewidth(strokeWidth: number): number {
    return strokeWidth * 0.01 * (this.resolution[0] / this.frameWidth);
  }

  private createLine() {
    const geom = new MeshLineGeometry();

    const mat = new MeshLineMaterial({
      color: 0xffffff,
      lineWidth: 1,
      resolution: new THREE.Vector2(
        this.resolution[0] * this.pixelRatio,
        this.resolution[1] * this.pixelRatio,
      ),
      // We’ll use `visibility` for CreateTrack, so dash is optional
      useDash: 0,
      transparent: true,
      sizeAttenuation: 0, // Treat lineWidth as pixels, not clip space units
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.frustumCulled = false;
    this.group.add(mesh);

    return { geom, mat, mesh };
  }

  private updateSingleLine(
    line: {
      geom: MeshLineGeometry;
      mat: MeshLineMaterial;
      mesh: THREE.Mesh;
    },
    bezierPoints: number[],
    closed: boolean,
    strokeWidth: number,
    color: string,
    opacity: number,
    visibleFraction?: number,
  ) {
    const { geom, mat } = line;

    // 1) Resample cubic Bézier VMobject points into a polyline,
    //    same idea as Line2Renderer.sampleBezierPath
    const sampled = sampleBezierPath(bezierPoints, 32);

    if (sampled.length < 2 * 3) {
      line.mesh.visible = false;
      return;
    }
    line.mesh.visible = true;

    // 2) Push positions into MeshLineGeometry
    //    MeshLineGeometry will compute counters (0..1) internally
    geom.setPoints(sampled);

    // 3) Update material properties
    mat.lineWidth = this.computeLinewidth(strokeWidth);
    mat.color = new THREE.Color(color);
    mat.opacity = opacity;
    mat.transparent = opacity < 1;
    mat.needsUpdate = true;

    // 4) Map CreateTrack's visibleFraction to MeshLine's visibility uniform
    const vf =
      visibleFraction !== undefined && visibleFraction !== null
        ? THREE.MathUtils.clamp(visibleFraction, 0, 1)
        : 1.0;

    mat.uniforms.visibility.value = vf;
    mat.uniformsNeedUpdate = true;
  }
}

/**
 * Cubic Bézier sampling helper (copied from Line2Renderer with minor cleanup).
 * `points` is VMobject.points3D flattened: [x0,y0,z0, h1x,h1y,h1z, h2x,h2y,h2z, x1,y1,z1, ...]
 */
function sampleBezierPath(points: number[], samplesPerSegment = 16): number[] {
  if (points.length <= 4 * 3) {
    // Single anchor only – nothing to sample
    return points.slice();
  }

  const result: number[] = [];
  const numSegments = Math.floor((points.length / 3 - 1) / 3);

  for (let seg = 0; seg < numSegments; seg++) {
    const base = seg * 3 * 3;

    const p0x = points[base + 0];
    const p0y = points[base + 1];
    const p0z = points[base + 2];

    const p1x = points[base + 3];
    const p1y = points[base + 4];
    const p1z = points[base + 5];

    const p2x = points[base + 6];
    const p2y = points[base + 7];
    const p2z = points[base + 8];

    const p3x = points[base + 9];
    const p3y = points[base + 10];
    const p3z = points[base + 11];

    for (let i = 0; i < samplesPerSegment; i++) {
      const t =
        samplesPerSegment === 1 ? 1 : i / (samplesPerSegment - 1);

      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;
      const t2 = t * t;
      const t3 = t2 * t;

      const x =
        mt3 * p0x +
        3 * mt2 * t * p1x +
        3 * mt * t2 * p2x +
        t3 * p3x;
      const y =
        mt3 * p0y +
        3 * mt2 * t * p1y +
        3 * mt * t2 * p2y +
        t3 * p3y;
      const z =
        mt3 * (p0z ?? 0) +
        3 * mt2 * t * (p1z ?? 0) +
        3 * mt * t2 * (p2z ?? 0) +
        t3 * (p3z ?? 0);

      const len = result.length;
      if (
        len === 0 ||
        Math.abs(x - result[len - 3]) > 0.0001 ||
        Math.abs(y - result[len - 2]) > 0.0001 ||
        Math.abs(z - result[len - 1]) > 0.0001
      ) {
        result.push(x, y, z);
      }
    }
  }

  return result;
}