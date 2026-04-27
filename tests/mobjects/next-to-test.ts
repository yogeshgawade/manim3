import type { Scene } from '../../src/scene/Scene';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { Square } from '../../src/mobjects/geometry/Rectangle';
import { MathTex } from '../../src/mobjects/text/MathTex';
import { fadeIn } from '../../src/animation/FadeGroupTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { DOWN, RIGHT } from '../../src/core/types';
import { Group } from '../../src/core/Group';
import { VGroup } from '../../src/core/VGroup';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

const circle1 = new Circle({
  radius: 1,
  fillOpacity: 0.3,
  strokeWidth: 4,
});

const square1 = new Square({
  sideLength: 1.5,
  fillOpacity: 0.3,
  strokeWidth: 4,
});

circle1.position = [-4, 0, 0];
square1.nextTo(circle1, RIGHT, 0.5);

const group1 = new Group(circle1, square1);

const circle2 = new Circle({
  radius: 1,
  fillOpacity: 0.3,
  strokeWidth: 4,
});

const square2 = new Square({
  sideLength: 1.5,
  fillOpacity: 0.3,
  strokeWidth: 4,
});

circle2.position = [0, 0, 0];
square2.nextTo(circle2, RIGHT, 0.5);

const group2 = new Group(circle2, square2);
group2.nextTo(group1, RIGHT, 1.5);

const label = new MathTex({
  latex: 'x^2 + y^2',
  fontSize: 1,
});
await label.waitForRender();

label.nextTo(group2, RIGHT, 1);

const arrangedGroup = new VGroup(
  new Circle({ radius: 0.4, fillOpacity: 0.3, strokeWidth: 4 }),
  new Square({ sideLength: 0.7, fillOpacity: 0.3, strokeWidth: 4 }),
  new Circle({ radius: 0.3, fillOpacity: 0.3, strokeWidth: 4 }),
);
arrangedGroup.arrange(RIGHT, 0.4);
arrangedGroup.nextTo(group1, DOWN, 0.5);

scene.add(group1, group2, label, arrangedGroup);

async function runAnimation() {
  scene.scheduler.reset();

  scene.at(1).play(fadeIn(group1, { duration: 1, rateFunc: smooth }));
  scene.at(1).play(fadeIn(group2, { duration: 1, rateFunc: smooth }));
  scene.at(1).play(fadeIn(label, { duration: 1, rateFunc: smooth }));
  scene.at(1).play(fadeIn(arrangedGroup, { duration: 1, rateFunc: smooth }));

  console.log('[NextTo Test] Animation loaded!');
  console.log('- Group 1: square positioned nextTo(circle, RIGHT, 0.5)');
  console.log('- Group 2: square positioned nextTo(circle, RIGHT, 0.5)');
  console.log('- Group 2 positioned nextTo(group1, RIGHT, 1.5)');
  console.log('- MathTex label positioned nextTo(group2, RIGHT, 1)');
  console.log('- VGroup arranged with arrange(RIGHT, 0.4) and placed below group1');
}

runAnimation().catch(console.error);
