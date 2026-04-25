// IndicateTrack Animation Test - Create square, fade in, indicate (scale + color), then fade out
import type { Scene } from '../../src/scene/Scene';
import { Square } from '../../src/mobjects/geometry/Rectangle';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { indicate } from '../../src/animation/IndicateTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { BLUE, YELLOW, RED } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create a blue square
const square = new Square({
  sideLength: 2,
  color: BLUE,
  strokeWidth: 4,
  fillColor: BLUE,
  fillOpacity: 0.3,
});

square.position = [0, 0, 0];

// Add to scene
scene.add(square);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in the square
  scene.at(0).play(fadeIn(square, { duration: 1, rateFunc: smooth }));
  console.log('[Indicate Test] Phase 1: Square fades in');

  // Phase 2: Indicate the square (scale up to 1.5x and turn yellow)
  scene.at('+=0.5').play(
    indicate(square, { duration: 1.5, scaleFactor: 1.5, color: YELLOW })
  );
  console.log('[Indicate Test] Phase 2: Square indicates (scales + color change)');

  // Phase 3: Indicate again with different color
  scene.at('+=0.5').play(
    indicate(square, { duration: 1, scaleFactor: 1.3, color: RED })
  );
  console.log('[Indicate Test] Phase 3: Second indicate with red color');

  // Phase 4: Fade out
  scene.at('+=0.5').play(fadeOut(square, { duration: 1, rateFunc: smooth }));
  console.log('[Indicate Test] Phase 4: Square fades out');

  console.log('[Indicate Test] Animation loaded!');
  console.log('- Phase 1: Blue square fades in (1s)');
  console.log('- Phase 2: Square indicates: scales to 1.5x and turns yellow (1.5s)');
  console.log('- Phase 3: Second indicate: scales to 1.3x and turns red (1s)');
  console.log('- Phase 4: Square fades out (1s)');
}

runAnimation().catch(console.error);
