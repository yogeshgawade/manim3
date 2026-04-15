// Phase 14 - SpiralIn Animation Test
// Tests SpiralIn - objects fly in on spiral trajectories
import type { Scene } from '../../src/scene/Scene';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { Square } from '../../src/mobjects/geometry/Rectangle';
import { Triangle } from '../../src/mobjects/geometry/Polygon';
import { Group } from '../../src/core/Group';
import { spiralIn } from '../../src/animation/SpiralInTrack';
import { fadeInGroup, fadeOutGroup } from '../../src/animation/FadeGroupTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { GREEN, BLUE, YELLOW } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create three shapes positioned in a triangle formation
const circle = new Circle({
  radius: 0.6,
  color: GREEN,
  fillOpacity: 0.4,
});
circle.moveTo([-2, 1, 0]);

const square = new Square({
  sideLength: 1.2,
  color: BLUE,
  fillOpacity: 0.4,
});
square.moveTo([2, 1, 0]);

// Triangle with default vertices
const triangle = new Triangle({
  color: YELLOW,
  fillOpacity: 0.4,
});
triangle.scale = [0.6, 0.6, 1];
triangle.moveTo([0, -1.5, 0]);

// Create a group containing all shapes
const shapes = new Group(circle, square, triangle);

// Start all invisible
circle.opacity = 0;
square.opacity = 0;
triangle.opacity = 0;

scene.add(shapes);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in first (shapes at final positions)
  scene.at(0).play(fadeInGroup(shapes, 0.5));

  // Phase 2: SpiralIn - shapes fly in from far away on spiral paths
  scene.at('+=0.3').play(spiralIn(shapes, 1, 0.3, 2.5, smooth));

  // Phase 3: Hold for viewing
  scene.addBookmark('hold');

  // Phase 4: Fade out
  scene.at('+=0.5').play(fadeOutGroup(shapes, 0.5));

  console.log('[Phase14] SpiralIn test loaded!');
  console.log('- Phase 1: FadeInGroup (0.5s) - shapes appear at final positions');
  console.log('- Phase 2: SpiralIn (+0.3s, 2.5s) - fly in from far on spiral paths');
  console.log('- Phase 3: Hold (bookmark)');
  console.log('- Phase 4: FadeOutGroup (+0.5s, 0.5s)');
}

runAnimation().catch(console.error);
