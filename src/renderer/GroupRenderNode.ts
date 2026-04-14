import * as THREE from 'three';
import { RenderNode } from './RenderNode';
import type { Mobject } from '../core/Mobject';

export class GroupRenderNode extends RenderNode {
  readonly mobjectId: string;
  readonly threeObject: THREE.Group;

  constructor(mob: Mobject) {
    super();
    this.mobjectId   = mob.id;
    this.threeObject = new THREE.Group();
  }

  sync(mobject: Mobject): void {
    this.threeObject.position.set(...mobject.position);
    this.threeObject.rotation.set(...mobject.rotation);
    this.threeObject.scale.set(...mobject.scale);
    this.threeObject.visible = mobject.visible;
  }

  setHoverHighlight(_active: boolean): void {
    // Groups don't highlight — their children do
  }

  dispose(): void {
    this.threeObject.clear();
  }
}
