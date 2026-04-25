// ImageObject Test - Visual animation test
import type { Scene } from '../../src/scene/Scene';
import { ImageObject } from '../../src/mobjects/image/ImageObject';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { create } from '../../src/animation/CreateGroupTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { rotateTo } from '../../src/animation/RotateTrack';
import { scaleTo } from '../../src/animation/ScaleTrack';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// ImageObject for all animations
const image = new ImageObject({
  source: './rabbit.jpg',
  width: 3,
});
image.position = [-3, 0, 0];
scene.add(image);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in on left, move right, fade out
  scene.at(2).play(fadeIn(image, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(image, [3, 0, 0], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(image, [0, 0, 0], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(rotateTo(image, [0, 0, Math.PI], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(scaleTo(image, 1.5, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeOut(image, { duration: 1, rateFunc: smooth }));

  console.log('[Image Test] Animation loaded!');
  console.log('- Phase 1: Fade in left, move right, fade out');
  console.log('- Phase 2: Create, move center, rotate, scale, fade out');
}

runAnimation().catch(console.error);
