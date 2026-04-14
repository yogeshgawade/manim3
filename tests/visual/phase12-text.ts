// Paragraph demo - Word wrapping and alignment
import type { Scene } from '../../src/scene/Scene';
import { Paragraph } from '../../src/mobjects/text/Paragraph';
import { BLUE, GREEN, RED, WHITE, YELLOW } from '../../src/constants/colors';
import { fadeIn, fadeOut } from '../../src/animation/FadeTrack';
import { ValueTracker } from '../../src/animation/ValueTrack';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as Scene;

const longText = 'The quick brown fox jumps over the lazy dog while the sun sets behind the mountains casting long shadows across the valley below.';

// Four paragraphs with different alignments
const leftPara = new Paragraph({
  text: longText,
  width: 4,
  alignment: 'left',
  fontSize: 24,
  color: WHITE,
  position: [-5, 2, 0],
});

const centerPara = new Paragraph({
  text: longText,
  width: 4,
  alignment: 'center',
  fontSize: 24,
  color: YELLOW,
  position: [0, 2, 0],
});

const rightPara = new Paragraph({
  text: longText,
  width: 4,
  alignment: 'right',
  fontSize: 24,
  color: BLUE,
  position: [5, 2, 0],
});

// Animated width paragraph
const dynamicPara = new Paragraph({
  text: longText,
  width: 6,
  alignment: 'left',
  fontSize: 28,
  color: GREEN,
  position: [0, -2, 0],
});

scene.add(leftPara, centerPara, rightPara, dynamicPara);

async function runAnimation() {
  scene.scheduler.reset();

  // Fade in all paragraphs
  scene.at(0).play(fadeIn(leftPara, 0.5));
  scene.at(0.2).play(fadeIn(centerPara, 0.5));
  scene.at(0.4).play(fadeIn(rightPara, 0.5));
  scene.at(0.6).play(fadeIn(dynamicPara, 0.5));

  // Animate width change of dynamic paragraph
  const tracker = new ValueTracker(6);
  const widthAnim = tracker.animateTo(2, 2, t => t, (w) => {
    dynamicPara.setWidth(w);
  });
  scene.at(1.5).play(widthAnim);

  // Fade out
  scene.at(4).play(fadeOut(leftPara, 0.5));
  scene.at(4).play(fadeOut(centerPara, 0.5));
  scene.at(4).play(fadeOut(rightPara, 0.5));
  scene.at(4).play(fadeOut(dynamicPara, 0.5));

  console.log('Paragraph demo loaded!');
}

runAnimation().catch(console.error);
