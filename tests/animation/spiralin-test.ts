// SpiralInTrack Animation Test - Create group of circles, spiral them in, then fade out
import type { Scene } from '../../src/scene/Scene';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { VGroup } from '../../src/core/VGroup';
import { fadeOut } from '../../src/animation/FadeGroupTrack';
import { spiralIn } from '../../src/animation/SpiralInTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { BLUE, RED, GREEN, YELLOW, PURPLE, ORANGE } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create a group of colored circles arranged in a circle
const circles: Circle[] = [];
const numCircles = 6;
const radius = 2;

for (let i = 0; i < numCircles; i++) {
  const angle = (i / numCircles) * Math.PI * 2;
  const circle = new Circle({
    radius: 0.5,
    color: [BLUE, RED, GREEN, YELLOW, PURPLE, ORANGE][i],
    strokeWidth: 3,
    fillOpacity: 0.5,
  });
  circle.position = [Math.cos(angle) * radius, Math.sin(angle) * radius, 0];
  circles.push(circle);
}

// Create a VGroup containing all circles
const group = new VGroup(...circles);
group.position = [0, 0, 0];

// Add to scene
scene.add(group);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Spiral in the group of circles
  // scaleFactor=8: circles start 8x farther from center
  // fadeInFraction=0.3: opacity fades in over first 30% of animation
  scene.at(0).play(spiralIn(group, 1, 0.3, 2.5, smooth));
  console.log('[SpiralIn Test] Phase 1: Group of circles spirals in');

  // Phase 2: Fade out
  scene.at('+=0.5').play(fadeOut(group, { duration: 1, rateFunc: smooth }));
  console.log('[SpiralIn Test] Phase 2: Group fades out');

  console.log('[SpiralIn Test] Animation loaded!');
  console.log('- Phase 1: 6 colored circles spiral in from far away (2.5s)');
  console.log('- Phase 2: Group fades out (1s)');
}

runAnimation().catch(console.error);
