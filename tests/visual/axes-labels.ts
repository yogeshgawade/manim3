// 3D Axes Demo - Simple fade in with ticks
import type { Scene } from '../../src/scene/Scene';
import { ThreeDScene } from '../../src/scene/ThreeDScene';
import { ThreeDAxes } from '../../src/mobjects/three/ThreeDAxes';
import { fadeInGroup } from '../../src/animation/FadeGroupTrack';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as ThreeDScene;

function setInvisible(mob: any) {
  mob.opacity = 0;
  if (mob.children) {
    for (const child of mob.children) {
      setInvisible(child);
    }
  }
}

// Create 3D axes with ticks, no labels
const axes = new ThreeDAxes({
  xRange: [-5, 5, 1],
  yRange: [-5, 5, 1],
  zRange: [-5, 5, 1],
  showTicks: true,
  withLabels: false,
  tipLength: 0.25,
  tipRadius: 0.1,
  shaftRadius: 0.02,
  tickLength: 0.15,
});
setInvisible(axes);
// Add axes to scene (start invisible for fade-in)
scene.add(axes);


async function runAnimation() {
  scene.scheduler.reset();

  // Fade in axes (and all children) over 2 seconds
  scene.at(1).play(fadeInGroup(axes, 2));

  scene.seek(0);
  console.log('3D Axes demo loaded!');
}

runAnimation().catch(console.error);
