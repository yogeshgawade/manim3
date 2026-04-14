// Phase 8 Billboard Demo - 3D label that always faces camera
import type { Scene } from '../../src/scene/Scene';
import { ThreeDScene } from '../../src/scene/ThreeDScene';
import { Surface3D } from '../../src/mobjects/three/Surface3D';
import { FadeTrack } from '../../src/animation/FadeTrack';
import { BillboardGroup } from '../../src/mobjects/three/BillboardGroup';
import { Circle } from '../../src/mobjects/geometry/Circle';
import { Square } from '../../src/mobjects/geometry/Rectangle';
import { CreateTrack as Create } from '../../src/animation/CreateTrack';
import { BaseAnimationTrack } from '../../src/animation/AnimationTrack';
import type { Mobject } from '../../src/core/Mobject';

declare global {
  interface Window {
    testScene: Scene;
  }
}

const scene = window.testScene as ThreeDScene;

// Create a 3D surface (trefoil knot) to show we're in 3D
const knot = new Surface3D({
  uvFunction: (u, v) => {
    const phi = u * Math.PI * 2;
    const theta = v * Math.PI * 2;
    // Trefoil knot tube - scaled down
    const R = 1; // major radius (was 2)
    const r = 0.3; // tube radius (was 0.6)
    // Trefoil curve parametric equation
    const x0 = Math.sin(phi) + 2 * Math.sin(2 * phi);
    const y0 = Math.cos(phi) - 2 * Math.cos(2 * phi);
    const z0 = -Math.sin(3 * phi);
    // Normalize and create tube
    const norm = Math.sqrt(x0*x0 + y0*y0 + z0*z0);
    const nx = x0 / norm;
    const ny = y0 / norm;
    const nz = z0 / norm;
    // Perpendicular direction for tube
    const bx = Math.cos(theta) * (ny * 0 - nz * 1) + Math.sin(theta) * nx;
    const by = Math.cos(theta) * (nz * 1 - nx * 0) + Math.sin(theta) * ny;
    const bz = Math.cos(theta) * (nx * 0 - ny * 0) + Math.sin(theta) * nz;
    return [
      x0 * R + bx * r,
      y0 * R + by * r,
      z0 * R + bz * r
    ];
  },
  uResolution: 128,
  vResolution: 32,
  color: '#4ECCA3',
  opacity: 0.3,
  doubleSided: true
});
knot.position = [0, 0, 0];

// Add 3D objects to scene
scene.add(knot);

// Create a billboard label (always faces camera, but stays at 3D position)
const billboard = new BillboardGroup({
  position: [5, 2, 0], // Further from sphere center
  lockUpDirection: true
});

// Add visual elements to the billboard
const circle = new Circle(0.8);
circle.color = '#e94560';
circle.fillColor = '#e94560';
circle.fillOpacity = 0.3;
circle.strokeWidth = 3;
circle.opacity = 0;
(circle as any).strokeRendererType = 'line2';



billboard.add(circle);

// Animation sequence using timeline builder pattern
async function runAnimation() {
  scene.scheduler.reset();
  
  // Reset billboard and camera to initial state
  billboard.rotation = [0, 0, 0];
  //scene.setCamera([12, 4, 0], [0, 0, 0]);

// Camera orbit track - properly extends BaseAnimationTrack
class CameraOrbitTrack extends BaseAnimationTrack {
  constructor(
    private scene: ThreeDScene,
    duration: number = 6
  ) {
    super({} as Mobject, duration, (t) => t);
  }

  prepare(): void {
    // Reset to initial camera position
    this.scene.setCamera([12, 4, 0], [0, 0, 0]);
  }

  interpolate(alpha: number): void {
    console.log('CameraOrbitTrack interpolate', alpha);
    // Calculate angle from alpha so scrubbing works correctly
    const orbitAngle = alpha * Math.PI; // 2 full rotations over duration
    const radius = 12;
    const x = Math.cos(orbitAngle) * radius;
    const z = Math.sin(orbitAngle) * radius;
    console.log('Setting camera to', x, 4, z);
    this.scene.setCamera([x, 4, z], [0, 0, 0]);
  }
}

  // Set up animation tracks FIRST (prepare() will hide shapes initially)
  scene
    // Fade in knot at t=0
    .at(0).play(new FadeTrack(knot, 0, 1, 1))
    // Create billboard circle at t=0.5
    .at(0.5).play(new FadeTrack(circle, 0, 1, 3))
    // Start camera orbit at t=7
    .at(3).play(new CameraOrbitTrack(scene, 6));

  // Add children to billboard FIRST, then add billboard to scene
  
  scene.add(billboard);

  scene.seek(0);
  console.log('Billboard demo loaded!');
}

runAnimation().catch(console.error);
