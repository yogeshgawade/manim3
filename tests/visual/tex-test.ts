// Tex/MathTex Test - Expressions with Create -> FadeOut
// Tests: Create In -> Hold -> Fade Out using scene scheduler

import type { Scene } from '../../src/scene/Scene';
import { Tex, MathTex } from '../../src/mobjects/text';
import { createGroup } from '../../src/animation/CreateGroupTrack';
import { fadeOutGroup } from '../../src/animation/FadeGroupTrack';
import { smooth } from '../../src/utils/rateFunctions';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

function setInvisible(mob: any) {
  mob.opacity = 0;
  if (mob.children) {
    for (const child of mob.children) {
      setInvisible(child);
    }
  }
}

// Test both Tex and MathTex
const tex =  new Tex({
  latex: String.raw`\usepackage{chemfig}\chemfig{-[:29.2]N>[:50.3]-[:96.1,1.069]-[:298.7,0.88]>:[:264.3,0.943](%
-[:188.1,0.864]\phantom{N})-[:329,1.126](<:[:279.7](-[:339.7]O-[:279.7])%
=[:219.7]O)-[:50.4,1.005](-[:189.7,0.813]-[:150,1.178])<:[:30.1]O-[:330.1](%
=[:270.1]O)-[:30.1]=^[:330.1]-[:30.1]=^[:90.1]-[:150.1]=^[:210.1](-[:270.1]%
)}`,
  fontSize: 9,
  position: [-3, 0, 0],
});

const mathTex = new MathTex({
  latex: "XB",
  fontSize: 5,
  position: [3, 0, 0],
});

await tex.waitForRender();
await mathTex.waitForRender();

scene.add(tex);
scene.add(mathTex);


async function runAnimation() {
  scene.scheduler.reset();

  // Sequence: Create In -> Hold -> Fade Out for both
  //scene.at(1).play(createGroup(tex, 1, smooth));
  scene.at(1).play(createGroup(mathTex, 1, smooth));
  scene.at('+=2').play(fadeOutGroup(tex, 1, smooth));
  scene.at('+=0').play(fadeOutGroup(mathTex, 1, smooth));
}

runAnimation();
