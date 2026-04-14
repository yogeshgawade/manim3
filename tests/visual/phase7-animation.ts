// Phase 7 Animation Logic - 3D scene with Surface3D, ThreeDAxes
import type { ThreeDScene } from '../../src/scene/ThreeDScene';
import { Surface3D } from '../../src/mobjects/three/Surface3D';
import { ThreeDAxes } from '../../src/mobjects/three/ThreeDAxes';
import { fadeIn } from '../../src/animation/FadeTrack';
import { FadeTrack } from '../../src/animation/FadeTrack';
import { rotateTo } from '../../src/animation/RotateTrack';

declare global {
  interface Window {
    testScene: ThreeDScene;
  }
}

const scene = window.testScene;

// 1. ThreeDAxes - X/Y/Z coordinate axes (starts visible)
const axes = new ThreeDAxes({
  xRange: [-4, 4, 1],
  yRange: [-4, 4, 1],
  zRange: [-4, 4, 1],
  strokeWidth: 2,
  withLabels: true,
});

// 2. Checkerboard saddle (starts invisible)
const saddle = new Surface3D({
  uvFunction: (u, v) => {
    const x = (u - 0.5) * 4;
    const z = (v - 0.5) * 4;
    return [x, (x * x - z * z) / 2, z];
  },
  uResolution: 32,
  vResolution: 32,
  opacity: 0, // Start invisible
  wireframe: false,
  doubleSided: true,
  checkerboardColors: ['#FFD93D', '#6BCB77'], // Yellow and green checkerboard
});

// Add to scene (captures initial states)
scene.add(axes, saddle);

// Build animation timeline
const buildTimeline = () => {
  scene.scheduler.reset();

  scene
    // Fade in axes first
    .at(0).play(fadeIn(axes, 0.5))
    
    // Then fade in sphere
    .at(0.5).play(new FadeTrack(saddle, 0, 0.8, 1))
    
    // Rotate saddle (2-6s)
    .at(2).play(rotateTo(saddle, [0, Math.PI * 2, 0], 4));

  console.log('[Phase7] Timeline built:', scene.scheduler.totalDuration.toFixed(2) + 's');
};

// Initialize
buildTimeline();
scene.seek(0);
console.log('Phase 7 animation loaded.');
