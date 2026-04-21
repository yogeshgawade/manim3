// Arrow Test - Two Phase Animation + ValueTracker endpoint
import type { Scene } from '../../src/scene/Scene';
import { Arrow } from '../../src/mobjects/geometry/Arrow';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { create } from '../../src/animation/CreateGroupTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { rotateTo } from '../../src/animation/RotateTrack';
import { colorTo } from '../../src/animation/ColorTrack';
import { scaleTo } from '../../src/animation/ScaleTrack';
import { ValueTracker } from '../../src/animation/ValueTrack';
import { GREEN, RED } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Single arrow for all animations - centered on screen
const arrow = new Arrow({
  start: [-1.5, 0, 0],
  end: [1.5, 0, 0],
  color: RED,
  strokeWidth: 4,
  tipLength: 0.4,
  tipWidth: 0.15,
});
arrow.position = [0, 0, 0];
scene.add(arrow);



async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in on left, move right, fade out
  scene.at(1).play(fadeIn(arrow, { duration: 1, rateFunc: smooth }));
  // Phase 3: ValueTracker - animate arrow endpoint in circle around fixed start
  const angleTracker = new ValueTracker(0);
  const startPoint = arrow.getStart();
  const arrowLength = 3;

  // Animate tracker from 0 to 2*PI (full circle) over 3 seconds
  // onChange callback updates arrow end directly
  scene.at('+=0.5').play(
    angleTracker.animateTo(Math.PI * 2, 3, smooth, (angle) => {
      const endX = startPoint[0] + Math.cos(angle) * arrowLength;
      const endY = startPoint[1] + Math.sin(angle) * arrowLength;
      arrow.setEnd([endX, endY, 0]);
    })
  );


}

runAnimation().catch(console.error);
