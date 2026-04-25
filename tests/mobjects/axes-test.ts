// Axes Test - Demonstrates coordinate systems and transformations
import type { Scene } from '../../src/scene/Scene';
import { Axes } from '../../src/mobjects/graphing/Axes';
import { Dot } from '../../src/mobjects/geometry/Dot';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { create } from '../../src/animation/CreateGroupTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { RED, BLUE, GREEN, YELLOW } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Test 1: Default axes with tips
const defaultAxes = new Axes({
  xRange: [-1, 5, 1],
  yRange: [-1, 3, 1],
  xLength: 10,
  yLength: 6,
  color: '#ffffff',
  tips: true,
});
defaultAxes.position = [-4, -2, 0];

// Dots to demonstrate coordinate conversion
const originDot = new Dot({
  radius: 0.15,
  color: RED,
  fillOpacity: 1,
});
// Place at origin using coordsToPoint
const originPos = defaultAxes.coordsToPoint(0, 0);
originDot.position = originPos;

const pointDot = new Dot({
  radius: 0.15,
  color: YELLOW,
  fillOpacity: 1,
});
// Place at (3, 2) using coordsToPoint
const pointPos = defaultAxes.coordsToPoint(3, 2);
pointDot.position = pointPos;

const negativeDot = new Dot({
  radius: 0.15,
  color: BLUE,
  fillOpacity: 1,
});
// Place at (-2, -1) using coordsToPoint
const negativePos = defaultAxes.coordsToPoint(2, 2);
negativeDot.position = negativePos;

// Add dots as children of axes so they inherit position transform
// (axes are already added to scene via defaultAxes)
defaultAxes.add(originDot);
defaultAxes.add(pointDot);
defaultAxes.add(negativeDot);
scene.add(defaultAxes);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in default axes
  scene.at(0).play(create(defaultAxes, { duration: 1, rateFunc: smooth }));


  // Phase 2: Move dots along axes
  scene.at('+=1').play(moveTo(pointDot, defaultAxes.coordsToPoint(2, 1), { duration: 1, rateFunc: smooth }));
  scene.at('+=0').play(moveTo(negativeDot, defaultAxes.coordsToPoint(1, 2), { duration: 1, rateFunc: smooth }));

  // Phase 3: Fade out axes (dots are children, so they fade with it)
  scene.at('+=1').play(fadeOut(defaultAxes, { duration: 0.5, rateFunc: smooth }));

  console.log('[Axes Test] Animation loaded!');
  console.log('- Phase 1: Default axes with coordinate dots');
  console.log('- Phase 2: Moving dots along axes');
  console.log('- Phase 3: Styled axes with custom ticks');
}

runAnimation().catch(console.error);
