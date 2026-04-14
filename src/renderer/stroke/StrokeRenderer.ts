import type * as THREE from 'three';
import type { VMobject } from '../../core/VMobject';

export interface StrokeRenderer {
  /** The THREE.Object3D to add to the scene */
  readonly mesh: THREE.Object3D;
  /** Update geometry/material from current VMobject state */
  update(mob: VMobject): void;
  /** Set hover highlight without touching mob.color */
  setHoverHighlight(active: boolean): void;
  /** Free GPU resources */
  dispose(): void;
}
