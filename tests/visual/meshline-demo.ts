// MeshLine Renderer Demo - Simple circle with create animation
import type { Scene } from '../../src/scene/Scene';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { create } from '../../src/animation/CreateTrack';
import { fadeOut } from '../../src/animation/FadeTrack';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

if (!scene) {
  console.error('Scene not ready - waiting for window.testScene');
  throw new Error('window.testScene is undefined - ensure scene is initialized before running this demo');
}

// Create circle with meshline renderer
const circle = new Circle({
  radius: 1.5,
  color: '#58C4DD',
  strokeWidth: 4,
  fillOpacity: 0.2,
});

// Set meshline renderer
circle.strokeRendererType = 'meshline';
circle.opacity = 0;

scene.add(circle);

// Animation - Fade in, hold, then fade out
async function runAnimation() {
  scene.scheduler.reset();

  // Fade in
  scene.at(0.5).play(create(circle, 2, undefined, 0.9));

  // Hold
  scene.addBookmark('hold');

  // Fade out
  scene.at('+=1.5').play(fadeOut(circle, 1.5));

  console.log('MeshLine demo loaded!');
}

// Start animation after setup
runAnimation().catch(console.error);
