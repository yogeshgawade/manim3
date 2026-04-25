// MathTex Test - Two Phase Animation
import type { Scene } from '../../src/scene/Scene';
import { MathTex } from '../../src/mobjects/text/MathTex';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { create } from '../../src/animation/CreateGroupTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { rotateTo } from '../../src/animation/RotateTrack';
import { colorTo } from '../../src/animation/ColorTrack';
import { scaleTo } from '../../src/animation/ScaleTrack';
import { GREEN, BLUE, RED, YELLOW, PURPLE, ORANGE } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Single MathTex for all animations
const mathTex = new MathTex({
  latex: 'E = mc^2',
  color: RED,
  fontSize: 4,
  strokeWidth: 2,
  fillOpacity: 1,
});
mathTex.position = [-3, 0, 0];
await mathTex.waitForRender();




scene.add(mathTex);



async function runAnimation() {
  // Wait for MathTex to render before animating
  

  scene.scheduler.reset();

  // Phase 1: Fade in on left, move right, fade out
  scene.at(1).play(fadeIn(mathTex, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(mathTex, [3, 0, 0], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeOut(mathTex, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(create(mathTex, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(mathTex, [0, 0, 0], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(rotateTo(mathTex, [0, 0, Math.PI * 2], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(scaleTo(mathTex, 1.5, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeOut(mathTex, { duration: 1, rateFunc: smooth }));

  console.log('[MathTex Test] Animation loaded!');
  console.log('- Phase 1: Fade in left, move right, fade out');
  console.log('- Phase 2: Create, move center, rotate, color change, scale, fade out');
  console.log('- Each glyph has a different color (rainbow effect)');
}

runAnimation().catch(console.error);
