// Circle Test - Two Phase Animation
import type { Scene } from '../../src/scene/Scene';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { create } from '../../src/animation/CreateGroupTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { rotateTo } from '../../src/animation/RotateTrack';
import { colorTo } from '../../src/animation/ColorTrack';
import { scaleTo } from '../../src/animation/ScaleTrack';
import { GREEN } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Single circle for all animations
const circle = new Circle({
  radius: 1,
  fillOpacity: 0.3,
  strokeWidth: 4,
});
circle.position = [-3, 0, 0];
scene.add(circle);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in on left, move right, fade out
  scene.at(1).play(fadeIn(circle, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(circle, [3, 0, 0], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeOut(circle, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(create(circle, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(circle, [0, 0, 0], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(rotateTo(circle, [0, 0, Math.PI * 2], { duration: 1.5, rateFunc: smooth }));
  //scene.at('+=0.5').play(colorTo(circle, GREEN, { duration: 2, rateFunc: smooth }));
  scene.at('+=0.5').play(scaleTo(circle, 1.5, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeOut(circle, { duration: 1, rateFunc: smooth }));

  console.log('[Circle Test] Animation loaded!');
  console.log('- Phase 1: Fade in left, move right, fade out');
  console.log('- Phase 2: Create, move center, rotate, fade out');
}

runAnimation().catch(console.error);
