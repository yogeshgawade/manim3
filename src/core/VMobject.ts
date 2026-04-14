// NO import from 'three' — ever.
import { Mobject } from './Mobject';
import type { MobjectState } from './types';

export interface SubpathInfo {
  lengths: number[];  // Point count per subpath
  closed: boolean[];  // Whether each subpath is closed
}

export class VMobject extends Mobject {
  points3D:       number[][] = [];
  fillColor:      string     = '#58C4DD';
  fillOpacity:    number     = 0;
  strokeOpacity:  number     = 1;
  visibleFraction: number    = 1;
  subpaths?: SubpathInfo;  // Multi-subpath support (optional)
  strokeWidths?: number[]; // Per-point variable stroke widths for tapering
  strokeRendererType?: 'bezier-sdf' | 'line2' | 'meshline'; // Stroke renderer selection

  setPoints3D(points: number[][]): this {
    this.points3D = points.map(p => [...p]);
    this.markDirty();
    return this;
  }

  setPointsAsCorners(corners: number[][]): this {
    const pts: number[][] = [];
    for (let i = 0; i < corners.length; i++) {
      const curr = corners[i];
      const next = corners[(i + 1) % corners.length];
      const mid  = [
        (curr[0] + next[0]) / 2,
        (curr[1] + next[1]) / 2,
        (curr[2] + next[2]) / 2,
      ];
      pts.push([...curr], [...mid], [...mid], [...next]);
    }
    return this.setPoints3D(pts);
  }

  addPointsAsCorners(corners: number[][]): this {
    const existing = this.points3D;
    const newPts   = new VMobject().setPointsAsCorners(corners).points3D;
    return this.setPoints3D([...existing, ...newPts]);
  }

  // Override captureState to include points3D and strokeWidths
  captureState(): MobjectState {
    const base = super.captureState();
    return {
      ...base,
      points3D: this.points3D.map(p => [...p]),
      subpaths: this.subpaths,
      strokeWidths: this.strokeWidths,
    };
  }

  restoreState(state: MobjectState): this {
    super.restoreState(state);
    this.points3D = (state.points3D ?? []).map((p: number[]) => [...p]);
    this.subpaths = state.subpaths;
    this.strokeWidths = state.strokeWidths;
    this.markDirty();
    return this;
  }

  /**
   * Set subpath information for multi-contour shapes.
   * Each subpath is a separate contour (e.g., for shapes with holes).
   */
  setSubpaths(lengths: number[], closed?: boolean[]): this {
    this.subpaths = {
      lengths,
      closed: closed ?? lengths.map(() => false),
    };
    this.markDirty();
    return this;
  }

  /**
   * Get subpath information. If not explicitly set, returns single subpath.
   */
  getSubpaths(): SubpathInfo {
    if (this.subpaths) return this.subpaths;
    return {
      lengths: [this.points3D.length],
      closed: [this.isClosedPath()],
    };
  }

  /**
   * Check if path is closed (first and last anchor match).
   */
  isClosedPath(): boolean {
    const pts = this.points3D;
    if (pts.length < 4) return false;
    const first = pts[0];
    const last = pts[pts.length - 1];
    const dx = first[0] - last[0];
    const dy = first[1] - last[1];
    const dz = (first[2] ?? 0) - (last[2] ?? 0);
    return dx * dx + dy * dy + dz * dz < 1e-6;
  }

  /**
   * Split points3D into subpaths based on subpath info.
   */
  getSubpathPoints(): { points: number[][]; closed: boolean }[] {
    const info = this.getSubpaths();
    const result: { points: number[][]; closed: boolean }[] = [];
    let offset = 0;
    for (let i = 0; i < info.lengths.length; i++) {
      const len = info.lengths[i];
      result.push({
        points: this.points3D.slice(offset, offset + len),
        closed: info.closed[i],
      });
      offset += len;
    }
    return result;
  }
}
