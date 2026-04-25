// MobjectMatrix Test - Two Phase Animation with arbitrary Mobjects
import type { Scene } from '../../src/scene/Scene';
import { MobjectMatrix } from '../../src/mobjects/matrix';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { Square } from '../../src/mobjects/geometry/Rectangle';
import { Triangle } from '../../src/mobjects/geometry/Polygon';
import { MathTex } from '../../src/mobjects/text/MathTex';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { create } from '../../src/animation/CreateGroupTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { rotateTo } from '../../src/animation/RotateTrack';
import { scaleTo } from '../../src/animation/ScaleTrack';
import { RED, BLUE, GREEN, PURPLE, YELLOW, ORANGE } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create MobjectMatrix with mixed Mobjects
const circle = new Circle({
  radius: 0.3,
  color: RED,
  fillOpacity: 0.8,
});

const square = new Square({
  sideLength: 0.6,
  color: GREEN,
  fillOpacity: 0.8,
});

const triangle = new Triangle({
  color: BLUE,
  fillOpacity: 0.8,
  vertices: [
    [-0.3, -0.3, 0],
    [0.3, -0.3, 0],
    [0, 0.3, 0],
  ],
});

const mathTex1 = new MathTex({
  latex: '\\pi',
  color: PURPLE,
  fontSize: 2,
});

const mathTex2 = new MathTex({
  latex: '\\sum',
  color: YELLOW,
  fontSize: 2,
});

const mathTex3 = new MathTex({
  latex: '\\int',
  color: ORANGE,
  fontSize: 2,
});

// Wait for MathTex objects to render


const matrix = new MobjectMatrix([
  [circle, square, triangle],
  [mathTex1, mathTex2, mathTex3],
  [square.copy(), triangle.copy(), circle.copy()],
], {
  bracketType: '()',
  vBuff: 0,
  hBuff: 1.0,
  bracketColor: BLUE,
  position: [-3, 0, 0],
});
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

  console.log('[MobjectMatrix Test] Animation loaded!');
  console.log('- Phase 1: Fade in left, move right, fade out');
  console.log('- Phase 2: Create, move center, rotate, scale, fade out');
  console.log('- MobjectMatrix uses mixed mobjects: Circle, Square, Triangle, MathTex');
  console.log('- Uses curly braces {} as brackets');
}

runAnimation().catch(console.error);
