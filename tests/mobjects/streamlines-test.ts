// streamlines-test.ts — Dual Vortex
import type { Scene } from '../../src/scene/Scene';
import { StreamLines } from '../../src/mobjects/graphing/StreamLines';
import { NumberPlane } from '../../src/mobjects/graphing/NumberPlane';
import { smooth } from '../../src/utils/rateFunctions';
import { create } from '../../src/animation/CreateGroupTrack';
import { animateStreamLines } from '../../src/animation/StreamLinesTrack';

declare global {
  interface Window { testScene: Scene; }
}

const scene = window.testScene as Scene;

const plane = new NumberPlane({
  xRange: [-7, 7, 1],
  yRange: [-4, 4, 1],
  backgroundLineStyle: { color: '#1a1a2e', strokeWidth: 0.5, opacity: 0.4 },
});

// Two vortex centers at (-3, 0) and (3, 0)
// One spins clockwise, one counter-clockwise
const CX1 = -3, CY1 = 0;  // left vortex center
const CX2 =  3, CY2 = 0;  // right vortex center
const STRENGTH = 2.5;

const streamLines = new StreamLines({
  func: (x, y) => {
    const dx1 = x - CX1, dy1 = y - CY1;
    const dx2 = x - CX2, dy2 = y - CY2;
    const r1sq = Math.max(dx1**2 + dy1**2, 0.3);  // clamp avoids singularity
    const r2sq = Math.max(dx2**2 + dy2**2, 0.3);

    // Left vortex: counter-clockwise (+)
    const vx1 = -dy1 * STRENGTH / r1sq;
    const vy1 =  dx1 * STRENGTH / r1sq;

    // Right vortex: clockwise (-)
    const vx2 =  dy2 * STRENGTH / r2sq;
    const vy2 = -dx2 * STRENGTH / r2sq;

    return [vx1 + vx2, vy1 + vy2];
  },

  xRange: [-6, 6, 0.6],
  yRange: [-3.5, 3.5, 0.6],
  numLines: 200,
  virtualTime: 5,
  strokeWidth: 2.5,
  stepSize: 0.06,
  maxAnchorsPerLine: 100,
  opacity: 0.85,

 
});

//scene.add(plane);
scene.add(streamLines);

async function runAnimation() {
  scene.scheduler.reset();

  scene.at(0).play(create(plane, { duration: 1, rateFunc: smooth }));

  scene.at(1).play(
    animateStreamLines(streamLines, {
      duration: 60,
      timeWidth: 0.2,   // shorter tail — looks sharper on tight spirals
      flowSpeed: 10,
      stagger: true,
      rateFunc: (t) => t,
    })
  );
}

runAnimation().catch(console.error);