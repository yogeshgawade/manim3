// Text Test - Two Phase Animation
import type { Scene } from '../../src/scene/Scene';
import { Text } from '../../src/mobjects/text/Text';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn, fadeOut } from '../../src/animation/FadeGroupTrack';
import { moveTo } from '../../src/animation/MoveTrack';
import { rotateTo } from '../../src/animation/RotateTrack';
import { scaleTo } from '../../src/animation/ScaleTrack';
import { GREEN, BLUE, RED, YELLOW, PURPLE } from '../../src/constants/colors';
import { ValueTracker } from '../../src/animation/ValueTrack';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

// Create Text mobject with styling
const text = new Text({
  text: 'Hello Manim3!',
  fontSize: 72,
  color: RED,
  fontFamily: 'CMU Serif, Georgia, Times New Roman, serif',
  fontWeight: 'bold',
  textAlign: 'center',
});
text.position = [-3, 0, 0];

// Add to scene after setup

scene.add(text);

async function runAnimation() {
  scene.scheduler.reset();

  // Phase 1: Fade in on left, move right, fade out
  scene.at(1).play(fadeIn(text, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(text, [3, 0, 0], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeOut(text, { duration: 1, rateFunc: smooth }));

  // Phase 2: Reappear at center with text change, rotation, and scale
  scene.at('+=0.5').play(fadeIn(text, { duration: 0.5, rateFunc: smooth }));
  scene.at('+=0.5').play(moveTo(text, [0, 0, 0], { duration: 1.5, rateFunc: smooth }));

  // Animate text change using ValueTracker
  const textTracker = new ValueTracker(0);
  const texts = ['Hello Manim3!', 'Text Animation', 'ValueTracker', 'Works!'];
  const textAnim = textTracker.animateTo(3, 2, t => t, (idx) => {
    const i = Math.round(idx) % texts.length;
    text.setText(texts[i]);
  });
  scene.at('+=0.5').play(textAnim);

  scene.at('+=0.5').play(rotateTo(text, [0, 0, Math.PI * 2], { duration: 1.5, rateFunc: smooth }));
  scene.at('+=0.5').play(scaleTo(text, 1.5, { duration: 1, rateFunc: smooth }));
  scene.at('+=0.5').play(fadeOut(text, { duration: 1, rateFunc: smooth }));

  console.log('[Text Test] Animation loaded!');
  console.log('- Phase 1: Fade in left, move right, fade out');
  console.log('- Phase 2: Reappear center, text change via ValueTracker, rotate, scale, fade out');
}

runAnimation().catch(console.error);
