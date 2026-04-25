// BlinkTrack Animation Test - Create circle, fade in, blink, then fade out
import type { Scene } from '../../src/scene/Scene';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { blink } from '../../src/animation/BlinkTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { YELLOW, BLUE } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create a yellow circle
const circle = new Circle({
  radius: 1.5,
  color: YELLOW,
  strokeWidth: 4,
  fillColor: YELLOW,
  fillOpacity: 0.4,
});

circle.position = [0, 0, 0];

// Add to scene
scene.add(circle);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in the circle
  scene.at(0).play(fadeIn(circle, { duration: 1, rateFunc: smooth }));
  console.log('[Blink Test] Phase 1: Circle fades in');

  // Phase 2: Blink the circle (3 blinks)
  scene.at('+=0.5').play(
    blink(circle, { duration: 2, nBlinks: 3, minOpacity: 0.2 })
  );
  console.log('[Blink Test] Phase 2: Circle blinks 3 times');

  // Phase 3: Fade out
  scene.at('+=0.5').play(fadeOut(circle, { duration: 1, rateFunc: smooth }));
  console.log('[Blink Test] Phase 3: Circle fades out');

  console.log('[Blink Test] Animation loaded!');
  console.log('- Phase 1: Yellow circle fades in (1s)');
  console.log('- Phase 2: Circle blinks 3 times with min opacity 0.2 (2s)');
  console.log('- Phase 3: Circle fades out (1s)');
}

runAnimation().catch(console.error);
