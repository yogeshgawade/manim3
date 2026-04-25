// ShowPassingFlashTrack Animation Test - Create a sine wave curve, show passing flash
import type { Scene } from '../../src/scene/Scene';
import { FunctionGraph } from '../../src/mobjects/graphing/FunctionGraph';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { showPassingFlash } from '../../src/animation/ShowPassingFlashTrack';
import { taperedFlash } from '../../src/animation/TaperedFlashTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { BLUE, YELLOW } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create a sine wave function graph
const sineWave = new FunctionGraph({
  func: (x: number) => Math.sin(x) * 2,
  xRange: [-6, 6],
  color: BLUE,
  strokeWidth: 3,
});

sineWave.position = [0, 0, 0];

// Add to scene
scene.add(sineWave);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in the sine wave
  scene.at(0).play(fadeIn(sineWave, { duration: 1, rateFunc: smooth }));
  console.log('[ShowPassingFlash Test] Phase 1: Sine wave fades in');

  // Phase 2: Show passing flash traveling along the curve
  scene.at('+=0.5').play(
    showPassingFlash(sineWave, {
      duration: 2,
      color: YELLOW,
      timeWidth: 0.05,
      strokeWidth: 6,
    })
  );
  console.log('[ShowPassingFlash Test] Phase 2: Yellow flash travels along sine wave');

  // Phase 3: Tapered flash with different settings
  scene.at('+=0.5').play(
    taperedFlash(sineWave, {
      duration: 3,
      color: '#ff6600', // Orange
      timeWidth: 0.1,
      strokeWidth: 8,
    })
  );
  console.log('[ShowPassingFlash Test] Phase 3: Orange tapered flash travels along sine wave');

  // Phase 4: Fade out
  scene.at('+=0.5').play(fadeOut(sineWave, { duration: 1, rateFunc: smooth }));
  console.log('[ShowPassingFlash Test] Phase 4: Sine wave fades out');

  console.log('[ShowPassingFlash Test] Animation loaded!');
  console.log('- Phase 1: Blue sine wave fades in (1s)');
  console.log('- Phase 2: Yellow flash travels along curve (2s)');
  console.log('- Phase 3: Orange tapered flash travels along curve (1.5s)');
  console.log('- Phase 4: Sine wave fades out (1s)');
}

runAnimation().catch(console.error);
