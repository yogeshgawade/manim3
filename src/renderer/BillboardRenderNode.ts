import * as THREE from 'three';
import { RenderNode } from './RenderNode';
import { BillboardGroup } from '../../mobjects/three/BillboardGroup';

/**
 * BillboardRenderNode — Renders BillboardGroup with automatic camera-facing.
 * 
 * Each frame, updates the group's rotation to face the camera.
 * Children are rendered as part of this billboard's transform group.
 */
export class BillboardRenderNode implements RenderNode {
  readonly mobjectId: string;
  readonly threeObject: THREE.Group;
  private camera: THREE.Camera;

  constructor(
    mobject: BillboardGroup,
    camera: THREE.Camera
  ) {
    this.mobjectId = mobject.id;
    this.camera = camera;
    
    // Create a group to hold the billboard transform
    this.threeObject = new THREE.Group();
  }

  sync(mobject: BillboardGroup): void {
    // Update camera position reference
    const camPos = this.camera.position;
    mobject.setCameraPosition([camPos.x, camPos.y, camPos.z]);
    
    // Update billboard rotation
    mobject.updateBillboardRotation();
    
    // Apply transform to the THREE.Group
    this.threeObject.position.set(...mobject.position);
    this.threeObject.rotation.set(...mobject.rotation);
    this.threeObject.scale.set(...mobject.scale);
  }

  setHoverHighlight(active: boolean): void {
    // Billboard groups don't highlight
  }

  dispose(): void {
    this.threeObject.clear();
  }
}
