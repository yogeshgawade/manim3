// Shape Morph Test - Circle+Triangle on left, Square+Circle on right, fade in left, morph to right
import type { Scene } from '../../src/scene/Scene';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { Polygon } from '../../src/mobjects/geometry/Polygon';
import { Rectangle } from '../../src/mobjects/geometry/Rectangle';
import { VGroup } from '../../src/core/VGroup';
import { VGroupMorphTrack } from '../../src/animation/VGroupMorphTrack';
import { fadeIn } from '../../src/animation/FadeGroupTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { BLUE, GREEN, RED, YELLOW } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Left side: Circle and Triangle
const leftCircle = new Circle({
  radius: 1,
  color: BLUE,
  fillOpacity: 0.5,
  strokeWidth: 4
});
leftCircle.position = [-3, 1, 0];

const triangle = new Polygon({
  vertices: [[-3, -1, 0], [-2, -2, 0], [-4, -2, 0]],
  color: BLUE,
  fillOpacity: 0.5,
  strokeWidth: 4
});

// Right side: Square and Circle
const square = new Rectangle({
  width: 1.5,
  height: 1.5,
  color: RED,
  fillOpacity: 0.5,
  strokeWidth: 4
});
square.position = [3, 1, 0];

const rightCircle = new Circle({
  radius: 0.75,
  color: RED,
  fillOpacity: 0.5,
  strokeWidth: 4
});
rightCircle.position = [3, -1.5, 0];

// Create groups
const leftGroup = new VGroup(leftCircle, triangle);
const rightGroup = new VGroup(square, rightCircle);

// Add left group to scene
scene.add(leftGroup);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in left group (Circle + Triangle)
  scene.at(0).play(fadeIn(leftGroup, { duration: 1.5, rateFunc: smooth }));
  console.log('[Shape Morph Test] Phase 1: Left group fades in (Circle + Triangle)');

  // Phase 2: Morph left group to right group (Square + Circle)
  scene.at('+=0.5').play(new VGroupMorphTrack(leftGroup, rightGroup, 2, smooth));
  console.log('[Shape Morph Test] Phase 2: Left group morphs to right group (Square + Circle)');

  console.log('[Shape Morph Test] Animation loaded!');
  console.log('- Phase 1: Blue Circle + Green Triangle fade in on left');
  console.log('- Phase 2: Morphs to Red Square + Yellow Circle on right');
}

runAnimation().catch(console.error);
