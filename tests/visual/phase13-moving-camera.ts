// Phase 13 MovingCameraScene - Demo with animated camera pan and zoom
import { MovingCameraScene } from '../../src/scene/MovingCameraScene';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { Dot } from '../../src/mobjects/geometry/Dot';
import { Square } from '../../src/mobjects/geometry/Rectangle';
import { moveTo } from '../../src/animation/MoveTrack';
import { scaleTo } from '../../src/animation/ScaleTrack';
import { BLUE, RED, YELLOW, PURPLE, GREEN, ORANGE, WHITE } from '../../src/constants/colors';
import { smooth } from '../../src/utils/rateFunctions';
import type { Vec3 } from '../../src/core/types';

const scene = (window as any).testScene as MovingCameraScene;

// Create a grid of dots to demonstrate camera movement
const dots: Dot[] = [];
const positions: Vec3[] = [
  [-4, 3, 0], [0, 3, 0], [4, 3, 0],
  [-4, 0, 0], [0, 0, 0], [4, 0, 0],
  [-4, -3, 0], [0, -3, 0], [4, -3, 0],
];

const colors = [RED, ORANGE, YELLOW, GREEN, BLUE, PURPLE, RED, ORANGE, YELLOW];

for (let i = 0; i < positions.length; i++) {
  const dot = new Dot({ point: positions[i], color: colors[i], radius: 0.2 });
  dots.push(dot);
  scene.add(dot);
}

// Add some larger shapes
const centerCircle = new Circle({
  color: WHITE,
  radius: 1.5,
  strokeWidth: 3,
});
scene.add(centerCircle);

// Corner squares
const topLeftSquare = new Square({
  color: RED,
  sideLength: 1,
  fillOpacity: 0.3,
});
topLeftSquare.moveTo([-4, 3, 0]);
scene.add(topLeftSquare);

const bottomRightSquare = new Square({
  color: BLUE,
  sideLength: 1,
  fillOpacity: 0.3,
});
bottomRightSquare.moveTo([4, -3, 0]);
scene.add(bottomRightSquare);

async function runAnimation() {
  scene.scheduler.reset();

  const cameraFrame = scene.cameraFrame;

  console.log('MovingCameraScene demo starting...');
  console.log('- Camera will pan between different points');
  console.log('- Camera will zoom in and out');

  // Demo 1: Pan camera to top-left corner
  console.log('Panning to top-left...');
  scene.at(0).play(
    moveTo(cameraFrame, [-4, 3, 0], 2, smooth)
  );

  // Demo 2: Pan to top-right while zooming in (starts after +0.5s gap)
  console.log('Panning to top-right with 2x zoom...');
  scene.at('+=0.5').play(
    moveTo(cameraFrame, [4, 3, 0], 2, smooth),
    scaleTo(cameraFrame, 0.5, 2, smooth)  // 0.5 scale = 2x zoom
  );

  // Demo 3: Pan to bottom-right while zooming out
  console.log('Panning to bottom-right with 0.5x zoom...');
  scene.at('+=0.5').play(
    moveTo(cameraFrame, [4, -3, 0], 2, smooth),
    scaleTo(cameraFrame, 2.0, 2, smooth)  // 2.0 scale = 0.5x zoom (wider view)
  );

  // Demo 4: Pan to bottom-left
  console.log('Panning to bottom-left...');
  scene.at('+=0.5').play(
    moveTo(cameraFrame, [-4, -3, 0], 2, smooth)
  );

  // Demo 5: Return to center with normal zoom
  console.log('Returning to center with normal zoom...');
  scene.at('+=0.5').play(
    moveTo(cameraFrame, [0, 0, 0], 2, smooth),
    scaleTo(cameraFrame, 1.0, 2, smooth)
  );

  // Demo 6: Zoom in on center
  console.log('Zooming in on center...');
  scene.at('+=0.5').play(
    scaleTo(cameraFrame, 0.3, 2, smooth)  // 3.3x zoom
  );

  // Demo 7: Zoom out to see everything
  console.log('Zooming out to see all...');
  scene.at('+=0.5').play(
    scaleTo(cameraFrame, 2.5, 2, smooth)  // 0.4x zoom
  );

  // Demo 8: Quick tour of all 9 dots
  console.log('Quick tour of all dots...');
  let time = scene.scheduler.lastTrackEndTime + 0.5;
  for (const dot of dots) {
    scene.at(time).play(
      moveTo(cameraFrame, dot.getCenter(), 0.5, smooth),
      scaleTo(cameraFrame, 0.6, 0.5, smooth)
    );
    time += 0.6;
  }

  // Final: Return to normal
  console.log('Returning to normal view...');
  scene.at('+=0.5').play(
    moveTo(cameraFrame, [0, 0, 0], 1.5, smooth),
    scaleTo(cameraFrame, 1.0, 1.5, smooth)
  );

  // Play and wait for completion
  scene.scheduler.play();
  await new Promise<void>((resolve) => {
    scene.scheduler.onComplete = () => {
      console.log('MovingCameraScene demo complete!');
      console.log('- Camera panned to multiple locations');
      console.log('- Camera zoomed in (0.3x) and out (2.5x)');
      console.log('- Combined move + scale animations worked together');
      resolve();
    };
  });
}

runAnimation().catch(console.error);
