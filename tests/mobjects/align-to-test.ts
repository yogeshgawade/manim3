import type { Scene } from '../../src/scene/Scene';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { Square } from '../../src/mobjects/geometry/Rectangle';
import { MathTex } from '../../src/mobjects/text/MathTex';
import { Group } from '../../src/core/Group';
import { UP, DOWN, LEFT, RIGHT } from '../../src/core/types';
import { VGroup } from '../../src/core/VGroup';
import { fadeIn } from '../../src/animation/FadeGroupTrack';
import { smooth } from '../../src/utils/rateFunctions';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

const circle = new Circle({
  radius: 1,
  fillOpacity: 0.3,
  strokeWidth: 4,
});
circle.position = [-3, 0, 0];

const square = new Square({
  sideLength: 1.5,
  fillOpacity: 0.3,
  strokeWidth: 4,
});
square.position = [2, 1.5, 0];
square.alignTo(circle, UP);

const label = new MathTex({
  latex: 'alignTo',
  fontSize: 1,
});
await label.waitForRender();
label.position = [0, -2, 0];

label.alignTo(circle, LEFT);

const groupA = new Group(circle, square);

const circle2 = new Circle({
  radius: 0.8,
  fillOpacity: 0.3,
  strokeWidth: 4,
});
circle2.position = [1, -2, 0];

const square2 = new Square({
  sideLength: 1.2,
  fillOpacity: 0.3,
  strokeWidth: 4,
});
square2.position = [3, -2, 0];
square2.alignTo(circle2, DOWN);

const groupB = new Group(circle2, square2);
groupB.alignTo(groupA, RIGHT);

const arrangedGroup = new VGroup(
  new Square({ sideLength: 0.8, fillOpacity: 0.3, strokeWidth: 4 }),
  new Circle({ radius: 0.35, fillOpacity: 0.3, strokeWidth: 4 }),
  new Square({ sideLength: 0.6, fillOpacity: 0.3, strokeWidth: 4 }),
);
arrangedGroup.arrange(RIGHT, 0.35);
arrangedGroup.alignTo(groupA, LEFT);
arrangedGroup.nextTo(groupA, DOWN, 1.2);

scene.add(groupA, groupB, label, arrangedGroup);

async function runAnimation() {
  scene.scheduler.reset();

  scene.at(1).play(fadeIn(groupA, { duration: 1, rateFunc: smooth }));
  scene.at(1).play(fadeIn(groupB, { duration: 1, rateFunc: smooth }));
  scene.at(1).play(fadeIn(label, { duration: 1, rateFunc: smooth }));
  scene.at(1).play(fadeIn(arrangedGroup, { duration: 1, rateFunc: smooth }));

  console.log('[AlignTo Test] Animation loaded!');
  console.log('- Square aligned to circle top edge with alignTo(circle, UP)');
  console.log('- Label aligned to circle left edge with alignTo(circle, LEFT)');
  console.log('- Group B aligned to Group A right edge with alignTo(groupA, RIGHT)');
  console.log('- VGroup arranged with arrange(RIGHT, 0.35), then aligned left and placed below groupA');
}

runAnimation().catch(console.error);
