/**
 * BezierShaderMaterial — ZERO CHANGES from old project.
 * GPU SDF cubic Bezier rendering — ManimGL quality.
 */
import * as THREE from 'three';

const vertexShader = /* glsl */`
precision highp float;
uniform vec2 uResolution;
uniform float uPixelRatio;
attribute vec3 aP0;
attribute vec3 aP1;
attribute vec3 aP2;
attribute vec3 aP3;
attribute float aWidthStart;
attribute float aWidthEnd;
attribute vec4 aColor;
attribute vec2 aQuadUV;
varying vec2 vUV;
varying vec4 vColor;
varying float vWidthStart;
varying float vWidthEnd;
varying vec2 vP0;
varying vec2 vP1;
varying vec2 vP2;
varying vec2 vP3;
varying float vHalfWidthPx0;
varying float vHalfWidthPx1;
vec2 clipToScreen(vec4 clip) {
  vec2 ndc = clip.xy / clip.w;
  return (ndc * 0.5 + 0.5) * uResolution;
}
void main() {
  vec4 cp0 = projectionMatrix * modelViewMatrix * vec4(aP0, 1.0);
  vec4 cp1 = projectionMatrix * modelViewMatrix * vec4(aP1, 1.0);
  vec4 cp2 = projectionMatrix * modelViewMatrix * vec4(aP2, 1.0);
  vec4 cp3 = projectionMatrix * modelViewMatrix * vec4(aP3, 1.0);
  vec2 sp0 = clipToScreen(cp0);
  vec2 sp1 = clipToScreen(cp1);
  vec2 sp2 = clipToScreen(cp2);
  vec2 sp3 = clipToScreen(cp3);
  vP0 = sp0; vP1 = sp1; vP2 = sp2; vP3 = sp3;
  vColor = aColor;
  vWidthStart = aWidthStart;
  vWidthEnd = aWidthEnd;
  vHalfWidthPx0 = aWidthStart * 0.5 * uPixelRatio;
  vHalfWidthPx1 = aWidthEnd   * 0.5 * uPixelRatio;
  vec2 bmin = min(min(sp0, sp1), min(sp2, sp3));
  vec2 bmax = max(max(sp0, sp1), max(sp2, sp3));
  float maxHalf = max(vHalfWidthPx0, vHalfWidthPx1);
  float pad = maxHalf + 4.0;
  bmin -= pad; bmax += pad;
  vec2 screenPos = mix(bmin, bmax, aQuadUV);
  vec2 ndc = (screenPos / uResolution) * 2.0 - 1.0;
  float avgW = (cp0.w + cp1.w + cp2.w + cp3.w) * 0.25;
  float avgZ = (cp0.z/cp0.w + cp1.z/cp1.w + cp2.z/cp2.w + cp3.z/cp3.w) * 0.25;
  gl_Position = vec4(ndc * avgW, avgZ * avgW, avgW);
  vUV = screenPos;
}
`;

const fragmentShader = /* glsl */`
precision highp float;
varying vec2 vUV;
varying vec4 vColor;
varying float vWidthStart;
varying float vWidthEnd;
varying vec2 vP0;
varying vec2 vP1;
varying vec2 vP2;
varying vec2 vP3;
varying float vHalfWidthPx0;
varying float vHalfWidthPx1;
vec2 evalBezier(float t) {
  float s=1.0-t;
  return s*s*s*vP0 + 3.0*s*s*t*vP1 + 3.0*s*t*t*vP2 + t*t*t*vP3;
}
vec2 evalBezierDeriv(float t) {
  float s=1.0-t;
  return 3.0*s*s*(vP1-vP0) + 6.0*s*t*(vP2-vP1) + 3.0*t*t*(vP3-vP2);
}
vec2 closestPointOnBezier(vec2 p) {
  float bestT=0.0; float bestDist2=1e20;
  for(int i=0;i<17;i++){
    float t=float(i)/16.0;
    vec2 pt=evalBezier(t)-p;
    float d2=dot(pt,pt);
    if(d2<bestDist2){bestDist2=d2;bestT=t;}
  }
  for(int i=0;i<5;i++){
    vec2 diff=evalBezier(bestT)-p;
    vec2 deriv=evalBezierDeriv(bestT);
    float f1=dot(diff,deriv);
    float s=1.0-bestT;
    vec2 d2=6.0*s*(vP2-2.0*vP1+vP0)+6.0*bestT*(vP3-2.0*vP2+vP1);
    float f2=dot(deriv,deriv)+dot(diff,d2);
    if(abs(f2)>1e-6) bestT-=f1/f2;
    bestT=clamp(bestT,0.0,1.0);
  }
  return vec2(length(evalBezier(bestT)-p),bestT);
}
void main() {
  vec2 result=closestPointOnBezier(vUV);
  float dist=result.x; float t=result.y;
  // Clip near segment boundaries to prevent overlap with adjacent segments
  if (t < 0.0001 || t > 0.9999) discard;
  float halfWidth=mix(vHalfWidthPx0,vHalfWidthPx1,t);
  float aa=min(1.0,halfWidth*0.5);
  float alpha=1.0-smoothstep(halfWidth-aa,halfWidth+aa,dist);
  if(alpha<0.001) discard;
  gl_FragColor=vec4(vColor.rgb,vColor.a*alpha);
}
`;

export interface BezierShaderMaterialOptions {
  transparent?: boolean;
  depthTest?:   boolean;
  depthWrite?:  boolean;
  blending?:    THREE.Blending;
  side?:        THREE.Side;
  pixelRatio?:  number;
  resolution?:  [number, number];
}

export function createBezierShaderMaterial(
  options: BezierShaderMaterialOptions = {},
): THREE.ShaderMaterial {
  const {
    transparent = true,
    depthTest   = true,
    depthWrite  = false,
    blending    = THREE.NormalBlending,
    side        = THREE.DoubleSide,
    pixelRatio  = 1,
    resolution  = [800, 450],
  } = options;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uPixelRatio: { value: pixelRatio },
      uResolution: { value: new THREE.Vector2(resolution[0], resolution[1]) },
    },
    transparent, depthTest, depthWrite, blending, side,
  });
}

export function updateBezierMaterialResolution(
  mat: THREE.ShaderMaterial,
  w: number, h: number, dpr = 1,
): void {
  mat.uniforms.uResolution?.value.set(w, h);
  if (mat.uniforms.uPixelRatio) mat.uniforms.uPixelRatio.value = dpr;
}
