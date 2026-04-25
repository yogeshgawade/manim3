// ApplyWave Animation Test - Fade in triangle, apply wave, fade out
import type { Scene } from '../../src/scene/Scene';
import { Triangle } from '../../src/mobjects/geometry/Polygon';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { applyWave } from '../../src/animation/ApplyWaveTrack';

import { smooth } from '../../src/utils/rateFunctions';
import { BLUE } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create a triangle for the wave animation
const triangle = new Triangle({
  color: BLUE,
  fillOpacity: 0.3,
  strokeWidth: 4,
});

// Add to scene
scene.add(triangle);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in the triangle
  scene.at(0).play(fadeIn(triangle, { duration: 1, rateFunc: smooth }));
  console.log('[ApplyWave Test] Phase 1: Triangle fade in');

  // Phase 2: Apply wave animation
  scene.at('+=0.5').play(
    applyWave(triangle, {
      duration: 2,
      rateFunc: smooth,
      direction: 'horizontal',
      amplitude: 0.3,
      wavelength: 1,
      speed: 1,
    })
  );
  console.log('[ApplyWave Test] Phase 2: Apply horizontal wave animation');

  // Phase 3: Fade out the triangle
  scene.at('+=0.5').play(fadeOut(triangle, { duration: 1, rateFunc: smooth }));
  console.log('[ApplyWave Test] Phase 3: Triangle fade out');

  console.log('[ApplyWave Test] Animation loaded!');
  console.log('- Phase 1: Triangle fades in');
  console.log('- Phase 2: Horizontal wave passes through triangle');
  console.log('- Phase 3: Triangle fades out');
}

runAnimation().catch(console.error);
