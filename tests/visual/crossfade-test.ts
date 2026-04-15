// CrossFade Test
// Sequence: Fade in square → Move square → Crossfade to circle → Fade out circle
import type { Scene } from '../../src/scene/Scene';
import { Square } from '../../src/mobjects/geometry/Rectangle';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { crossFade } from '../../src/animation/CrossFadeTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { fadeIn, fadeOut } from '../../src/animation/FadeTrack';
import { smooth } from '../../src/utils/rateFunctions';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create square at left (starts invisible)
const square = new Square({
  sideLength: 1.5,
  color: '#58C4DD',
  fillOpacity: 0.5,
});
square.position = [-3, 0, 0];
square.opacity = 0;

// Create circle (starts invisible)
const circle = new Circle({
  radius: 1,
  color: '#FF6B6B',
  fillOpacity: 0.5,
});
circle.position = [3, 0, 0];
circle.opacity = 0;

// Add both to scene
scene.add(square);
scene.add(circle);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in square
  scene.at(0).play(fadeIn(square, 1, smooth));

  // Phase 2: Move square to different position
  scene.at('+=0.5').play(moveTo(square, [0, 2, 0], 1, smooth));

  // Phase 3: Crossfade square and circle
  scene.at('+=0.5').play(crossFade(square, circle, 2, smooth));

  // Phase 4: Fade out circle
  scene.at('+=0.5').play(fadeOut(circle, 1, smooth));

  console.log('[CrossFade Test] Animation loaded!');
  console.log('- Phase 1: Fade in square (1s)');
  console.log('- Phase 2: Move square up (+0.5s, 1s duration)');
  console.log('- Phase 3: Crossfade square→circle (+0.5s, 2s duration)');
  console.log('- Phase 4: Fade out circle (+0.5s, 1s duration)');
}

runAnimation().catch(console.error);
