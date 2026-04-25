// Plot Test - Demonstrates function plotting on axes
import type { Scene } from '../../src/scene/Scene';
import { Axes } from '../../src/mobjects/graphing/Axes';
import { Dot } from '../../src/mobjects/geometry/Dot';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { create } from '../../src/animation/CreateGroupTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { RED, BLUE, GREEN, YELLOW, PURPLE, WHITE } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create axes for plotting
const axes = new Axes({
  xRange: [-3, 5, 1],
  yRange: [-2, 3, 1],
  xLength: 10,
  yLength: 6,
  color: WHITE,
  tips: true,
});
axes.position = [-2, -2, 0];

// Plot 1: Sine wave
const sineGraph = axes.plot((x) => Math.sin(x), {
  color: BLUE,
  strokeWidth: 2,
  samples: 100,
});


// Dots to trace graphs
const sineDot = new Dot({
  radius: 0.12,
  color: YELLOW,
  fillOpacity: 1,
});
sineDot.position = axes.i2gp(-2, sineGraph);


// Add objects to scene
axes.add(sineDot);
scene.add(axes);



async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in axes
  scene.at(0).play(create(axes, { duration: 1, rateFunc: smooth }));

  // Phase 2: Create plots one by one
  scene.at('+=0.3').play(fadeIn(sineDot, { duration: 0.5, rateFunc: smooth }));

  
  // Phase 3: Animate dots along their graphs
  scene.at('+=0.5').play(moveTo(sineDot, axes.i2gp(0, sineGraph), { duration: 1, rateFunc: smooth }));

  scene.at('+=0.5').play(moveTo(sineDot, axes.i2gp(5, sineGraph), { duration: 1, rateFunc: smooth }));


  // Phase 4: Fade out
  scene.at('+=1').play(fadeOut(sineDot, { duration: 0.5, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeOut(axes, { duration: 1, rateFunc: smooth }));
  scene.at('+=0').play(fadeOut(sineGraph, { duration: 1, rateFunc: smooth }));

  console.log('[Plot Test] Animation loaded!');
  console.log('- Phase 1: Axes fade in');
  console.log('- Phase 2: Plots created (sine, parabola, line, cubic)');
  console.log('- Phase 3: Dots trace along graphs');
  console.log('- Phase 4: Fade out');
}

runAnimation().catch(console.error);
