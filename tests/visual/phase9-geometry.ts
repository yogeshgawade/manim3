// Phase 9 Geometry Demo - Circle with CreateTrack lag ratio test + Group Fade test
import type { Scene } from '../../src/scene/Scene';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { FadeTrack, fadeIn, fadeOut } from '../../src/animation/FadeTrack';
import { FadeGroupTrack, fadeInGroup, fadeOutGroup } from '../../src/animation/FadeGroupTrack';
import { CreateTrack } from '../../src/animation/CreateTrack';
import { createGroup } from '../../src/animation/CreateGroupTrack';
import { Group } from '../../src/core/Group';
import { MathTex } from '../../src/mobjects/text/MathTex';

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



// Create a circle with MeshLine renderer
const circle = new Circle({
  center: [-2, 0, 0],
  radius: 1,
  color: '#58C4DD',
  strokeWidth: 4,
  fillOpacity: 0.1,
});
circle.strokeRendererType = 'meshline';
circle.opacity = 0;

// Create a circle with MeshLine renderer
const circle2 = new Circle({
  center: [2, 0, 0],
  radius: 1,
  color: '#58C4DD',
  strokeWidth: 4,
  fillOpacity: 0.1,
});
circle2.strokeRendererType = 'meshline';
circle2.opacity = 0;

scene.add(circle);
scene.add(circle2);

// Group circles for createGroup animation
const circleGroup = new Group(circle, circle2);

// Create MathTex formulas BEFORE scheduling animations
const formula = new MathTex({
  latex: '\\int_{a}^{b} f(x) \\, dx',
  color: '#ffcc00',
  fontSize: 2,
  position: [0, 2.5, 0],
  fillOpacity: 0.2,
  strokeWidth: 1
});
//formula.opacity = 0; // Start invisible


const multiFormula = new MathTex({
  latex: ['E', '=', 'mc^2'],
  color: '#ff6b6b',
  fontSize: 2,
  position: [0, -2.5, 0],
  fillOpacity: 0.2,
  strokeWidth: 1
});
await Promise.all([formula.waitForRender(), multiFormula.waitForRender()]);

// Use it:
setInvisible(formula);
setInvisible(multiFormula);
//multiFormula.opacity = 0;
scene.add(formula);
scene.add(multiFormula);

// Animation - Clean timeline using bookmarks and relative positioning
async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Circles appear with createGroup (staggered stroke draw then fill)
  scene.at(0.5).play(createGroup(circleGroup, 1.5, undefined, 0.9, 0.1));
  //scene.at(0.5).play(fadeIn(circle, 1));

  // Mark this point for formula fade-in
  scene.addBookmark('formulasIn');

  // Phase 2: Formulas create in (separately, with stagger)
  scene.at('+=0.5').play(createGroup(formula, 1.5, undefined, 0.5, 0.1));
  scene.at('+=0.5').play(createGroup(multiFormula, 1.5, undefined, 0.5, 0.1));

  // Phase 3: Hold, then everything fades out
  scene.at('+=2').play(new FadeTrack(circle, 1, 0, 1));
  scene.at('+=0.5').play(fadeOutGroup(formula, 1, undefined, 0.1));
  scene.at('+=0').play(fadeOutGroup(multiFormula, 1, undefined, 0.1));

  //scene.seek(0);
  console.log('Circle CreateTrack test loaded!');
}

// Start animation after setup
runAnimation().catch(console.error);
