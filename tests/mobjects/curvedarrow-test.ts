// CurvedArrow Test - Simple fade in/out

import type { Scene } from '../../src/scene/Scene';
import { CurvedArrow, CurvedDoubleArrow } from '../../src/mobjects/geometry/CurvedArrow';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { BLUE, GREEN, RED } from '../../src/constants/colors';
import { create } from '../../src';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

const curvedArrowLeft = new CurvedArrow({
  start: [-2, 1, 0],
  end: [2, 1, 0],
  angle: Math.PI / 3,
  color: RED,
  strokeWidth: 4,
});



const doubleArrow = new CurvedDoubleArrow({
  start: [-1.5, 0, 0],
  end: [1.5, 0, 0],
  angle: Math.PI / 4,
  color: GREEN,
  strokeWidth: 4,
});

scene.add(curvedArrowLeft);

scene.add(doubleArrow);

async function runAnimation() {
  scene.scheduler.reset();

  // Fade in
  scene.at(0.5).play(create(curvedArrowLeft, { duration: 0.8, rateFunc: smooth }));
  scene.at(1.1).play(create(doubleArrow, { duration: 0.8, rateFunc: smooth }));

  // Fade out
  scene.at('+=1').play(fadeOut(curvedArrowLeft, { duration: 0.8, rateFunc: smooth }));
  scene.at('+=0').play(fadeOut(doubleArrow, { duration: 0.8, rateFunc: smooth }));
}

runAnimation().catch(console.error);
