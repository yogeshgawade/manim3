// MathTable Test - Two Phase Animation with LaTeX entries
import type { Scene } from '../../src/scene/Scene';
import { MathTable } from '../../src/mobjects/table/Table';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { create } from '../../src/animation/CreateGroupTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { rotateTo } from '../../src/animation/RotateTrack';
import { scaleTo } from '../../src/animation/ScaleTrack';
import { RED, BLUE, GREEN, YELLOW, WHITE, PURPLE } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create MathTable with LaTeX strings
// MathTable automatically converts strings to MathTex mobjects
const table = new MathTable({
  data: [
    ['x', 'x^2', 'x^3'],
    ['1', '1', '1'],
    ['2', '4', '8'],
    ['3', '9', '27'],
  ],
  colLabels: ['x', 'x^2', 'x^3'],
  rowLabels: ['f(x)'],
  fontSize: 1,
  color: WHITE,
  lineColor: BLUE,
  lineStrokeWidth: 2,
  vBuff: 0.2,
  hBuff: 0.2,
  includeOuterLines: true,
  position: [-3, 0, 0],
});

// Wait for MathTex entries to render
await table.waitForRender();

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

  console.log('[MathTable Test] Animation loaded!');
  console.log('- Phase 1: Fade in left, move right, fade out');
  console.log('- Phase 2: Create, move center, rotate, scale, fade out');
  console.log('- MathTable with colLabels and rowLabels');
  console.log('- Displays x, x^2, x^3 function values');
}

runAnimation().catch(console.error);
