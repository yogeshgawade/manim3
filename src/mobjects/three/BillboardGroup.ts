import { VGroup } from '../../core/VGroup';
import type { Vec3 } from '../../core/types';
import * as THREE from 'three';

/**
 * BillboardGroup — A container for VMobjects that always faces the camera.
 * 
 * Useful for:
 * - Labels with complex graphics (not just text)
 * - UI panels in 3D space
 * - Signs that should always be readable
 * 
 * Children are regular VMobjects with full animation support.
 * The group itself is billboarded (always faces camera).
 * 
 * @example
 * ```typescript
 * const board = new BillboardGroup({
 *   position: [2, 1, 0],
 *   scale: [1, 1, 1]
 * });
 * 
 * // Add animated VMobjects
 * const circle = new Circle({ radius: 0.5, color: '#ff6b6b' });
 * const square = new Square({ sideLength: 1, color: '#4ecdc4' });
 * board.add(circle, square);
 * 
 * // Animate children normally
 * await scene.play(new Create(circle));
 * await scene.play(Transform(circle, square));
 * 
 * // The board always faces camera even when you orbit
 * ```
 */
export interface BillboardGroupOptions {
  /** Position in 3D space. Default: [0, 0, 0] */
  position?: Vec3;
  /** Scale of the board. Default: [1, 1, 1] */
  scale?: Vec3;
  /** Background color (if any). Default: transparent */
  backgroundColor?: string;
  /** Whether to lock the up direction (true) or free rotate (false). Default: true */
  lockUpDirection?: boolean;
}

export class BillboardGroup extends VGroup {
  /** Reference to camera position - set by scene/renderer */
  cameraPosition: Vec3 = [0, 0, 10];
  /** Lock up direction for billboard (prevents rolling) */
  lockUpDirection: boolean = true;
  
  constructor(options: BillboardGroupOptions = {}) {
    super();
    
    if (options.position) {
      this.position = [...options.position];
    }
    if (options.scale) {
      this.scale = [...options.scale];
    }
    this.lockUpDirection = options.lockUpDirection ?? true;
  }

  /**
   * Update billboard rotation to face camera.
   * Called automatically by BillboardRenderNode each frame.
   */
  updateBillboardRotation(): void {
    if (!this.cameraPosition) return;
    
    // Calculate rotation to face camera
    const target = new THREE.Vector3(
      this.cameraPosition[0],
      this.cameraPosition[1],
      this.cameraPosition[2]
    );
    const position = new THREE.Vector3(
      this.position[0],
      this.position[1],
      this.position[2]
    );
    
    const up = this.lockUpDirection 
      ? new THREE.Vector3(0, 1, 0) 
      : new THREE.Vector3(0, 0, 1);
    
    // Look at camera from position (this orients front face toward camera)
    const matrix = new THREE.Matrix4();
    matrix.lookAt(target, position, up);
    
    // Extract Euler rotation
    const euler = new THREE.Euler();
    euler.setFromRotationMatrix(matrix);
    
    this.rotation = [euler.x, euler.y, euler.z];
    this.markDirty();
  }

  /**
   * Set the camera position reference.
   * Called by ThreeDScene when the billboard is added.
   */
  setCameraPosition(pos: Vec3): void {
    this.cameraPosition = [...pos];
  }
}
