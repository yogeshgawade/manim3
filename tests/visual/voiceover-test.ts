// Voiceover Test
// Sequence: Narration-driven animations synced to spoken bookmarks
import type { Scene } from '../../src/scene/Scene';
import { Square } from '../../src/mobjects/geometry/Rectangle';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { crossFade } from '../../src/animation/CrossFadeTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { fadeIn, fadeOut } from '../../src/animation/FadeTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { withVoiceover } from '../../src/voiceover/withVoiceover';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create square (starts invisible)
const square = new Square({
  sideLength: 1.5,
  color: '#58C4DD',
  fillOpacity: 0.5,
});
square.position = [-2, 0, 0];
square.opacity = 0;

// Create circle (starts invisible)
const circle = new Circle({
  radius: 1,
  color: '#FF6B6B',
  fillOpacity: 0.5,
});
circle.position = [2, 0, 0];
circle.opacity = 0;

// Add both to scene
scene.add(square);
scene.add(circle);

async function runAnimation() {
  scene.scheduler.reset();

  // Generate voiceover with multiple clips — offsets computed automatically
  const SCRIPTS = {
    intro: "<bookmark mark='square'/> A square appears.",
    move: "<bookmark mark='move'/> Now it moves upward.",
    transform: "<bookmark mark='circle'/> Watch it transform into a circle.",
    outro: "<bookmark mark='fade'/> Finally, the circle fades away."
  };

  const clips = await withVoiceover(scene.scheduler, [
    SCRIPTS.intro,
    SCRIPTS.move,
    SCRIPTS.transform,
    SCRIPTS.outro
  ]);

  // Phase 1: Fade in square at 'square' bookmark
  scene.at('bookmark:square').play(fadeIn(square, 0.8, smooth));

  // Phase 2: Move square up at 'move' bookmark
  scene.at('bookmark:move').play(moveTo(square, [0, 2, 0], 1, smooth));

  // Phase 3: Crossfade square to circle at 'circle' bookmark
  scene.at('bookmark:circle').play(crossFade(square, circle, 1.5, smooth));

  // Phase 4: Fade out circle at 'fade' bookmark
  scene.at('bookmark:fade').play(fadeOut(circle, 0.8, smooth));
}

runAnimation().catch(console.error);
