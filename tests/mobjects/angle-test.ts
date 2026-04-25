// Angle Test - Demonstrates Angle class with rotating line
// Tests: Angle creation, dynamic update via updateFromLines

import type { Scene } from '../../src/scene/Scene';
import { Line } from '../../src/mobjects/geometry/Line';
import { Angle } from '../../src/mobjects/geometry/AngleShapes';
import { ValueTracker } from '../../src/animation/ValueTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { create } from '../../src/animation/CreateGroupTrack';
import { WHITE, YELLOW } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Fixed horizontal line
const line1 = new Line({ start: [0, 0, 0], end: [2, 0, 0], color: WHITE });

// Rotating line (starts at pi/4 angle)
const line2 = new Line({ start: [0, 0, 0], end: [Math.sqrt(2), Math.sqrt(2), 0], color: WHITE });

// Angle between the two lines
const angle = new Angle({ line1, line2 }, { radius: 0.6, color: YELLOW, strokeWidth: 4 });

scene.add(line1);
scene.add(line2);
scene.add(angle);

// ValueTracker for rotation animation
const rotationTracker = new ValueTracker(0);

async function runAnimation() {
  scene.scheduler.reset();

  scene.at(0).play(create(line1, { duration: 0.5, rateFunc: smooth }));
  scene.at('+=0').play(create(line2, { duration: 0.5, rateFunc: smooth }));
  scene.at('+=0.3').play(create(angle, { duration: 0.5, rateFunc: smooth }));

  // Animate: rotate line2 and update angle dynamically
  scene.at('+=0.5').play(
    rotationTracker.animateTo(Math.PI / 2, 4, smooth, (rotation) => {
      // Rotate line2 around origin (radius 2)
      const x = Math.cos(rotation + Math.PI / 4) * 2;
      const y = Math.sin(rotation + Math.PI / 4) * 2;
      line2.setEnd([x, y, 0]);

      // Update angle to follow the rotating line
      angle.updateFromLines(line1, line2);
    })
  );

  console.log('[Angle Test] Angle dynamically updates as line2 rotates');
}

runAnimation().catch(console.error);
