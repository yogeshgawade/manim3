// Square Test - Two Phase Animation
import type { Scene } from '../../src/scene/Scene';
import { Square } from '../../src/mobjects/geometry/Rectangle';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { create } from '../../src/animation/CreateGroupTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { rotateTo } from '../../src/animation/RotateTrack';
import { colorTo } from '../../src/animation/ColorTrack';
import { scaleTo } from '../../src/animation/ScaleTrack';
import { GREEN } from '../../src/constants/colors';
import { RED } from 'manim-web';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Single square for all animations
const square = new Square({
  color: RED,
  sideLength: 2,
  fillOpacity: 0,
  strokeWidth: 4,
});
square.position = [-3, 0, 0];
scene.add(square);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in on left, move right, fade out
  scene.at(1).play(fadeIn(square, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(square, [3, 0, 0], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeOut(square, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(create(square, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(square, [0, 0, 0], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(rotateTo(square, [0, 0, Math.PI/4], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(colorTo(square, GREEN, { duration: 2, rateFunc: smooth }));
  scene.at('+=0.5').play(scaleTo(square, 1.5, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeOut(square, { duration: 1, rateFunc: smooth }));

  console.log('[Square Test] Animation loaded!');
  console.log('- Phase 1: Fade in left, move right, fade out');
  console.log('- Phase 2: Create, move center, rotate, fade out');
}

runAnimation().catch(console.error);
