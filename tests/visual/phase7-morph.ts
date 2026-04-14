// Phase 7 Morph Demo - Circle to Square in 3D scene
import type { ThreeDScene } from '../../src/scene/ThreeDScene';
import { VMobject } from '../../src/core/VMobject';
import { fadeIn } from '../../src/animation/FadeTrack';
import { MorphTrack } from '../../src/animation/MorphTrack';
import { ThreeDAxes } from '../../src/mobjects/three/ThreeDAxes';
import { MathTex } from '../../src/mobjects/text/MathTex';

declare global {
  interface Window {
    testScene: ThreeDScene;
  }
}

const scene = window.testScene;

/** Build a circle as cubic bezier (4 arcs) */
function createCircle() {
  const mob = new VMobject();
  const r = 2;
  const k = 0.5522847498; // (4/3) * (sqrt(2) - 1)
  const cx = 0, cy = 0, cz = 0;
  
  const p0 = [cx + r, cy, cz];  // right
  const p1 = [cx, cy + r, cz];  // top
  const p2 = [cx - r, cy, cz];  // left
  const p3 = [cx, cy - r, cz];  // bottom
  
  mob.setPoints3D([
    // Segment 1: right to top
    p0, [cx + r, cy + r * k, cz], [cx + r * k, cy + r, cz], p1,
    // Segment 2: top to left
    [cx - r * k, cy + r, cz], [cx - r, cy + r * k, cz], p2,
    // Segment 3: left to bottom
    [cx - r, cy - r * k, cz], [cx - r * k, cy - r, cz], p3,
    // Segment 4: bottom to right
    [cx + r * k, cy - r, cz], [cx + r, cy - r * k, cz], [...p0],
  ]);
  mob.strokeWidth = 3;
  mob.fillOpacity = 0.3;
  mob.color = 'yellow'; // Blue
  mob.fillColor = 'yellow'; // Match stroke color
  return mob;
}

/** Build a square as cubic bezier */
function createSquare() {
  const mob = new VMobject();
  const s = 2;
  
  // Use straightPath logic - corners with bezier handles
  const corners = [
    [-s, -s, 0], [s, -s, 0], [s, s, 0], [-s, s, 0], [-s, -s, 0]
  ];
  
  const pts: number[][] = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const p0 = corners[i];
    const p3 = corners[i + 1];
    const dx = (p3[0] - p0[0]) / 3;
    const dy = (p3[1] - p0[1]) / 3;
    const dz = (p3[2] - p0[2]) / 3;
    
    if (i === 0) pts.push([...p0]);
    pts.push([p0[0] + dx, p0[1] + dy, p0[2] + dz]);
    pts.push([p0[0] + 2*dx, p0[1] + 2*dy, p0[2] + 2*dz]);
    pts.push([...p3]);
  }
  
  mob.setPoints3D(pts);
  mob.strokeWidth = 3;
  mob.fillOpacity = 0;
  mob.strokeOpacity = 0.5; // Faint outline
  mob.color = '#ff6b6b'; // Red
  return mob;
}

// Create source (circle) and target (square)
const source = createCircle();
const target = createSquare();

// Position them at different locations for proper 3D test
source.position = [-2, 0, 2];   // Circle on left, closer to camera
source.rotation = [0.3, 0.5, 0.2];  // Tilted in 3D

target.position = [2, 0, -2];   // Square on right, farther from camera  
target.rotation = [-0.2, -0.4, 0.3];  // Different tilt

// Add axes for reference
const axes = new ThreeDAxes({
  xRange: [-5, 5, 1],
  yRange: [-3, 3, 1],
  zRange: [-5, 5, 1],
});

// Create labels for axes
const labelX = new MathTex({ latex: 'X', color: '#E65A4C', fontSize: 0.4, position: [5.3, 0, 0] });
const labelY = new MathTex({ latex: 'Y', color: '#4ECCA3', fontSize: 0.4, position: [0, 3.3, 0] });
const labelZ = new MathTex({ latex: 'Z', color: '#4C9EE6', fontSize: 0.4, position: [0, 0, 5.3] });

// Add to scene
scene.add(axes, source, target);

// Add labels after they render
Promise.all([
  labelX.waitForRender(),
  labelY.waitForRender(),
  labelZ.waitForRender()
]).then(() => {
  scene.add(labelX, labelY, labelZ);
}).catch(err => console.error('Error loading axis labels:', err));

// Build animation timeline
const buildTimeline = () => {
  scene.scheduler.reset();

  scene
    // Fade in circle
    .at(0).play(fadeIn(source, 0.5))
    
    // Morph circle → square (1-3s)
    .at(1).play(new MorphTrack(source, target, 2));

  console.log('[Phase7-Morph] Timeline built:', scene.scheduler.totalDuration.toFixed(2) + 's');
};

// Initialize
buildTimeline();
scene.seek(0);
console.log('Phase 7 Morph demo loaded.');
