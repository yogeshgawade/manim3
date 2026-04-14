// Phase 11 - MoveAlongPathTrack Demo
// Tests dot moving along a sine curve path
import type { Scene } from '../../src/scene/Scene';
import { Axes } from '../../src/mobjects/graphing/Axes';
import { Dot } from '../../src/mobjects/geometry/Dot';
import { MoveAlongPathTrack } from '../../src/animation/MoveAlongPathTrack';
import { CreateTrack } from '../../src/animation/CreateTrack';
import { BLUE, ORANGE } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create the axes and the sine curve
const ax = new Axes({ xRange: [0, 10], yRange: [0, 10] });
ax.moveTo([-5, -3, 0]);
//ax.scale  = [0.5, 0.5, 1]
const graph = ax.plot((x) => Math.sin(x), { color: BLUE, xRange: [0, 3 * Math.PI] });

// Create dots at start and end of path
const movingDot = new Dot({ point: ax.i2gp(graph.tMin, graph), color: ORANGE });
const startDot = new Dot({ point: ax.i2gp(graph.tMin, graph) });
const endDot = new Dot({ point: ax.i2gp(graph.tMax, graph) });

// Add dots as children of axes so they inherit scale/position
ax.add(movingDot, startDot, endDot);

scene.add(ax);

async function runAnimation() {
  scene.scheduler.reset();

  // Create all mobjects
  scene.at(0).play(new CreateTrack(ax, 0.5));
  scene.at(0).play(new CreateTrack(graph, 0.5));
  scene.at(0).play(new CreateTrack(startDot, 0.5));
  scene.at(0).play(new CreateTrack(endDot, 0.5));
  scene.at(0).play(new CreateTrack(movingDot, 0.5));

  // Animate dot moving along the graph path
  scene.at('+=0.5').play(
    new MoveAlongPathTrack(movingDot, { path: graph, duration: 3 })
  );

  console.log('MoveAlongPathTrack demo loaded!');
}

runAnimation().catch(console.error);
