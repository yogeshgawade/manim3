// TexturedSurface FadeIn + Morph Test - Sphere to Torus and back
import type { Scene } from '../../src/scene/Scene';
import { ThreeDScene } from '../../src/scene/ThreeDScene';
import { texturedSphere } from '../../src/mobjects/three/TexturedSurface';
import { fadeIn } from '../../src/animation/FadeGroupTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { ValueTracker } from '../../src/animation/ValueTrack';
import type { Vec3 } from '../../src/core/types';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as ThreeDScene;

// Set camera position for 3D view
scene.setCamera([6, 4, 6], [0, 0, 0]);

// Torus parameters
const R = 2.5;
const r = 0.8;
const sphereRadius = R + r;

// Sphere: v=0 -> north pole, v=0.5 -> equator, v=1 -> south pole
const sphereFunc = (u: number, v: number): Vec3 => {
  const theta = u * Math.PI * 2;
  const phi = v * Math.PI; // [0, π]
  return [
    sphereRadius * Math.sin(phi) * Math.cos(theta),
    sphereRadius * Math.cos(phi),
    sphereRadius * Math.sin(phi) * Math.sin(theta),
  ];
};

// Torus: shifted so v=0.5 -> outer rim (matches sphere equator)
const torusFunc = (u: number, v: number): Vec3 => {
  const theta = u * Math.PI * 2;
  const phi = v * Math.PI * 2 + Math.PI;
  return [
    (R + r * Math.cos(phi)) * Math.cos(theta),
    r * Math.sin(phi),
    (R + r * Math.cos(phi)) * Math.sin(theta),
  ];
};

// Slerp morph for smooth surface transitions
const slerpMorph = (
  f1: (u: number, v: number) => Vec3,
  f2: (u: number, v: number) => Vec3,
  t: number
) => (u: number, v: number): Vec3 => {
  const [x1, y1, z1] = f1(u, v);
  const [x2, y2, z2] = f2(u, v);

  const r1 = Math.sqrt(x1*x1 + y1*y1 + z1*z1);
  const r2 = Math.sqrt(x2*x2 + y2*y2 + z2*z2);
  const rT = r1 + (r2 - r1) * t;

  const nx1 = x1/r1, ny1 = y1/r1, nz1 = z1/r1;
  const nx2 = x2/r2, ny2 = y2/r2, nz2 = z2/r2;

  const dot = Math.max(-1, Math.min(1, nx1*nx2 + ny1*ny2 + nz1*nz2));
  const omega = Math.acos(dot);

  let dx, dy, dz;
  if (omega < 1e-4 || omega > Math.PI - 1e-4) {
    const nx = nx1 + (nx2 - nx1) * t;
    const ny = ny1 + (ny2 - ny1) * t;
    const nz = nz1 + (nz2 - nz1) * t;
    const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
    dx = nx/len; dy = ny/len; dz = nz/len;
  } else {
    const s = 1 / Math.sin(omega);
    const a = Math.sin((1 - t) * omega) * s;
    const b = Math.sin(t * omega) * s;
    dx = a*nx1 + b*nx2;
    dy = a*ny1 + b*ny2;
    dz = a*nz1 + b*nz2;
  }

  return [dx * rT, dy * rT, dz * rT];
};

const easeInOut = (t: number) =>
  t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;

// Create a textured sphere (Earth-like)
const earth = texturedSphere({
  textureUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
  radius: sphereRadius,
  center: [0, 0, 0],
  resolution: 64,
  opacity: 0,
});

scene.add(earth);

// Get the underlying Surface3D for morphing
const surface = earth.getSurface();

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in
  scene.at(0).play(fadeIn(earth, { duration: 1.5, rateFunc: smooth }));

  // Phase 2: Sphere -> Torus (1.5s - 4.5s)
  const morphToTorus = new ValueTracker(0);
  scene.at(1.5).play(
    morphToTorus.animateTo(1, 3, easeInOut, (t) => {
      surface.setUVFunction(slerpMorph(sphereFunc, torusFunc, t));
      earth.markDirty(); // Mark TexturedSurface dirty so renderer rebuilds geometry
    })
  );

  // Phase 3: Torus -> Sphere (4.5s - 7.5s)
  const morphToSphere = new ValueTracker(0);
  scene.at(4.5).play(
    morphToSphere.animateTo(1, 3, easeInOut, (t) => {
      surface.setUVFunction(slerpMorph(torusFunc, sphereFunc, t));
      earth.markDirty(); // Mark TexturedSurface dirty so renderer rebuilds geometry
    })
  );

  

  console.log('[TexturedSurface Morph Test] Animation loaded!');
  console.log('- Phase 1: Fade in (0-1.5s)');
  console.log('- Phase 2: Sphere -> Torus (1.5-4.5s)');
  console.log('- Phase 3: Torus -> Sphere (4.5-7.5s)');
  console.log('- Camera rotates throughout');
}

runAnimation().catch(console.error);
