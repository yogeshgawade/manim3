// Sphere to Torus Morph Animation
import type { Scene } from '../../src/scene/Scene';
import { ThreeDScene } from '../../src/scene/ThreeDScene';
import { ThreeDAxes } from '../../src/mobjects/three/ThreeDAxes';
import { Surface3D } from '../../src/mobjects/three/Surface3D';
import { ValueTracker } from '../../src/animation/ValueTrack';
import { TEAL, PURPLE } from '../../src/constants/colors';
import type { Vec3 } from '../../src/core/types';

declare global {
  interface Window { testScene: Scene; }
}

const scene = window.testScene as ThreeDScene;

// Torus parameters
const R = 2.5;
const r = 0.8;
const sphereRadius = R + r;

// Sphere: v=0 → north pole, v=0.5 → equator, v=1 → south pole
const sphereFunc = (u: number, v: number): Vec3 => {
  const theta = u * Math.PI * 2;
  const phi = v * Math.PI; // [0, π]
  return [
    sphereRadius * Math.sin(phi) * Math.cos(theta),
    sphereRadius * Math.cos(phi),
    sphereRadius * Math.sin(phi) * Math.sin(theta),
  ];
};

// Torus: shifted so v=0.5 → outer rim (matches sphere equator)
const torusFunc = (u: number, v: number): Vec3 => {
  const theta = u * Math.PI * 2;
  const phi = v * Math.PI * 2 + Math.PI;
  return [
    (R + r * Math.cos(phi)) * Math.cos(theta),
    r * Math.sin(phi),
    (R + r * Math.cos(phi)) * Math.sin(theta),
  ];
};

// Slerp morph
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

// Axes
const axes = new ThreeDAxes({
  xRange: [-4, 4, 1], yRange: [-4, 4, 1], zRange: [-4, 4, 1],
  axisColor: '#ffffff', tipLength: 0.3, tipRadius: 0.12, shaftRadius: 0.02,
});
scene.add(axes);

// Surface — checkerboard with two distinct colors, never changed
const surface = new Surface3D({
  uvFunction: sphereFunc,
  uRange: [0, 1],
  vRange: [0, 1],
  uResolution: 32,
  vResolution: 32,
  checkerboardColors: [TEAL, PURPLE],
  opacity: 0.9,
  doubleSided: true,
});
scene.add(surface);

async function runAnimation() {
  scene.scheduler.reset();
  scene.setCamera([8, 6, 8], [0, 0, 0]);

  let tick = 0;

  // Phase 1: Sphere → Torus (0–3s)
  const t1 = new ValueTracker(0);
  scene.at(0).play(
    t1.animateTo(1, 3, easeInOut, (t) => {
      surface.setUVFunction(slerpMorph(sphereFunc, torusFunc, t));
      //surface.uRange = [0, 1 + (++tick) * Number.EPSILON];
      surface.markDirty();
    })
  );

  // Phase 2: Torus → Sphere (3–6s)
  const t2 = new ValueTracker(0);
  scene.at(3).play(
    t2.animateTo(1, 3, easeInOut, (t) => {
      surface.setUVFunction(slerpMorph(torusFunc, sphereFunc, t));
      //surface.uRange = [0, 1 + (++tick) * Number.EPSILON];
      surface.markDirty();
    })
  );

  // Camera orbit
  const camT = new ValueTracker(0);
  scene.at(0).play(
    camT.animateTo(1, 6, (t) => t, (t) => {
      const angle = t * Math.PI * 2;
      scene.setCamera(
        [10 * Math.cos(angle), 6, 10 * Math.sin(angle)],
        [0, 0, 0]
      );
    })
  );

  scene.seek(0);
}

runAnimation().catch(console.error);