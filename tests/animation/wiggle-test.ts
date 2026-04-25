// WiggleTrack Animation Test - Create star, fade in, wiggle, then fade out
import type { Scene } from '../../src/scene/Scene';
import { Star } from '../../src/mobjects/geometry/Polygram';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { wiggle } from '../../src/animation/WiggleTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { GOLD, PURPLE } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create a gold star
const star = new Star({
  numPoints: 5,
  outerRadius: 1.5,
  innerRadius: 0.6,
  color: GOLD,
  strokeWidth: 3,
  fillOpacity: 0.4,
});

star.position = [0, 0, 0];

// Add to scene
scene.add(star);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in the star
  scene.at(0).play(fadeIn(star, { duration: 1, rateFunc: smooth }));
  console.log('[Wiggle Test] Phase 1: Star fades in');

  // Phase 2: Wiggle the star (6 wiggles, 15 degree rotation)
  scene.at('+=0.5').play(
    wiggle(star, { duration: 2, nWiggles: 6, rotationAngle: Math.PI / 12, scaleFactor: 1.2 })
  );
  console.log('[Wiggle Test] Phase 2: Star wiggles 6 times');

  // Phase 3: Fade out
  scene.at('+=0.5').play(fadeOut(star, { duration: 1, rateFunc: smooth }));
  console.log('[Wiggle Test] Phase 3: Star fades out');

  console.log('[Wiggle Test] Animation loaded!');
  console.log('- Phase 1: Gold star fades in (1s)');
  console.log('- Phase 2: Star wiggles with 6 oscillations (2s)');
  console.log('- Phase 3: Star fades out (1s)');
}

runAnimation().catch(console.error);
