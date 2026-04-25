// BillboardGroup Test - 3D Axes with MathTex labels that always face camera
import type { Scene } from '../../src/scene/Scene';
import { ThreeDScene } from '../../src/scene/ThreeDScene';
import { ThreeDAxes } from '../../src/mobjects/three/ThreeDAxes';
import { BillboardGroup } from '../../src/mobjects/three/BillboardGroup';
import { MathTex } from '../../src/mobjects/text/MathTex';
import { ValueTracker } from '../../src/animation/ValueTrack';
import { smooth } from '../../src/utils/rateFunctions';
import { fadeIn } from '../../src/animation/FadeGroupTrack';
import { RED, GREEN, BLUE } from '../../src/constants/colors';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as ThreeDScene;

// Set camera position for 3D view
scene.setCamera([8, 6, 8], [0, 0, 0]);

// === Phase 1: Create 3D Axes ===
const axes = new ThreeDAxes({
  xRange: [-4, 4, 1],
  yRange: [-4, 4, 1],
  zRange: [-4, 4, 1],
  xColor: RED,
  yColor: GREEN,
  zColor: BLUE,
  showTicks: true,
  withLabels: false, // We'll use BillboardGroup labels instead
  tipLength: 0.3,
  tipRadius: 0.12,
  shaftRadius: 0.02,
});

scene.add(axes);

// === Phase 2: Create BillboardGroup labels near cone tips ===
// These labels always face the camera regardless of view angle

// X-axis label near cone tip (at x=4)
const xLabelBillboard = new BillboardGroup({
  position: [4.5, 0.3, 0], // Near the X-axis cone tip, slightly offset
  lockUpDirection: true,
});

const xLabel = new MathTex({
  latex: 'x',
  color: RED,
  fontSize: 2,
  strokeWidth: 2,
  fillOpacity: 1,
});
xLabelBillboard.add(xLabel);

// Y-axis label near cone tip (at y=4)
const yLabelBillboard = new BillboardGroup({
  position: [0.3, 4.5, 0], // Near the Y-axis cone tip, slightly offset
  lockUpDirection: true,
});

const yLabel = new MathTex({
  latex: 'y',
  color: GREEN,
  fontSize: 2,
  strokeWidth: 2,
  fillOpacity: 1,
});
yLabelBillboard.add(yLabel);

// Z-axis label near cone tip (at z=4)
const zLabelBillboard = new BillboardGroup({
  position: [0.3, 0, 4.5], // Near the Z-axis cone tip, slightly offset
  lockUpDirection: true,
});

const zLabel = new MathTex({
  latex: 'z',
  color: BLUE,
  fontSize: 2,
  strokeWidth: 2,
  fillOpacity: 1,
});
zLabelBillboard.add(zLabel);

// === Fixed-in-frame title (top-left) ===
// This stays on screen regardless of camera movement
const titleLabel = new MathTex({
  latex: '\\text{Fixed in frame}',
  color: '#FFD700', // Gold color
  fontSize: 1,
  strokeWidth: 2,
  fillOpacity: 1,
});
titleLabel.position = [-4, 3, 0]; // Top-left area of viewport

// Wait for MathTex to render before adding to scene
async function setupLabels() {
  await Promise.all([
    xLabel.waitForRender(),
    yLabel.waitForRender(),
    zLabel.waitForRender(),
    titleLabel.waitForRender(),
  ]);

  // Add billboards to scene
  scene.add(xLabelBillboard);
  scene.add(yLabelBillboard);
  scene.add(zLabelBillboard);

  // Add fixed-in-frame title (stays on screen during camera orbit)
  scene.addFixedInFrameMobjects(titleLabel);
}

// === Phase 3: Animation ===
// Note: Phase numbers refer to animation phases, not label creation phases
async function runAnimation() {
  scene.scheduler.reset();

  // Setup labels first
  await setupLabels();

  // Phase 1: Fade in axes
  scene.at(0).play(fadeIn(axes, { duration: 1, rateFunc: smooth }));
  console.log('[BillboardGroup Test] Phase 1: ThreeDAxes fade in');

  // Phase 2: Fade in billboard labels (relative to previous)
  scene.at('+=0.5').play(fadeIn(xLabelBillboard, { duration: 0.8, rateFunc: smooth }));
  scene.at('+=0.2').play(fadeIn(yLabelBillboard, { duration: 0.8, rateFunc: smooth }));
  scene.at('+=0.2').play(fadeIn(zLabelBillboard, { duration: 0.8, rateFunc: smooth }));
  scene.at('+=0').play(fadeIn(titleLabel, { duration: 0.8, rateFunc: smooth }));
  console.log('[BillboardGroup Test] Phase 2: Billboard labels fade in');

  // Phase 3: Orbit camera to demonstrate billboard always faces camera
  // (the titleLabel stays fixed in frame while camera orbits)
  scene.at('+=0.5').play(
    new ValueTracker(0).animateTo(Math.PI * 2, 8, smooth, (angle) => {
      const radius = 8 * Math.sqrt(2);
      const camX = radius * Math.cos(angle + Math.PI / 4);
      const camZ = radius * Math.sin(angle + Math.PI / 4);
      scene.setCamera([camX, 6, camZ], [0, 0, 0]);
    })
  );
  console.log('[BillboardGroup Test] Phase 3: Camera orbit - labels always face camera');

  console.log('[BillboardGroup Test] Animation loaded!');
  console.log('- Phase 1: ThreeDAxes with cone tips visible');
  console.log('- Phase 2: BillboardGroup labels appear near axis cones');
  console.log('- Phase 3: Camera orbits - x/y/z labels always face camera');
  console.log('- Fixed: "BillboardGroup" title stays fixed in top-left corner');
}

runAnimation().catch(console.error);
