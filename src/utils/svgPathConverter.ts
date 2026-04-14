import type { VMobject } from '../core/VMobject';
import type { Vec3 } from '../core/types';
import { gsap } from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

// Register GSAP plugin
gsap.registerPlugin(MorphSVGPlugin);

/** Convert points3D → SVG path string (XY only — Z excluded by design) */
export function pointsXYToSVGPath(points3D: number[][]): string {
  if (points3D.length < 4) return '';
  const p     = points3D;
  const parts: string[] = [];

  parts.push(`M ${p[0][0]},${p[0][1]}`);

  for (let i = 0; i + 3 < p.length; i += 3) {
    const h1 = p[i + 1];
    const h2 = p[i + 2];
    const a1 = p[i + 3];
    if (!h1 || !h2 || !a1) break;
    parts.push(`C ${h1[0]},${h1[1]} ${h2[0]},${h2[1]} ${a1[0]},${a1[1]}`);
  }

  const first    = p[0];
  const last     = p[p.length - 1];
  const isClosed =
    Math.abs(first[0] - last[0]) < 1e-6 &&
    Math.abs(first[1] - last[1]) < 1e-6;

  if (isClosed) parts.push('Z');

  return parts.join(' ');
}

/** Convert SVG path string → XY points (Z = 0, caller adds Z back) */
export function svgPathToPoints(d: string): number[][] {
  const points:   number[][] = [];
  const commands = d.match(/[MCZL][^MCZL]*/gi) ?? [];
  
  let currentAnchor: number[] | null = null;

  for (const cmd of commands) {
    const type = cmd[0].toUpperCase();
    const nums = cmd.slice(1).trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);

    if (type === 'M') {
      currentAnchor = [nums[0], nums[1], 0];
      points.push(currentAnchor);
    } else if (type === 'C') {
      // For cubic bezier: [startAnchor, handle1, handle2, endAnchor]
      if (currentAnchor) {
        points.push([nums[0], nums[1], 0]); // handle1
        points.push([nums[2], nums[3], 0]); // handle2
        currentAnchor = [nums[4], nums[5], 0]; // endAnchor
        points.push(currentAnchor);
      }
    }
    // Z — skip
  }

  return points;
}

/** Creates a rotation matrix from Euler angles (XYZ order). */
export function eulerToMatrix(rx: number, ry: number, rz: number): number[][] {
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);

  return [
    [cy * cz, -cy * sz, sy],
    [sx * sy * cz + cx * sz, -sx * sy * sz + cx * cz, -sx * cy],
    [-cx * sy * cz + sx * sz, cx * sy * sz + sx * cz, cx * cy],
  ];
}

/** Multiplies a 3x3 matrix by a vector. */
export function multiplyMatrixVec(matrix: number[][], vec: number[]): number[] {
  return [
    matrix[0][0] * vec[0] + matrix[0][1] * vec[1] + matrix[0][2] * vec[2],
    matrix[1][0] * vec[0] + matrix[1][1] * vec[1] + matrix[1][2] * vec[2],
    matrix[2][0] * vec[0] + matrix[2][1] * vec[1] + matrix[2][2] * vec[2],
  ];
}

/** Inverts a 3x3 rotation matrix (transpose for rotation matrices). */
export function invertMatrix(matrix: number[][]): number[][] {
  return [
    [matrix[0][0], matrix[1][0], matrix[2][0]],
    [matrix[0][1], matrix[1][1], matrix[2][1]],
    [matrix[0][2], matrix[1][2], matrix[2][2]],
  ];
}

/** Unprojects points using inverse rotation (flattens to XY plane). */
export function unprojectPoints(points3D: number[][], rotation: Vec3): number[][] {
  const matrix = invertMatrix(eulerToMatrix(rotation[0], rotation[1], rotation[2]));
  return points3D.map(p => multiplyMatrixVec(matrix, p));
}

/** Reprojects flat points using rotation (applies tilt back). */
export function reprojectPoints(flatPoints: number[][], rotation: Vec3): number[][] {
  const matrix = eulerToMatrix(rotation[0], rotation[1], rotation[2]);
  return flatPoints.map(p => multiplyMatrixVec(matrix, p));
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Linear interpolation between Vec3. */
export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Pre-bakes morphed path strings using GSAP MorphSVGPlugin. */
export function prebakeMorph(
  sourcePath: string,
  targetPath: string,
  options: { samples?: number; type?: 'linear' | 'rotational' } = {},
): string[] {
  const { samples = 120, type = 'rotational' } = options;

  // Create temporary path elements for GSAP to work with
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.visibility = 'hidden';
  document.body.appendChild(tempDiv);

  const sourceEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const targetEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  sourceEl.setAttribute('d', sourcePath);
  targetEl.setAttribute('d', targetPath);
  tempDiv.appendChild(sourceEl);
  tempDiv.appendChild(targetEl);

  // Pre-bake interpolated paths using a paused timeline
  const morphedPaths: string[] = [];
  
  const timeline = gsap.timeline({ paused: true });
  timeline.to(sourceEl, {
    morphSVG: targetEl,
    duration: 1,
    ease: 'none',
  });
  
  for (let i = 0; i < samples; i++) {
    const progress = i / (samples - 1);
    timeline.progress(progress);
    const morphedPath = sourceEl.getAttribute('d') || targetPath;
    morphedPaths.push(morphedPath);
  }
  
  timeline.kill();

  // Cleanup
  document.body.removeChild(tempDiv);

  return morphedPaths;
}

/** Detect whether a VMobject lives on a flat plane, is tilted, or is truly 3D */
export function classifySVGIn3D(mob: VMobject): 'flat' | 'tilted-flat' | 'extruded-3d' {
  if (mob.points3D.length === 0) return 'flat';
  const zValues  = mob.points3D.map(p => p[2]);
  const zVariance = Math.max(...zValues) - Math.min(...zValues);
  if (zVariance < 1e-4) return 'flat';
  if (zVariance < 2.0)  return 'tilted-flat';
  return 'extruded-3d';
}
