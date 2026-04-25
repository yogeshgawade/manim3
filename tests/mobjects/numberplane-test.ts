// NumberPlane Test - Demonstrates coordinate plane with grid background
import type { Scene } from '../../src/scene/Scene';
import { NumberPlane } from '../../src/mobjects/graphing/NumberPlane';
import { Dot } from '../../src/mobjects/geometry/Dot';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { create } from '../../src/animation/CreateGroupTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { RED, YELLOW, WHITE } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// NumberPlane with faded grid
const plane = new NumberPlane({
  xRange: [-5, 5, 1],
  yRange: [-3, 3, 1],

  color: WHITE,
  tips: true,
});
plane.position = [-1, 0, 0];

// Dot at origin
const originDot = new Dot({
  radius: 0.12,
  color: RED,
  fillOpacity: 1,
});
originDot.position = plane.coordsToPoint(0, 0);

// Moving dot
const movingDot = new Dot({
  radius: 0.12,
  color: YELLOW,
  fillOpacity: 1,
});
movingDot.position = plane.coordsToPoint(2, 2);

// Add dots to plane
plane.add(originDot);
plane.add(movingDot);
scene.add(plane);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in plane
  scene.at(0).play(create(plane, { duration: 1, rateFunc: smooth }));

  // Phase 3: Move dot along grid
  scene.at('+=0.5').play(moveTo(movingDot, plane.coordsToPoint(-2, 1), { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(movingDot, plane.coordsToPoint(3, -2), { duration: 1, rateFunc: smooth }));

  // Phase 4: Fade out
  scene.at('+=1').play(fadeOut(plane, { duration: 1, rateFunc: smooth }));

  console.log('[NumberPlane Test] Animation loaded!');
  console.log('- Phase 1: NumberPlane fades in with grid');
  console.log('- Phase 2: Dots appear at coordinate positions');
  console.log('- Phase 3: Dot moves along coordinate grid');
  console.log('- Phase 4: Fade out');
}

runAnimation().catch(console.error);
