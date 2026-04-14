/**
 * BezierSDFRenderer — wraps the old BezierRenderer + BezierShaderMaterial.
 * BezierShaderMaterial gets ZERO changes — we just wrap it in the StrokeRenderer interface.
 */
import * as THREE from 'three';
import type { StrokeRenderer } from './StrokeRenderer';
import type { VMobject } from '../../core/VMobject';
import {
  createBezierShaderMaterial,
  updateBezierMaterialResolution,
} from '../BezierShaderMaterial';

// ── Quad template (6 vertices, 2 triangles) ────────────────────────────────
const QUAD_UVS = new Float32Array([0,0, 1,0, 1,1, 0,0, 1,1, 0,1]);

export class BezierSDFRenderer implements StrokeRenderer {
  private _mesh: THREE.Mesh;
  private _material: THREE.ShaderMaterial;
  private _hoverBrightness = 0;
  private _cachedSegmentCount = 0;  // Track for in-place updates
  private _pixelRatio = 1;

  constructor(resolution: [number, number] = [800, 450], pixelRatio = 1) {
    this._material = createBezierShaderMaterial({ resolution, pixelRatio });
    // Start with empty geometry — update() fills it
    const geo  = new THREE.BufferGeometry();
    this._mesh = new THREE.Mesh(geo, this._material);
    this._mesh.frustumCulled = false;
  }

  get mesh(): THREE.Object3D { return this._mesh; }

  update(mob: VMobject): void {
    const subpaths = mob.getSubpathPoints();
    const allSegments: ReturnType<BezierSDFRenderer['_extractSegments']> = [];
    // Extract segments from all subpaths with variable stroke widths
    for (const { points, closed } of subpaths) {
      const segs = this._extractSegments(
        points,
        mob.strokeWidth,
        mob.color,
        mob.opacity * mob.strokeOpacity,
        mob.strokeWidths
      );
      allSegments.push(...segs);
    }
    // Use in-place update if segment count matches, otherwise rebuild
    if (allSegments.length === this._cachedSegmentCount && allSegments.length > 0) {
      this._updateGeometryInPlace(allSegments);
    } else {
      this._rebuildGeometry(allSegments);
      this._cachedSegmentCount = allSegments.length;
    }
    this._mesh.visible = mob.visible && allSegments.length > 0;
  }

  setHoverHighlight(active: boolean): void {
    this._hoverBrightness = active ? 0.15 : 0;
    // Inject brightness offset into shader uniform if present, else tint material color
    if (this._material.uniforms.uHoverBrightness) {
      this._material.uniforms.uHoverBrightness.value = this._hoverBrightness;
    }
  }

  updateResolution(w: number, h: number, dpr = 1): void {
    this._pixelRatio = dpr;
    updateBezierMaterialResolution(this._material, w, h, dpr);
  }

