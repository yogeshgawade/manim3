// Phase 7 Animation Logic - 3D scene with HUD labels
import type { ThreeDScene } from '../../src/scene/ThreeDScene';
import { Surface3D } from '../../src/mobjects/three/Surface3D';
import { ThreeDAxes } from '../../src/mobjects/three/ThreeDAxes';
import { fadeIn } from '../../src/animation/FadeTrack';
import { FadeTrack } from '../../src/animation/FadeTrack';
import { rotateTo } from '../../src/animation/RotateTrack';
import { MathTex } from '../../src/mobjects/text/MathTex';

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

// 3. HUD Label - Math equation with billboard mode
const label = new MathTex({
  latex: 'z = \\frac{x^2 - y^2}{2}', // Saddle equation
  color: '#ffffff',
  fontSize: 0.8,
  position: [0, 3, 0], // Above the saddle
  strokeWidth: 1,
  fillOpacity: 1,
});
(label as any).billboard = true; // Always face camera

// Add regular mobjects
scene.add(axes, saddle);

// Wait for MathTex to render, then add to scene and build timeline
label.waitForRender().then(() => {
  // Add label as regular mobject (billboard flag handles rotation)
  scene.add(label);
  
  // Build animation timeline
  const buildTimeline = () => {
    scene.scheduler.reset();

    scene
      // Fade in axes first
      .at(0).play(fadeIn(axes, 0.5))
      
      // Fade in saddle to 0.8 opacity
      .at(0.5).play(new FadeTrack(saddle, 0, 0.8, 1))
      
      // Fade in HUD label
      .at(1).play(fadeIn(label, 0.5))
      
      // Camera orbit around scene (2-6s) - demonstrates HUD always faces camera
      .at(2).play({
        id: 'camera-orbit',
        prepare() {},
        dispose() {},
        duration: 4,
        rateFunc: (t) => t,
        mobject: { id: 'camera' } as any,
        interpolate(alpha) {
          const angle = alpha * Math.PI * 2;
          const radius = 8;
          (scene as any).setCamera([radius * Math.cos(angle), 4, radius * Math.sin(angle)], [0, 0, 0]);
        },
        remover: false,
      });

    console.log('[Phase7-HUD] Timeline built:', scene.scheduler.totalDuration.toFixed(2) + 's');
  };

  // Initialize
  buildTimeline();
  scene.seek(0);
  console.log('Phase 7 HUD demo loaded.');
}).catch((err) => {
  console.error('Error rendering MathTex:', err);
});
