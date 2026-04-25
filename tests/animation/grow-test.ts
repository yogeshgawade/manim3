// GrowTrack Animation Test - Create triangle, grow from center, move, then fade out
import type { Scene } from '../../src/scene/Scene';
import { Polygon } from '../../src/mobjects/geometry/Polygon';
import { fadeOut } from '../../src/animation/FadeGroupTrack';
import { growFromCenter } from '../../src/animation/GrowTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { BLUE, GREEN } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create a triangle
const triangle = new Polygon({
  vertices: [
    [-1, -1, 0],
    [1, -1, 0],
    [0, 1, 0],
  ],
  color: BLUE,
  strokeWidth: 3,
  fillColor: BLUE,
  fillOpacity: 0.3,
});

triangle.position = [0, 0, 0];

// Add to scene
scene.add(triangle);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Grow triangle from center
  scene.at(0).play(growFromCenter(triangle, 1.5, smooth));
  console.log('[GrowTrack Test] Phase 1: Triangle grows from center');

  // Phase 2: Move triangle to the right
  scene.at('+=0.5').play(
    moveTo(triangle, [3, 0, 0], { duration: 1.5, rateFunc: smooth })
  );
  console.log('[GrowTrack Test] Phase 2: Triangle moves right');

  // Phase 3: Fade out
  scene.at('+=0.5').play(fadeOut(triangle, { duration: 1, rateFunc: smooth }));
  console.log('[GrowTrack Test] Phase 3: Triangle fades out');

  console.log('[GrowTrack Test] Animation loaded!');
  console.log('- Phase 1: Blue triangle grows from center (1.5s)');
  console.log('- Phase 2: Triangle moves to position (3, 0, 0) (1.5s)');
  console.log('- Phase 3: Triangle fades out (1s)');
}

runAnimation().catch(console.error);
