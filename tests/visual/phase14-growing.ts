// Phase 14 - Single Growing Animation Test
// Tests one animation at a time: Fade In -> GrowFromPoint -> Fade Out
import type { Scene } from '../../src/scene/Scene';
import { Square } from '../../src/mobjects/geometry/Rectangle';
import { Dot } from '../../src/mobjects/geometry/Dot';
import { fadeIn, fadeOut } from '../../src/animation/FadeTrack';
import { growFromPoint } from '../../src/animation/GrowTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { ORIGIN } from '../../src/core/types';
import { RED } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create a reference dot at origin (where the square will grow FROM)
const originDot = new Dot({
  point: ORIGIN,
  color: RED,
  radius: 0.08,
});
scene.add(originDot);

// Create a square positioned away from origin
const square = new Square({
  sideLength: 1.5,
  color: '#58C4DD',
  fillOpacity: 0.3,
});
square.moveTo([2.5, 1.5, 0]); // Final position

// Start invisible
//square.opacity = 0;

scene.add(square);

async function runAnimation() {
  scene.scheduler.reset();

  // Sequence: Fade In -> Grow -> Hold -> Fade Out
  // Phase 1: Fade in the origin dot first
  scene.at(0).play(fadeIn(originDot, 0.3));

  // Phase 2: Square grows FROM origin (red dot) TO its final position
  // The square starts at scale 0 at origin, then scales up while moving to [2.5, 1.5, 0]
  scene.at('+=0.2').play(growFromPoint(square, ORIGIN, 1.5, smooth));

  // Phase 3: Hold for viewing
  scene.addBookmark('hold');

  // Phase 4: Fade out
  scene.at('+=0.5').play(fadeOut(square, 0.5));
  scene.at('+=0').play(fadeOut(originDot, 0.3));

  console.log('[Phase14] growFromPoint test loaded!');
  console.log('- Phase 1: Red dot appears at origin');
  console.log('- Phase 2: Square grows FROM origin dot TO its final position');
  console.log('- Phase 3: Hold (bookmark)');
  console.log('- Phase 4: Fade out');
}

runAnimation().catch(console.error);
