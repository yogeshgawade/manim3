import type { Scene } from '../../src/scene/Scene';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { Square } from '../../src/mobjects/geometry/Rectangle';
import { VGroup } from '../../src/core/VGroup';
import { UP, DOWN, LEFT, RIGHT, UL, DR } from '../../src/core/types';
import { fadeIn } from '../../src/animation/FadeGroupTrack';
import { smooth } from '../../src/utils/rateFunctions';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

const centeredCircle = new Circle({
  radius: 0.7,
  fillOpacity: 0.3,
  strokeWidth: 4,
});
centeredCircle.center();

const topSquare = new Square({
  sideLength: 1,
  fillOpacity: 0.3,
  strokeWidth: 4,
});
topSquare.toEdge(UP, 0.4);

const leftCircle = new Circle({
  radius: 0.5,
  fillOpacity: 0.3,
  strokeWidth: 4,
});
leftCircle.toEdge(LEFT, 0.6);

const cornerSquare = new Square({
  sideLength: 0.9,
  fillOpacity: 0.3,
  strokeWidth: 4,
});
cornerSquare.toCorner(UL, 0.5);

const cornerCircle = new Circle({
  radius: 0.45,
  fillOpacity: 0.3,
  strokeWidth: 4,
});
cornerCircle.toCorner(DR, 0.5);

const matchedSquare = new Square({
  sideLength: 0.8,
  fillOpacity: 0.3,
  strokeWidth: 4,
});
matchedSquare.setX(2.5);
matchedSquare.setY(-1.2);

const matchedCircle = new Circle({
  radius: 0.4,
  fillOpacity: 0.3,
  strokeWidth: 4,
});
matchedCircle.matchX(matchedSquare);
matchedCircle.matchY(topSquare);

const grid = new VGroup(
  new Square({ sideLength: 0.5, fillOpacity: 0.3, strokeWidth: 4 }),
  new Circle({ radius: 0.25, fillOpacity: 0.3, strokeWidth: 4 }),
  new Square({ sideLength: 0.7, fillOpacity: 0.3, strokeWidth: 4 }),
  new Circle({ radius: 0.2, fillOpacity: 0.3, strokeWidth: 4 }),
  new Square({ sideLength: 0.6, fillOpacity: 0.3, strokeWidth: 4 }),
  new Circle({ radius: 0.3, fillOpacity: 0.3, strokeWidth: 4 }),
);
grid.arrangeInGrid(2, 3, [1.2, 1.1]);
grid.toEdge(DOWN, 0.8);

scene.add(
  centeredCircle,
  topSquare,
  leftCircle,
  cornerSquare,
  cornerCircle,
  matchedSquare,
  matchedCircle,
  grid,
);

async function runAnimation() {
  scene.scheduler.reset();

  scene.at(1).play(fadeIn(centeredCircle, { duration: 1, rateFunc: smooth }));
  scene.at(1).play(fadeIn(topSquare, { duration: 1, rateFunc: smooth }));
  scene.at(1).play(fadeIn(leftCircle, { duration: 1, rateFunc: smooth }));
  scene.at(1).play(fadeIn(cornerSquare, { duration: 1, rateFunc: smooth }));
  scene.at(1).play(fadeIn(cornerCircle, { duration: 1, rateFunc: smooth }));
  scene.at(1).play(fadeIn(matchedSquare, { duration: 1, rateFunc: smooth }));
  scene.at(1).play(fadeIn(matchedCircle, { duration: 1, rateFunc: smooth }));
  scene.at(1).play(fadeIn(grid, { duration: 1, rateFunc: smooth }));

  console.log('[Positioning Helpers Test] Animation loaded!');
  console.log('- center() on a circle');
  console.log('- toEdge(UP) and toEdge(LEFT)');
  console.log('- toCorner(UL) and toCorner(DR)');
  console.log('- setX/setY and matchX/matchY');
  console.log('- arrangeInGrid(2, 3, [1.2, 1.1])');
}

runAnimation().catch(console.error);
