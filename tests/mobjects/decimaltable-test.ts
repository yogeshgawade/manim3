// DecimalTable Test - Two Phase Animation with decimal values
import type { Scene } from '../../src/scene/Scene';
import { DecimalTable } from '../../src/mobjects/table/Table';
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

// Create DecimalTable with decimal values
// DecimalNumber is synchronous - no waitForRender needed
const table = new DecimalTable({
  data: [
    [1.234, 2.567, 3.891],
    [4.012, 5.345, 6.678],
    [7.901, 8.234, 9.567],
  ],
  numDecimalPlaces: 2,
  colLabels: [1, 2, 3],
  rowLabels: [10, 20, 30],
  fontSize: 36,
  color: WHITE,
  lineColor: GREEN,
  lineStrokeWidth: 2,
  vBuff: 0.2,
  hBuff: 0.4,
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

  console.log('[DecimalTable Test] Animation loaded!');
  console.log('- Phase 1: Fade in left, move right, fade out');
  console.log('- Phase 2: Create, move center, rotate, scale, fade out');
  console.log('- DecimalTable with 2 decimal places precision');
  console.log('- DecimalNumber entries (synchronous, no waitForRender)');
}

runAnimation().catch(console.error);
