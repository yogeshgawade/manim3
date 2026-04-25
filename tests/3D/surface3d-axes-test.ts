// Surface3D + ThreeDAxes Test - 3D surface creation with clipping
import type { Scene } from '../../src/scene/Scene';
import { ThreeDScene } from '../../src/scene/ThreeDScene';
import { ThreeDAxes } from '../../src/mobjects/three/ThreeDAxes';
import { Surface3D } from '../../src/mobjects/three/Surface3D';
import { ValueTracker } from '../../src/animation/ValueTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn } from '../../src/animation/FadeGroupTrack';
import { TEAL, PURPLE, RED, GREEN, BLUE } from '../../src/constants/colors';
import type { Vec3 } from '../../src/core/types';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as ThreeDScene;

// Set camera position for 3D view
scene.setCamera([8, 6, 8], [0, 0, 0]);

// === Phase 1: Create 3D Axes ===
const axes = new ThreeDAxes({
  xRange: [-5, 5, 1],
  yRange: [-4, 4, 1],
  zRange: [-5, 5, 1],
  xColor: RED,
  yColor: GREEN,
  zColor: BLUE,
  showTicks: true,
  withLabels: true,
  tipLength: 0.3,
  shaftRadius: 0.01,
});

scene.add(axes);

// Surface functions
const waveFunc = (u: number, v: number): Vec3 => {
  const x = (u - 0.5) * 8; // -5 to 5
  const z = (v - 0.5) * 8; // -5 to 5
  const y = Math.sin(x) * Math.cos(z); // Wave height
  return [x, y, z];
};

const paraboloidFunc = (u: number, v: number): Vec3 => {
  const x = (u - 0.5) * 8; // -5 to 5
  const z = (v - 0.5) * 8; // -5 to 5
  const y = (x * x + z * z) / 10; // Paraboloid bowl shape
  return [x, y, z];
};

// Linear morph for height fields (only Y changes)
const lerpMorph = (
  f1: (u: number, v: number) => Vec3,
  f2: (u: number, v: number) => Vec3,
  t: number
) => (u: number, v: number): Vec3 => {
  const [x, y1, z] = f1(u, v);
  const [, y2] = f2(u, v);
  return [x, y1 + (y2 - y1) * t, z];
};

// === Phase 2: Create Surface3D (Wave surface) ===
const waveSurface = new Surface3D({
  uvFunction: waveFunc,
  uRange: [0, 1],
  vRange: [0, 1],
  uResolution: 24,
  vResolution: 24,
  color: TEAL,
  opacity: 0.6,
  doubleSided: true,
  checkerboardColors: [TEAL, PURPLE],
  // Start fully clipped (will animate clipping to reveal)
  clipX: -5,
});

scene.add(waveSurface);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in axes
  scene.at(0).play(fadeIn(axes, { duration: 1, rateFunc: smooth }));
  console.log('[Surface3D+Axes Test] Phase 1: ThreeDAxes fade in');

  // Phase 2: Animate surface creation using clipping
  // Start with clipX = -2 (nothing visible), animate to clipX = undefined (fully visible)
  const clipTracker = new ValueTracker(-5);

  scene.at(1).play(
    clipTracker.animateTo(5, 3, smooth, (value) => {
      if (value >= 4.9) {
        waveSurface.setClipX(undefined); // Remove clipping when fully revealed
      } else {
        waveSurface.setClipX(value);
      }
    })
  );

  // Phase 3: Morph wave to paraboloid (after surface fully revealed)
  const morphTracker = new ValueTracker(0);
  scene.at(4.5).play(
    morphTracker.animateTo(1, 3, smooth, (t) => {
      waveSurface.setUVFunction(lerpMorph(waveFunc, paraboloidFunc, t));
    })
  );

  // Phase 4: Rotate camera around the scene
  scene.at('+=0.5').play(
    new ValueTracker(0).animateTo(Math.PI * 2, 6, smooth, (angle) => {
      const radius = 8 * Math.sqrt(2);
      const camX = radius * Math.cos(angle + Math.PI/4);
      const camZ = radius * Math.sin(angle + Math.PI/4);
      scene.setCamera([camX, 6, camZ], [0, 0, 0]);
    })
  );

  console.log('[Surface3D+Axes Test] Animation loaded!');
  console.log('- Phase 1: ThreeDAxes visible');
  console.log('- Phase 2: Surface3D created with X-axis clipping animation');
  console.log('- Phase 3: Wave morphs to paraboloid');
  console.log('- Phase 4: Camera orbits 360 degrees around the scene');
}

runAnimation().catch(console.error);