  dispose(): void {
    this._mesh.geometry.dispose();
    this._material.dispose();
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private _extractSegments(
    points: number[][],
    strokeWidth: number,
    color: string,
    opacity: number,
    strokeWidths?: number[],
  ) {
    if (points.length < 4) return [];
    const threeColor = new THREE.Color(color);
    const rgba: [number, number, number, number] = [
      threeColor.r, threeColor.g, threeColor.b, opacity,
    ];
    const numSegments = Math.floor((points.length - 1) / 3);
    const segs: Array<{
      p0: number[]; p1: number[]; p2: number[]; p3: number[];
      widthStart: number; widthEnd: number;
      rgba: [number, number, number, number];
    }> = [];
    for (let i = 0; i < numSegments; i++) {
      const idx = i * 3;
      // Use strokeWidths array if provided, otherwise uniform width
      const w0 = strokeWidths?.[idx] ?? strokeWidth;
      const w1 = strokeWidths?.[idx + 3] ?? strokeWidths?.[strokeWidths.length - 1] ?? w0;
      segs.push({
        p0: points[idx],
        p1: points[idx + 1],
        p2: points[idx + 2],
        p3: points[idx + 3],
        widthStart: w0,
        widthEnd: w1,
        rgba,
      });
    }
    return segs;
  }

  private _updateGeometryInPlace(segs: ReturnType<BezierSDFRenderer['_extractSegments']>): void {
    const geo = this._mesh.geometry as THREE.InstancedBufferGeometry;
    const count = segs.length;
    if (count === 0) {
      this._mesh.visible = false;
      return;
    }
    this._mesh.visible = true;
    const p0Attr = geo.getAttribute('aP0') as THREE.InstancedBufferAttribute;
    const p1Attr = geo.getAttribute('aP1') as THREE.InstancedBufferAttribute;
    const p2Attr = geo.getAttribute('aP2') as THREE.InstancedBufferAttribute;
    const p3Attr = geo.getAttribute('aP3') as THREE.InstancedBufferAttribute;
    const wStartAttr = geo.getAttribute('aWidthStart') as THREE.InstancedBufferAttribute;
    const wEndAttr = geo.getAttribute('aWidthEnd') as THREE.InstancedBufferAttribute;
    const colorAttr = geo.getAttribute('aColor') as THREE.InstancedBufferAttribute;
    for (let i = 0; i < count; i++) {
      const s = segs[i];
      const i3 = i * 3, i4 = i * 4;
      p0Attr.array[i3] = s.p0[0];
      p0Attr.array[i3 + 1] = s.p0[1];
      p0Attr.array[i3 + 2] = s.p0[2] ?? 0;
      p1Attr.array[i3] = s.p1[0];
      p1Attr.array[i3 + 1] = s.p1[1];
      p1Attr.array[i3 + 2] = s.p1[2] ?? 0;
      p2Attr.array[i3] = s.p2[0];
      p2Attr.array[i3 + 1] = s.p2[1];
      p2Attr.array[i3 + 2] = s.p2[2] ?? 0;
      p3Attr.array[i3] = s.p3[0];
      p3Attr.array[i3 + 1] = s.p3[1];
      p3Attr.array[i3 + 2] = s.p3[2] ?? 0;
      (wStartAttr.array as Float32Array)[i] = s.widthStart;
      (wEndAttr.array as Float32Array)[i] = s.widthEnd;
      colorAttr.array[i4] = s.rgba[0];
      colorAttr.array[i4 + 1] = s.rgba[1];
      colorAttr.array[i4 + 2] = s.rgba[2];
      colorAttr.array[i4 + 3] = s.rgba[3];
    }
    p0Attr.needsUpdate = true;
    p1Attr.needsUpdate = true;
    p2Attr.needsUpdate = true;
    p3Attr.needsUpdate = true;
    wStartAttr.needsUpdate = true;
    wEndAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  }

  private _rebuildGeometry(segs: ReturnType<BezierSDFRenderer['_extractSegments']>): void {
    // Save current transform before rebuild
    const oldPosition = this._mesh.position.clone();
    const oldRotation = this._mesh.rotation.clone();
    const oldScale = this._mesh.scale.clone();
    const old = this._mesh.geometry;

    if (segs.length === 0) {
      this._mesh.visible = false;
      return;
    }

    // Create base quad geometry FIRST with position attribute
    const baseGeo = new THREE.BufferGeometry();
    baseGeo.setAttribute('position', new THREE.BufferAttribute(
      new Float32Array([
        -1, -1, 0,  // bottom-left
         1, -1, 0,  // bottom-right
         1,  1, 0,  // top-right
        -1, -1, 0,
         1,  1, 0,
        -1,  1, 0,  // top-left
      ]), 3
    ));

    const geo = new THREE.InstancedBufferGeometry();
    geo.copy(baseGeo as THREE.InstancedBufferGeometry);
    geo.instanceCount = segs.length;

    // Add quad UVs
    geo.setAttribute('aQuadUV', new THREE.BufferAttribute(QUAD_UVS, 2));

    const count = segs.length;
    const p0 = new Float32Array(count * 3);
    const p1 = new Float32Array(count * 3);
    const p2 = new Float32Array(count * 3);
    const p3 = new Float32Array(count * 3);
    const ws = new Float32Array(count);
    const we = new Float32Array(count);
    const cl = new Float32Array(count * 4);

    for (let i = 0; i < count; i++) {
      const s = segs[i];
      const i3 = i * 3, i4 = i * 4;
      p0[i3]=s.p0[0]; p0[i3+1]=s.p0[1]; p0[i3+2]=s.p0[2]??0;
      p1[i3]=s.p1[0]; p1[i3+1]=s.p1[1]; p1[i3+2]=s.p1[2]??0;
      p2[i3]=s.p2[0]; p2[i3+1]=s.p2[1]; p2[i3+2]=s.p2[2]??0;
      p3[i3]=s.p3[0]; p3[i3+1]=s.p3[1]; p3[i3+2]=s.p3[2]??0;
      ws[i]=s.widthStart; we[i]=s.widthEnd;  // Variable width
      cl[i4]=s.rgba[0]; cl[i4+1]=s.rgba[1]; cl[i4+2]=s.rgba[2]; cl[i4+3]=s.rgba[3];
    }

    geo.setAttribute('aP0',        new THREE.InstancedBufferAttribute(p0, 3));
    geo.setAttribute('aP1',        new THREE.InstancedBufferAttribute(p1, 3));
    geo.setAttribute('aP2',        new THREE.InstancedBufferAttribute(p2, 3));
    geo.setAttribute('aP3',        new THREE.InstancedBufferAttribute(p3, 3));
    geo.setAttribute('aWidthStart',new THREE.InstancedBufferAttribute(ws, 1));
    geo.setAttribute('aWidthEnd',  new THREE.InstancedBufferAttribute(we, 1));
    geo.setAttribute('aColor',     new THREE.InstancedBufferAttribute(cl, 4));

    this._mesh.geometry = geo;
    // Restore transform after rebuild
    this._mesh.position.copy(oldPosition);
    this._mesh.rotation.copy(oldRotation);
    this._mesh.scale.copy(oldScale);
    old?.dispose();
  }
}
