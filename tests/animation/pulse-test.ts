// PulseTrack Animation Test - Create circle, fade in, pulse, then fade out
import type { Scene } from '../../src/scene/Scene';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { pulse } from '../../src/animation/PulseTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { GREEN, TEAL } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create a teal circle
const circle = new Circle({
  radius: 1.5,
  color: TEAL,
  strokeWidth: 4,
  fillColor: TEAL,
  fillOpacity: 0.3,
});

circle.position = [0, 0, 0];

// Add to scene
scene.add(circle);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in the circle
  scene.at(0).play(fadeIn(circle, { duration: 1, rateFunc: smooth }));
  console.log('[Pulse Test] Phase 1: Circle fades in');

  // Phase 2: Pulse the circle (3 pulses, scale to 1.3x)
  scene.at('+=0.5').play(
    pulse(circle, { duration: 1.5, nPulses: 3, scaleFactor: 1.3 })
  );
  console.log('[Pulse Test] Phase 2: Circle pulses 3 times');

  // Phase 3: Second pulse with different settings
  scene.at('+=0.5').play(
    pulse(circle, { duration: 1, nPulses: 2, scaleFactor: 1.5 })
  );
  console.log('[Pulse Test] Phase 3: Second pulse (2 times, larger)');

  // Phase 4: Fade out
  scene.at('+=0.5').play(fadeOut(circle, { duration: 1, rateFunc: smooth }));
  console.log('[Pulse Test] Phase 4: Circle fades out');

  console.log('[Pulse Test] Animation loaded!');
  console.log('- Phase 1: Teal circle fades in (1s)');
  console.log('- Phase 2: Circle pulses 3 times with 1.3x scale (1.5s)');
  console.log('- Phase 3: Second pulse: 2 times with 1.5x scale (1s)');
  console.log('- Phase 4: Circle fades out (1s)');
}

runAnimation().catch(console.error);
