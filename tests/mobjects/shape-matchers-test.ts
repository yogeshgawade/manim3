// ShapeMatchers Test - Tests BackgroundRectangle, Cross, SurroundingRectangle, and Grid
import type { Scene } from '../../src/scene/Scene';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { Rectangle } from '../../src/mobjects/geometry/Rectangle';
import {
  BackgroundRectangle,
  Cross,
  SurroundingRectangle,
  Grid,
} from '../../src/mobjects/geometry/ShapeMatchers';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { create } from '../../src/animation/CreateGroupTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { YELLOW, RED, BLUE, GREEN, BLACK, WHITE, TEAL } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create target objects for BackgroundRectangle and SurroundingRectangle
const targetCircle = new Circle({
  radius: 1,
  fillOpacity: 1,
  strokeWidth: 3,
  color: RED,
});
targetCircle.position = [0, 0, 0];

const targetRect = new Rectangle({
  width: 2,
  height: 1.5,
  fillOpacity: 0.3,
  strokeWidth: 3,
  color: GREEN,
});
targetRect.position = [0, 0, 0];

// Test BackgroundRectangle with default options
const backgroundRect = new BackgroundRectangle(targetCircle, {
  buff: 0.3,
  color: WHITE,
  fillOpacity: 0.6,
  strokeWidth: 0,
});
backgroundRect.position = [0, 0, -0.1]; // Slightly behind target

// Test SurroundingRectangle with custom options
const surroundingRect = new SurroundingRectangle(targetRect, {
  buff: 0.2,
  color: YELLOW,
  strokeWidth: 3,
  fillOpacity: 0,
});
surroundingRect.position = [0, 0, 0.1]; // Slightly in front

// Test Cross with default size
const cross1 = new Cross({
  size: 0.5,
  color: RED,
  strokeWidth: 4,
});
cross1.position = [0, 0, 0];

// Test Cross with custom size
const cross2 = new Cross({
  size: 0.8,
  color: RED,
  strokeWidth: 6,
});
cross2.position = [0, 0, 0];

// Test Grid with default options
const grid1 = new Grid({
  width: 4,
  height: 3,
  numCols: 8,
  numRows: 6,
  color: BLUE,
  strokeWidth: 1,
});
grid1.position = [0, 0, 0];

// Test Grid with custom dimensions
const grid2 = new Grid({
  width: 3,
  height: 3,
  numCols: 4,
  numRows: 4,
  color: TEAL,
  strokeWidth: 2,
});
grid2.position = [0, 0, 0];

// Add all objects to scene
scene.add(targetCircle);
scene.add(targetRect);
scene.add(backgroundRect);
scene.add(surroundingRect);
scene.add(cross1);
scene.add(cross2);
scene.add(grid1);
scene.add(grid2);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: BackgroundRectangle demo
  scene.at(0).play(fadeIn(targetCircle, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeIn(backgroundRect, { duration: 1, rateFunc: smooth }));
  scene.at('+=2').play(fadeOut(targetCircle, { duration: 0.5, rateFunc: smooth }));
  scene.at('+=0').play(fadeOut(backgroundRect, { duration: 0.5, rateFunc: smooth }));

  // Phase 2: SurroundingRectangle demo
  scene.at('+=0.2').play(fadeIn(targetRect, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(create(surroundingRect, { duration: 1, rateFunc: smooth }));
  scene.at('+=2').play(fadeOut(targetRect, { duration: 0.5, rateFunc: smooth }));
  scene.at('+=0').play(fadeOut(surroundingRect, { duration: 0.5, rateFunc: smooth }));

  // Phase 3: Cross demo
  scene.at('+=0.2').play(fadeIn(cross1, { duration: 0.8, rateFunc: smooth }));
  scene.at('+=0.3').play(fadeIn(cross2, { duration: 0.8, rateFunc: smooth }));
  scene.at('+=2').play(fadeOut(cross1, { duration: 0.5, rateFunc: smooth }));
  scene.at('+=0').play(fadeOut(cross2, { duration: 0.5, rateFunc: smooth }));

  // Phase 4: Grid demo
  scene.at('+=0.2').play(fadeIn(grid1, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeIn(grid2, { duration: 1, rateFunc: smooth }));

  console.log('[ShapeMatchers Test] Animation loaded!');
  console.log('- Phase 1: BackgroundRectangle behind blue circle');
  console.log('- Phase 2: SurroundingRectangle around green rectangle');
  console.log('- Phase 3: Cross X-shaped markers');
  console.log('- Phase 4: Grid coordinate systems');
}

runAnimation().catch(console.error);
