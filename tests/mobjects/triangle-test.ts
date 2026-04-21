// Triangle Test - Two Phase Animation
import type { Scene } from '../../src/scene/Scene';
import { Triangle } from '../../src/mobjects/geometry/Polygon';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { create } from '../../src/animation/CreateGroupTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { rotateTo } from '../../src/animation/RotateTrack';
import { colorTo } from '../../src/animation/ColorTrack';
import { scaleTo } from '../../src/animation/ScaleTrack';
import { GREEN, RED } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Single triangle for all animations
const triangle = new Triangle({
  color: RED,
  fillOpacity: 0.4,
  strokeWidth: 4,
});
triangle.position = [-3, 0, 0];
scene.add(triangle);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in on left, move right, fade out
  scene.at(1).play(fadeIn(triangle, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(triangle, [3, 0, 0], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeOut(triangle, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(create(triangle, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(triangle, [0, 0, 0], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(rotateTo(triangle, [0, 0, Math.PI/4], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(colorTo(triangle, GREEN, { duration: 2, rateFunc: smooth }));
  scene.at('+=0.5').play(scaleTo(triangle, 1.5, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeOut(triangle, { duration: 1, rateFunc: smooth }));

  console.log('[Triangle Test] Animation loaded!');
  console.log('- Phase 1: Fade in left, move right, fade out');
  console.log('- Phase 2: Create, move center, rotate, fade out');
}

runAnimation().catch(console.error);
