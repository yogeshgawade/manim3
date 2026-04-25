// DecimalMatrix Test - Two Phase Animation with DecimalNumber entries
import type { Scene } from '../../src/scene/Scene';
import { DecimalMatrix } from '../../src/mobjects/matrix';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { create } from '../../src/animation/CreateGroupTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { rotateTo } from '../../src/animation/RotateTrack';
import { scaleTo } from '../../src/animation/ScaleTrack';
import { RED, BLUE, GREEN, YELLOW } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create DecimalMatrix with decimal values
// DecimalNumber is synchronous - no waitForRender needed
const matrix = new DecimalMatrix([
  [1.234, 2.567, 3.891],
  [4.012, 5.345, 6.678],
  [7.901, 8.234, 9.567],
], {
  bracketType: '[]',
  numDecimalPlaces: 2,
  vBuff: 0.4,
  hBuff: 1.0,
  elementColor: YELLOW,
  bracketColor: RED,
  fontSize: 36,
  position: [-3, 0, 0],
});

scene.add(matrix);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in on left, move right, fade out
  scene.at(1).play(fadeIn(matrix, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(matrix, [3, 0, 0], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeOut(matrix, { duration: 1, rateFunc: smooth }));

  // Phase 2: Reappear at center with create animation
  scene.at('+=0.5').play(create(matrix, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(matrix, [0, 0, 0], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(rotateTo(matrix, [0, 0, Math.PI * 2], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(scaleTo(matrix, 1.5, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeOut(matrix, { duration: 1, rateFunc: smooth }));

  console.log('[DecimalMatrix Test] Animation loaded!');
  console.log('- Phase 1: Fade in left, move right, fade out');
  console.log('- Phase 2: Create, move center, rotate, scale, fade out');
  console.log('- DecimalMatrix uses DecimalNumber entries (synchronous, no waitForRender)');
}

runAnimation().catch(console.error);
