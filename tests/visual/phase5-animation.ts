// Phase 5 Animation Logic - Just the animation, no boilerplate
import type { Scene } from '../../src/scene/Scene';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { Square } from '../../src/mobjects/geometry/Rectangle';
import { fadeIn, fadeOut } from '../../src/animation/FadeTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { scaleTo } from '../../src/animation/ScaleTrack';
import { rotateTo } from '../../src/animation/RotateTrack';
import { colorTo } from '../../src/animation/ColorTrack';
import { parallel, sequence } from '../../src/animation/GroupTrack';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene;

// Create mobjects
const circle = new Circle(1);
circle.color = '#e94560';
circle.interactive = true;
circle.on('click', () => {
  circle.color = circle.color === '#e94560' ? '#4ecca3' : '#e94560';
  circle.markDirty();
});

const square = new Square(2);
square.position = [-3, 2, 0];
square.color = '#4ecca3';
square.opacity = 0;

const circle2 = new Circle(0.8);
circle2.position = [3, -2, 0];
circle2.color = '#f9a825';
circle2.opacity = 0;

// Add to scene (captures initial states)
scene.add(circle, square, circle2);

// Build animation timeline
const buildTimeline = () => {
  scene.scheduler.reset();
  
  scene
    .at(0).play(scaleTo(circle, [2, 2, 1], 3))
    .at('+=0').play(
      parallel(
        rotateTo(circle, [0, 0, Math.PI], 4),
        fadeIn(square, 3)
      )
    )
    .at('+=0').play(
      moveTo(circle, [0, 2, 0], 3),
      moveTo(square, [0, 0, 0], 3)
    )
    .at('+=0').play(
      parallel(
        colorTo(circle, '#4ecca3', 3),
        colorTo(square, '#e94560', 3),
        fadeIn(circle2, 3)
      )
    )
    .at('+=0').play(
      sequence(
        fadeOut(square, 2),
        fadeOut(circle2, 2),
        fadeOut(circle, 2)
      )
    );
  
  console.log('Timeline built. Total duration:', scene.scheduler.totalDuration);
};

// Initialize
buildTimeline();
scene.seek(0);
console.log('Phase 5 animation loaded.');
