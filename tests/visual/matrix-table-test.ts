// IntegerMatrix Test - Single object with DecimalNumber entries
// Tests: Create In -> Hold -> Create Out using scene scheduler

import type { Scene } from '../../src/scene/Scene';
import { IntegerMatrix } from '../../src/mobjects/matrix';
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

// IntegerMatrix with parentheses and DecimalNumber entries
const matrix = new IntegerMatrix([
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
], {
  bracketType: '()',
  position: [0, 0, 0],
  vBuff: 0.1,
  hBuff: 0.8,
  bracketColor: '#4fc3f7',
});

// IntegerMatrix uses DecimalNumber (synchronous), no waitForRender needed
setInvisible(matrix);
scene.add(matrix);

async function runAnimation() {
  scene.scheduler.reset();

  // Sequence: Create In -> Hold -> Fade Out
  scene.at(1).play(createGroup(matrix, 1, smooth));
  scene.at('+=2').play(fadeOutGroup(matrix, 1, smooth));

  console.log('[IntegerMatrix] Create In -> Hold -> Fade Out test loaded!');
  console.log('- Phase 1: IntegerMatrix create in (1s)');
  console.log('- Phase 2: Hold (2s)');
  console.log('- Phase 3: IntegerMatrix fade out (1s)');
}

runAnimation().catch(console.error);
