// Phase 7 MathTex Demo - Morph between B and j
import type { Scene } from '../../src/scene/Scene';
import type { VMobject } from '../../src/core/VMobject';
import { MathTex } from '../../src/mobjects/text/MathTex';
import { renderLatexToSVG } from '../../src/mobjects/text/MathJaxRenderer';
import { VGroupMorphTrack } from '../../src/animation/VGroupMorphTrack';
import { fadeInGroup } from '../../src/animation/FadeGroupTrack';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene;

function setInvisible(mob: any) {
  mob.opacity = 0;
  if (mob.children) {
    for (const child of mob.children) {
      //child.opacity = 0;
      setInvisible(child);
    }
  }
}

// Log SVG for 'B' from MathJax


// Create two MathTex expressions
const tex1 = new MathTex({
  latex: 'CBiD',
  color: '#4fc3f7',
  fontSize: 3,
  position: [-2, -1, 0],
});


const tex2 = new MathTex({
  latex: 'OCj',
  color: '#ff6b6b',
  fontSize: 3,
  position: [2, 1, 0]
});

await Promise.all([tex1.waitForRender(), tex2.waitForRender()]);

setInvisible(tex1);
//setInvisible(tex2);
scene.add(tex1);

  // Add both to scene


// Animation - Fade in both expressions then morph
async function runAnimation() {
  // Wait for both to render
 

  // Build timeline
  scene.scheduler.reset();

  // Phase 1: Fade in both expressions
  scene.at(0.5).play(fadeInGroup(tex1, 1));
  //scene.at(1).play(fadeInGroup(tex2, 1));

  // Phase 2: Morph after fade completes - pass groups directly
  const morphTrack = new VGroupMorphTrack(tex1, tex2, 2.0, (t) => t);

  // Phase 2: Morph after fade completes
  scene.at('+=1').play(morphTrack);
  
  //scene.seek(0);
  console.log('Phase 7 MathTex morph demo loaded. Both fade in, then morph.');
}

await runAnimation().catch(console.error);
