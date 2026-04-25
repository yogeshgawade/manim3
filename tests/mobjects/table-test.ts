// Table Test - Two Phase Animation with base Table class
import type { Scene } from '../../src/scene/Scene';
import { Table } from '../../src/mobjects/table/Table';
import { MathTex } from '../../src/mobjects/text/MathTex';
import { Text } from '../../src/mobjects/text/Text';
import { Circle } from '../../src/mobjects/geometry/Circle';
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

// Create individual mobjects for table cells
const t1 = new MathTex({ latex: '\\alpha', color: WHITE, fontSize: 1 });
const t2 = new MathTex({ latex: '\\beta', color: WHITE, fontSize: 1 });
const t3 = new MathTex({ latex: '\\gamma', color: WHITE, fontSize: 1 });
const t4 = new Text({ text: 'Hello', color: YELLOW, fontSize: 24 });
const t5 = new Text({ text: 'Table', color: GREEN, fontSize: 24 });
const t6 = new Circle({ radius: 0.3, color: RED, fillOpacity: 0.8 });

// Wait for MathTex to render (Text is synchronous)
await Promise.all([
  t1.waitForRender(),
  t2.waitForRender(),
  t3.waitForRender(),
]);

// Create base Table with mobjects
const table = new Table({
  data: [
    [t1, t2, t3],
    [t4, t5, t6],
  ],
  lineColor: BLUE,
  lineStrokeWidth: 2,
  vBuff: 0.4,
  hBuff: 0.8,
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

  console.log('[Table Test] Animation loaded!');
  console.log('- Phase 1: Fade in left, move right, fade out');
  console.log('- Phase 2: Create, move center, rotate, scale, fade out');
  console.log('- Base Table class with mixed mobjects: MathTex, Text, Circle');
  console.log('- Blue grid lines with outer borders');
}

runAnimation().catch(console.error);
