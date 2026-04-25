// Matrix Test - Two Phase Animation with MathTex entries
import type { Scene } from '../../src/scene/Scene';
import { Matrix, IntegerMatrix, DecimalMatrix } from '../../src/mobjects/matrix';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { create } from '../../src/animation/CreateGroupTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { rotateTo } from '../../src/animation/RotateTrack';
import { scaleTo } from '../../src/animation/ScaleTrack';
import { RED, BLUE, GREEN, YELLOW, WHITE } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create Matrix with MathTex entries (requires waitForRender)
const matrix = new Matrix([
  ['a', 'b', 'c'],
  ['d', 'e', 'f'],
  ['g', 'h', 'i'],
], {
  bracketType: '[]',
  vBuff: 0.8,
  hBuff: 1.6,
  elementColor: GREEN,
  bracketColor: BLUE,
  fontSize: 48,
  position: [-3, 0, 0],
});

// Wait for MathTex entries to render
await matrix.waitForRender();

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

  console.log('[Matrix Test] Animation loaded!');
  console.log('- Phase 1: Fade in left, move right, fade out');
  console.log('- Phase 2: Create, move center, rotate, scale, fade out');
  console.log('- Matrix uses MathTex entries (async rendering via waitForRender)');
}

runAnimation().catch(console.error);
