// Dot-Line Test - Two dots connected by a line, moved via ValueTracker
// Tests: Create In -> ValueTracker moves both dots, line stays connected

import type { Scene } from '../../src/scene/Scene';
import { Dot } from '../../src/mobjects/geometry/Dot';
import { Line } from '../../src/mobjects/geometry/Line';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn } from '../../src/animation/FadeGroupTrack';
import { ValueTracker } from '../../src/animation/ValueTrack';
import { BLUE, RED } from '../../src/constants/colors';
import { create } from '../../src';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Two dots at fixed starting positions
const dotA = new Dot({
  radius: 0.15,
  color: RED,
  point: [-3, 0, 0],
});

const dotB = new Dot({
  radius: 0.15,
  color: BLUE,
  point: [3, 0, 0],
});

// Line connecting the two dots
const line = new Line({
  start: dotA.position as [number, number, number],
  end: dotB.position as [number, number, number],
  strokeWidth: 3,
});
const angleA = new ValueTracker(0);
const angleB = new ValueTracker(0);

scene.add(line);
scene.add(dotA);
scene.add(dotB);

async function runAnimation() {
  scene.scheduler.reset();
  
  scene.at(0.5).play(create(line, { duration: 0.5, rateFunc: smooth }));
  scene.at(0.5).play(fadeIn(dotA, { duration: 0.5, rateFunc: smooth }));
  scene.at(0.5).play(fadeIn(dotB, { duration: 0.5, rateFunc: smooth }));

  // ValueTracker: move dotA in a circle (radius 1.5) around [-3, 0, 0]
  
  const centerA: [number, number, number] = [-3, 0, 0];
  const radiusA = 1.5;

  // ValueTracker: move dotB in a circle (radius 1.5) around [3, 0, 0], opposite direction
  
  const centerB: [number, number, number] = [3, 0, 0];
  const radiusB = 1.5;

  scene.at('+=0.5').play(
    angleA.animateTo(Math.PI * 2, 4, smooth, (angle) => {
      const x = centerA[0] + Math.cos(angle) * radiusA;
      const y = centerA[1] + Math.sin(angle) * radiusA;
      dotA.position = [x, y, 0];

      // Update line start to follow dotA
      line.setStart([x, y, 0]);
    })
  );

  scene.at('+=0').play(
    angleB.animateTo(-Math.PI * 2, 4, smooth, (angle) => {
      const x = centerB[0] + Math.cos(angle) * radiusB;
      const y = centerB[1] + Math.sin(angle) * radiusB;
      dotB.position = [x, y, 0];

      // Update line end to follow dotB
      line.setEnd([x, y, 0]);
    })
  );
}

runAnimation().catch(console.error);