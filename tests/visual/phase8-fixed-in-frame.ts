// Phase 8 Fixed-in-Frame Demo - HUD label that stays on screen
import type { Scene } from '../../src/scene/Scene';
import { ThreeDScene } from '../../src/scene/ThreeDScene';
import { Surface3D } from '../../src/mobjects/three/Surface3D';
import { FadeTrack } from '../../src/animation/FadeTrack';
import { MathTex } from '../../src/mobjects/text/MathTex';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as ThreeDScene;

// Create a 3D surface (sphere) to show we're in 3D
const sphere = new Surface3D({
  uvFunction: (u, v) => {
    const theta = u * Math.PI * 2;
    const phi = v * Math.PI;
    return [
      Math.sin(phi) * Math.cos(theta) * 2,
      Math.sin(phi) * Math.sin(theta) * 2,
      Math.cos(phi) * 2
    ];
  },
  uResolution: 64,
  vResolution: 32,
  color: '#4ECCA3',
  opacity: 0.3,
  doubleSided: true
});
sphere.position = [0, 0, 0];

// Add 3D objects to scene
scene.add(sphere);

// Create a HUD label (fixed in frame - stays on screen regardless of camera)
const hudLabel = new MathTex({
  latex: 'CBi',
  color: 'red',
  fontSize: 2,
});
hudLabel.position = [3, 3, 0]; // Position in world units

// Animation sequence using timeline builder pattern
async function runAnimation() {
  scene.scheduler.reset();

  // Wait for HUD label to render before adding to fixed-in-frame
  await hudLabel.waitForRender();
  

  // Add to scene with fixed-in-frame (HUD) mode
  scene.addFixedInFrameMobjects(hudLabel);

  // Camera orbit animation to demonstrate billboard always faces camera
  let orbitAngle = 0;
  const cameraOrbit = {
    id: 'camera-orbit',
    mobject: sphere, // dummy mobject for track
    duration: 6,
    rateFunc: (t: number) => t,
    prepare: () => { },
    interpolate: (alpha: number) => {
      orbitAngle += 0.02;
      const radius = 12;
      const x = Math.cos(orbitAngle) * radius;
      const z = Math.sin(orbitAngle) * radius;
      scene.setCamera([x, 4, z], [0, 0, 0]);
    },
    dispose: () => { }
  };

  scene
    // Fade in sphere at t=0
    .at(0).play(new FadeTrack(sphere, 0, 1, 1))
    // Fade in HUD label at t=1
    .at(1).play(new FadeTrack(hudLabel, 0, 1, 1))
    // Start camera orbit at t=2
    .at(2).play(cameraOrbit as any);

  scene.seek(0);
  console.log('Fixed-in-frame demo loaded!');
  console.log('- Sphere rotates with camera orbit');
  console.log('- HUD label stays fixed on screen (no rotation)');
  console.log('Click play button to start animation');
}

runAnimation().catch(console.error);
