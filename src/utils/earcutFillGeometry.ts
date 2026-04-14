import * as THREE from 'three';
import Earcut from 'earcut';
import { sampleBezierPath } from './bezierUtils';

/**
 * Calculate signed area of polygon to determine winding order.
 * Positive = counter-clockwise, Negative = clockwise
 */
function polygonSignedArea(points: number[][]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][0] * points[j][1];
    area -= points[j][0] * points[i][1];
  }
  return area / 2;
}

/**
 * Check if a subpath is a hole based on winding order.
 * Holes have opposite winding from the outer contour.
 */
function isHole(points: number[][], outerArea: number): boolean {
  const area = polygonSignedArea(points);
  // Opposite signs = hole (outer CCW + hole CW, or outer CW + hole CCW)
  return (outerArea > 0) !== (area > 0);
}

/**
 * Triangulates a VMobject's cubic bezier points into a THREE.BufferGeometry
 * using earcut. Supports multiple subpaths with holes and separate filled shapes.
 * 
 * @param subpaths - Array of subpaths, each with points and closed flag
 * @returns THREE.BufferGeometry or null if triangulation fails
 */
export function buildEarcutFillGeometry(
  subpaths: { points: number[][]; closed: boolean }[]
): THREE.BufferGeometry | null {
  if (subpaths.length === 0) return null;

  // Sample all subpaths and calculate winding
  const sampledSubpaths: { points: number[][]; area: number }[] = [];
  for (const { points } of subpaths) {
    if (points.length < 3) continue;
    const sampled = sampleBezierPath(points, 16);
    if (sampled.length >= 3) {
      sampledSubpaths.push({ points: sampled, area: polygonSignedArea(sampled) });
    }
  }

  if (sampledSubpaths.length === 0) return null;

  // Separate into: outer contour + holes (same earcut call), and separate shapes (own earcut calls)
  const outerArea = sampledSubpaths[0].area;
  const mainContour: number[] = [];
  const mainHoles: number[] = [];
  const separateShapes: number[][] = [];
  let vertexCount = 0;

  for (let i = 0; i < sampledSubpaths.length; i++) {
    const { points, area } = sampledSubpaths[i];
    
    if (i === 0) {
      // First subpath is always the outer contour
      for (const p of points) {
        mainContour.push(p[0], p[1]);
      }
      vertexCount = points.length;
    } else if ((outerArea > 0) !== (area > 0)) {
      // Opposite winding = hole of main contour
      mainHoles.push(vertexCount);
      for (const p of points) {
        mainContour.push(p[0], p[1]);
      }
      vertexCount += points.length;
    } else {
      // Same winding = separate filled shape
      const flat: number[] = [];
      for (const p of points) {
        flat.push(p[0], p[1]);
      }
      separateShapes.push(flat);
    }
  }

  // Collect all vertices and indices
  const allVertices: number[][] = [];
  const allIndices: number[] = [];
  let baseIndex = 0;

  // Triangulate main contour with holes
  if (mainContour.length >= 6) { // At least 3 points (x,y pairs)
    const indices = Earcut(mainContour, mainHoles.length > 0 ? mainHoles : undefined, 2);
    if (indices && indices.length > 0) {
      // Extract vertices from mainContour (x,y pairs -> x,y,0)
      for (let i = 0; i < mainContour.length; i += 2) {
        allVertices.push([mainContour[i], mainContour[i + 1], 0]);
      }
      for (const idx of indices) {
        allIndices.push(idx);
      }
      baseIndex = mainContour.length / 2;
    }
  }

  // Triangulate separate shapes
  for (const shape of separateShapes) {
    if (shape.length < 6) continue;
    const indices = Earcut(shape, undefined, 2);
    if (indices && indices.length > 0) {
      // Offset indices by current vertex count
      for (const idx of indices) {
        allIndices.push(idx + baseIndex);
      }
      // Add vertices
      for (let i = 0; i < shape.length; i += 2) {
        allVertices.push([shape[i], shape[i + 1], 0]);
      }
      baseIndex += shape.length / 2;
    }
  }

  if (allVertices.length < 3 || allIndices.length === 0) return null;

  // Build 3D positions
  const positions = new Float32Array(allVertices.length * 3);
  for (let i = 0; i < allVertices.length; i++) {
    positions[i * 3] = allVertices[i][0];
    positions[i * 3 + 1] = allVertices[i][1];
    positions[i * 3 + 2] = allVertices[i][2];
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(allIndices);
  geo.computeVertexNormals();
  return geo;
}
