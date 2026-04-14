/**
 * Pure bezier math utilities — no Three.js, no GPU types.
 * Moved here from VMobject per migration plan.
 */

/** Evaluate a cubic bezier at parameter t ∈ [0, 1] */
export function cubicBezier(
  p0: number[],
  p1: number[],
  p2: number[],
  p3: number[],
  t:  number,
): number[] {
  const mt = 1 - t;
  return p0.map((_, i) =>
    mt ** 3 * p0[i] +
    3 * mt ** 2 * t  * p1[i] +
    3 * mt  * t ** 2 * p2[i] +
    t  ** 3           * p3[i]
  );
}

/**
 * Sample N evenly-spaced points along a cubic bezier path.
 * points3D layout: [anchor, handle, handle, anchor, handle, handle, anchor, …]
 * stride = 3
 */
export function sampleBezierPath(
  points3D: number[][],
  samples:  number = 20,
): number[][] {
  if (points3D.length < 4) return [...points3D];
  const result: number[][] = [];
  const segCount = Math.floor((points3D.length - 1) / 3);

  for (let seg = 0; seg < segCount; seg++) {
    const base = seg * 3;
    const p0   = points3D[base];
    const p1   = points3D[base + 1];
    const p2   = points3D[base + 2];
    const p3   = points3D[base + 3];
    if (!p0 || !p1 || !p2 || !p3) break;

    for (let i = 0; i < samples; i++) {
      result.push(cubicBezier(p0, p1, p2, p3, i / samples));
    }
  }
  // push last anchor
  result.push(points3D[points3D.length - 1]);
  return result;
}

/** Returns true if first anchor === last anchor (within epsilon) */
export function isClosedPath(points3D: number[][], eps = 1e-6): boolean {
  if (points3D.length < 4) return false;
  const first = points3D[0];
  const last  = points3D[points3D.length - 1];
  return (
    Math.abs(first[0] - last[0]) < eps &&
    Math.abs(first[1] - last[1]) < eps &&
    Math.abs(first[2] - last[2]) < eps
  );
}
