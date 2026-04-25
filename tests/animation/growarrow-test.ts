// GrowArrow Animation Test - Create 2D axes, show arrow growing animation
import type { Scene } from '../../src/scene/Scene';
import { Axes } from '../../src/mobjects/graphing/Axes';
import { Arrow } from '../../src/mobjects/geometry/Arrow';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { growArrow } from '../../src/animation/GrowArrowTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { BLUE, RED, WHITE } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create 2D axes
const axes = new Axes({
  xRange: [-5, 5, 1],
  yRange: [-3, 3, 1],
  xLength: 10,
  yLength: 6,
  color: WHITE,
  strokeWidth: 2,
  tips: true,
});

// Create an arrow pointing from origin to (3, 2)
const arrow = new Arrow({
  start: [0, 0, 0],
  end: [3, 2, 0],
  color: RED,
  strokeWidth: 4,
  tipLength: 0.3,
});

// Add to scene
scene.add(axes);
scene.add(arrow);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in the axes
  scene.at(0).play(fadeIn(axes, { duration: 1, rateFunc: smooth }));
  console.log('[GrowArrow Test] Phase 1: Axes fade in');

  // Phase 2: Grow the arrow from start point
  scene.at('+=0.5').play(growArrow(arrow, { duration: 1.5, rateFunc: smooth }));
  console.log('[GrowArrow Test] Phase 2: Arrow grows from origin to (3, 2)');

  // Phase 3: Fade out
  scene.at('+=1').play(fadeOut(axes, { duration: 1, rateFunc: smooth }));
  scene.at('+=0').play(fadeOut(arrow, { duration: 1, rateFunc: smooth }));
  console.log('[GrowArrow Test] Phase 3: Fade out');

  console.log('[GrowArrow Test] Animation loaded!');
  console.log('- Phase 1: 2D axes fade in');
  console.log('- Phase 2: Red arrow grows from origin to point (3, 2)');
  console.log('- Phase 3: Axes and arrow fade out');
}

runAnimation().catch(console.error);
