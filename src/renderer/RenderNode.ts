import type * as THREE from 'three';
import type { Mobject } from '../core/Mobject';

export abstract class RenderNode {
  abstract readonly mobjectId: string;
  abstract readonly threeObject: THREE.Object3D;

  abstract sync(mobject: Mobject): void;
  abstract dispose(): void;
  abstract setHoverHighlight(active: boolean): void;
}
