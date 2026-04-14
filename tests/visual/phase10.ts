// Phase 10 ZoomedScene - Simple Demo with animated frame movement
import type { Scene } from '../../src/scene/Scene';
import type { ZoomedScene } from '../../src/scene/ZoomedScene';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { Dot } from '../../src/mobjects/geometry/Dot';
import { moveTo } from '../../src/animation/MoveTrack';
import { scaleTo } from '../../src/animation/ScaleTrack';
import { BLUE, RED, YELLOW, PURPLE, GREEN } from '../../src/constants/colors';
import { smooth } from '../../src/utils/rateFunctions';

declare global {
  interface Window { testScene: Scene; }
}

const scene = window.testScene as ZoomedScene;

// Create multiple dots at different positions for the frame to zoom on
const dot1 = new Dot({ color: RED, radius: 0.15 });
dot1.setPoint([-2, 1.5, 0]);

const dot2 = new Dot({ color: BLUE, radius: 0.15 });
dot2.setPoint([2, 1.5, 0]);

const dot3 = new Dot({ color: GREEN, radius: 0.15 });
dot3.setPoint([0, -1.5, 0]);

const centerDot = new Dot({ color: PURPLE, radius: 0.12 });
centerDot.setPoint([0, 0, 0]);

scene.add(dot1, dot2, dot3, centerDot);

// Setup zoom frame at dot1 initially
const frame = scene.zoomedCamera.frame;
frame.moveTo(dot1.getCenter());
frame.color = YELLOW;

// Setup display frame color
scene.zoomedDisplay.displayFrame.color = RED;

// Position zoomed display in upper right
scene.zoomedDisplay.moveTo([3.5, 2.5, 0]);

// Activate zooming
scene.activateZooming();

async function runAnimation() {
  scene.scheduler.reset();

  const frame = scene.zoomedCamera.frame;

  // Demo: Combined scale + move animations
  // Move to dot2 while shrinking frame (higher zoom)
  scene.at(0).play(
    moveTo(frame, dot2.getCenter(), 2, smooth),
    scaleTo(frame, 0.5, 2, smooth)  // shrink to half size = 2x zoom
  );

  // Move to dot3 while expanding frame (lower zoom)
  scene.at('+=0.1').play(
    moveTo(frame, dot3.getCenter(), 2, smooth),
    scaleTo(frame, 1.5, 2, smooth)  // grow to 1.5x = 0.67x zoom
  );

  // Move to center with normal scale
  scene.at('+=0.1').play(
    moveTo(frame, centerDot.getCenter(), 2, smooth),
    scaleTo(frame, 1.0, 2, smooth)  // return to normal scale
  );

  // Move back to dot1 with pulse effect (scale down then up)
  scene.at('+=0.1').play(
    moveTo(frame, dot1.getCenter(), 2, smooth),
    scaleTo(frame, 0.3, 1, smooth)   // quick zoom in
  );
  scene.at('+=0').play(
    scaleTo(frame, 1.0, 1, smooth)  // then back to normal
  );

  console.log('ZoomedScene animated demo loaded!');
  console.log('- Yellow frame moves AND scales between dots');
  console.log('- Watch zoom level change dynamically!');
}

runAnimation().catch(console.error);
