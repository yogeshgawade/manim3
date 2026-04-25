// MobjectTable Test - Two Phase Animation with mixed mobjects
import type { Scene } from '../../src/scene/Scene';
import { MobjectTable } from '../../src/mobjects/table/Table';
import { MathTex } from '../../src/mobjects/text/MathTex';
import { Text } from '../../src/mobjects/text/Text';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { Square } from '../../src/mobjects/geometry/Rectangle';
import { Triangle } from '../../src/mobjects/geometry/Polygon';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { create } from '../../src/animation/CreateGroupTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { rotateTo } from '../../src/animation/RotateTrack';
import { scaleTo } from '../../src/animation/ScaleTrack';
import { RED, BLUE, GREEN, YELLOW, WHITE, ORANGE } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create mixed mobjects for table cells
const math1 = new MathTex({ latex: '\\sum', color: WHITE, fontSize: 1.5 });
const math2 = new MathTex({ latex: '\\int', color: WHITE, fontSize: 1.5 });
const math3 = new MathTex({ latex: '\\pi', color: WHITE, fontSize: 1.5 });

const text1 = new Text({ text: 'Text', color: YELLOW, fontSize: 24 });
const text2 = new Text({ text: 'Cell', color: GREEN, fontSize: 24 });

const circle = new Circle({ radius: 0.3, color: RED, fillOpacity: 0.8 });
const square = new Square({ sideLength: 0.6, color: BLUE, fillOpacity: 0.8 });
const triangle = new Triangle({
  color: ORANGE,
  fillOpacity: 0.8,
  vertices: [
    [-0.3, -0.3, 0],
    [0.3, -0.3, 0],
    [0, 0.3, 0],
  ],
});

// Wait for MathTex to render
await Promise.all([
  math1.waitForRender(),
  math2.waitForRender(),
  math3.waitForRender(),
]);

// Create MobjectTable with mixed types
const table = new MobjectTable({
  data: [
    [math1, math2, math3],
    [text1, text2, circle],
    [square, triangle, math1.copy()],
  ],
  lineColor: YELLOW,
  lineStrokeWidth: 2,
  vBuff: 0.6,
  hBuff: 0.6,
  includeOuterLines: true,
  position: [-3, 0, 0],
});

scene.add(table);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in on left, move right, fade out
  scene.at(1).play(fadeIn(table, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(table, [3, 0, 0], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeOut(table, { duration: 1, rateFunc: smooth }));

  // Phase 2: Reappear at center with create animation
  scene.at('+=0.5').play(create(table, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(table, [0, 0, 0], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(rotateTo(table, [0, 0, Math.PI * 2], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(scaleTo(table, 1.2, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeOut(table, { duration: 1, rateFunc: smooth }));

  console.log('[MobjectTable Test] Animation loaded!');
  console.log('- Phase 1: Fade in left, move right, fade out');
  console.log('- Phase 2: Create, move center, rotate, scale, fade out');
  console.log('- MobjectTable with mixed types: MathTex, Text, Circle, Square, Triangle');
  console.log('- Yellow grid lines');
}

runAnimation().catch(console.error);
