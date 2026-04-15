// Phase 14 - Growing + Shrink Animation Test
// Tests: Fade In -> GrowFromCenter -> Hold -> ShrinkToCenter -> Fade Out
import type { Scene } from '../../src/scene/Scene';
import { Square } from '../../src/mobjects/geometry/Rectangle';
import { fadeIn, fadeOut } from '../../src/animation/FadeTrack';
import { growFromCenter } from '../../src/animation/GrowTrack';
import { shrinkToCenter } from '../../src/animation/ShrinkTrack';
import { smooth } from '../../src/utils/rateFunctions';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create a square in the center
const square = new Square({
  sideLength: 2,
  color: '#58C4DD',
  fillOpacity: 0.3,
});

// Start invisible
square.opacity = 0;

scene.add(square);

async function runAnimation() {
  scene.scheduler.reset();

  // Sequence: Fade In -> Grow -> Hold -> Shrink -> Fade Out
  // Phase 1: Fade in
  scene.at(0).play(fadeIn(square, 0.5));

  // Phase 2: GrowFromCenter - scales from 0 to full size
  scene.at('+=0.3').play(growFromCenter(square, 1, smooth));

  // Phase 3: Hold for viewing
  scene.addBookmark('hold');

  // Phase 4: ShrinkToCenter - opposite of grow, scales to 0
  scene.at('+=0.5').play(shrinkToCenter(square, 1, smooth));

  // Phase 5: Fade out (now invisible but completes the pattern)
  scene.at('+=0.3').play(fadeOut(square, 0.2));

  console.log('[Phase14] Grow + Shrink test loaded!');
  console.log('- Phase 1: Fade in (0.5s)');
  console.log('- Phase 2: GrowFromCenter (+0.3s, 1s duration)');
  console.log('- Phase 3: Hold (bookmark)');
  console.log('- Phase 4: ShrinkToCenter (+0.5s, 1s duration) - opposite of grow!');
  console.log('- Phase 5: Fade out');
}

runAnimation().catch(console.error);
