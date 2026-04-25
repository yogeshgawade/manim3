// Circumscribe Animation Test - Create MathTex, move, circumscribe (circle), fade out
import type { Scene } from '../../src/scene/Scene';
import { MathTex } from '../../src/mobjects/text/MathTex';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { circumscribe } from '../../src/animation/CircumscribeTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { BLUE, GREEN } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create MathTex equation
const equation = new MathTex({
  latex: 'x^2 + y^2 = r^2',
  color: BLUE,
  fontSize: 1.5,
});
equation.position = [-2, 0, 0];

// Add to scene
await equation.waitForRender();
scene.add(equation);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Create (fade in) the equation
  scene.at(0).play(fadeIn(equation, { duration: 1, rateFunc: smooth }));
  console.log('[Circumscribe Test] Phase 1: MathTex fade in');

  // Phase 2: Move the equation
  scene.at('+=0.5').play(
    moveTo(equation, [2, 0, 0], { duration: 1.5, rateFunc: smooth })
  );
  console.log('[Circumscribe Test] Phase 2: MathTex move');

  // Phase 3: Circle circumscribe
  scene.at('+=0.5').play(
    circumscribe(equation, {
      duration: 1.5,
      rateFunc: smooth,
      shape: 'rectangle',
      color: GREEN,
      buff: 0.2,
      strokeWidth: 3,
    })
  );
  console.log('[Circumscribe Test] Phase 3: Circle circumscribe');

  // Phase 4: Fade out the equation
  scene.at('+=1').play(fadeOut(equation, { duration: 1, rateFunc: smooth }));
  console.log('[Circumscribe Test] Phase 4: MathTex fade out');

  console.log('[Circumscribe Test] Animation loaded!');
  console.log('- Phase 1: MathTex fades in at left');
  console.log('- Phase 2: MathTex moves to right');
  console.log('- Phase 3: Green circle circumscribes MathTex');
  console.log('- Phase 4: MathTex fades out');
}

runAnimation().catch(console.error);
