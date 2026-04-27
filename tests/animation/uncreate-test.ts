// Uncreate Animation Test - Fade in MathTex, then uncreate (reverse draw)
import type { Scene } from '../../src/scene/Scene';
import { MathTex } from '../../src/mobjects/text/MathTex';
import { fadeIn } from '../../src/animation/FadeGroupTrack';
import { create, createReverse, uncreate } from '../../src/animation/CreateGroupTrack';
import { smooth , linear} from '../../src/utils/rateFunctions';
import { BLUE, WHITE } from '../../src/constants/colors';


declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create MathTex equation
const equation = new MathTex({
  latex: 'qwerty',
  color: WHITE,
  fontSize: 1.5,
  strokeWidth: 1
});
equation.position = [0, 0, 0];

// Add to scene
await equation.waitForRender();
scene.add(equation);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in the equation
  scene.at(0).play(fadeIn(equation, { duration: 1, rateFunc: smooth, lagRatio: 0.5 }));
  console.log('[Uncreate Test] Phase 1: MathTex fade in');

  // Phase 2: Uncreate (reverse draw) the equation
  scene.at('+=1').play(
    create(equation, { duration: 1, rateFunc: linear, strokeFillLagRatio: 0.66 , lagRatio: 0.1 })
  );
  console.log('[Uncreate Test] Phase 2: MathTex uncreate (reverse draw)');

  console.log('[Uncreate Test] Animation loaded!');
  console.log('- Phase 1: MathTex fades in');
  console.log('- Phase 2: MathTex uncreates (stroke undraws, fill fades out)');
}

runAnimation().catch(console.error);
