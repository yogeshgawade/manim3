// VGroupMorphTrack Test - Fade in MathTex1, then morph to MathTex2 at different positions
import type { Scene } from '../../src/scene/Scene';
import { MathTex } from '../../src/mobjects/text/MathTex';
import { VGroupMorphTrack } from '../../src/animation/VGroupMorphTrack';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { smooth, linear } from '../../src/utils/rateFunctions';
import { BLUE, GREEN, RED } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create MathTex1 at left position
const mathTex1 = new MathTex({
  latex: '123',
  color: BLUE,
  fontSize: 2,
  strokeWidth: 2,
  fillOpacity: 1,
});
mathTex1.position = [-4, 2, 0];

// Create MathTex2 at different (right-bottom) position with different equation
const mathTex2 = new MathTex({
  latex: '4513',
  color: GREEN,
  fontSize: 2,
  strokeWidth: 2,
  fillOpacity: 1,
});
mathTex2.position = [3, -1, 0];

// Create MathTex2 at different (right-bottom) position with different equation
const mathTex3 = new MathTex({
  latex: '1354',
  color: RED,
  fontSize: 2,
  strokeWidth: 2,
  fillOpacity: 1,
});
mathTex3.position = [3, 2, 0];

 // Wait for both MathTex objects to render
  await mathTex1.waitForRender();
  await mathTex2.waitForRender();
  await mathTex3.waitForRender();
  scene.add(mathTex1);
  //scene.add(mathTex2);

async function runAnimation() {
 

  scene.scheduler.reset();

  // Phase 1: Fade in MathTex1 at left position
 
  scene.at(0).play(fadeIn(mathTex1, { duration: 1.5, rateFunc: smooth }));
  console.log('[VGroupMorphTrack Test] Phase 1: MathTex1 fades in at left position (-4, 2, 0)');

  // Phase 2: Morph MathTex1 to MathTex2 (different equation, different position)
  scene.at('+=0.5').play(new VGroupMorphTrack(mathTex1, mathTex2, 2, smooth));
  scene.at('+=0.5').play(new VGroupMorphTrack(mathTex1, mathTex3, 2, smooth));
  console.log('[VGroupMorphTrack Test] Phase 2: MathTex1 morphs to MathTex2 (different position: 3, -1, 0)');
  scene.at('+=0.5').play(fadeOut(mathTex1, { duration: 1.5, rateFunc: smooth }));
  console.log('[VGroupMorphTrack Test] Animation loaded!');
  console.log('- Phase 1: Blue circle equation fades in at left (-4, 2)');
  console.log('- Phase 2: Morphs to green Pythagorean theorem at right (3, -1)');
}

runAnimation().catch(console.error);
