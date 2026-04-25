// Boolean Operations Test
import type { Scene } from '../../src/scene/Scene';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { Rectangle } from '../../src/mobjects/geometry/Rectangle';
import {
  union,
  intersection,
  difference,
  exclusion,
} from '../../src/mobjects/geometry/BooleanOperations';
import { fadeIn } from '../../src/animation/FadeGroupTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { RED, BLUE } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create two overlapping shapes
const circle = new Circle({
  radius: 1,
  fillOpacity: 0.3,
  strokeWidth: 3,
  color: BLUE,
});
circle.position = [-0.5, 0, 0];

const rect = new Rectangle({
  width: 2,
  height: 2,
  fillOpacity: 0.3,
  strokeWidth: 3,
  color: BLUE,
});
rect.position = [0.5, 0, 0];

// Test all four boolean operations
const unionShape = union(circle, rect, { fillOpacity: 0.5 });
unionShape.position = [-3, 2, 0];

const intersectionShape = intersection(circle, rect, { fillOpacity: 0.5 });
intersectionShape.position = [3, 2, 0];

const differenceShape = difference(circle, rect, { fillOpacity: 0.5 });
differenceShape.position = [-3, -2, 0];

const exclusionShape = exclusion(circle, rect, { fillOpacity: 0.5 });
exclusionShape.position = [3, -2, 0];

// Add original shapes for reference
scene.add(circle);
scene.add(rect);

// Add boolean operation results
scene.add(unionShape);
scene.add(intersectionShape);
scene.add(differenceShape);
scene.add(exclusionShape);

async function runAnimation() {
  scene.scheduler.reset();

  // Animate all shapes fading in
  scene.at(0).play(fadeIn(circle, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeIn(rect, { duration: 1, rateFunc: smooth }));
  
  scene.at('+=0.5').play(fadeIn(unionShape, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.3').play(fadeIn(intersectionShape, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.3').play(fadeIn(differenceShape, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.3').play(fadeIn(exclusionShape, { duration: 1, rateFunc: smooth }));

  console.log('[Boolean Operations Test] Animation loaded!');
  console.log('- Original shapes: Circle (red), Rectangle (blue)');
  console.log('- Union: combines both shapes');
  console.log('- Intersection: overlapping region');
  console.log('- Difference: circle minus rectangle');
  console.log('- Exclusion: non-overlapping parts');
}

runAnimation().catch(console.error);
