import * as THREE from 'three';
import { RenderNode } from './RenderNode';
import { BezierSDFRenderer } from './stroke/BezierSDFRenderer';
import { Line2Renderer } from './stroke/Line2Renderer';
import { MeshLineRenderer } from './stroke/MeshLineRenderer';
import { FillRenderer } from './fill/FillRenderer';
import type { StrokeRenderer } from './stroke/StrokeRenderer';
import type { Mobject } from '../core/Mobject';
import type { VMobject } from '../core/VMobject';

export type StrokeRendererType = 'bezier-sdf' | 'line2' | 'meshline';

export class VMobjectRenderNode extends RenderNode {
  readonly mobjectId: string;
  readonly threeObject: THREE.Group;
  private stroke: StrokeRenderer;
  private fill: FillRenderer;

  constructor(
    mob: VMobject,
    resolution: [number, number] = [800, 450],
    pixelRatio = 1,
    rendererType: StrokeRendererType = 'line2',
  ) {
    super();
    this.mobjectId = mob.id;
    this.threeObject = new THREE.Group();

    this.fill = new FillRenderer();
    // Pick stroke renderer at construction time — never changes
    if (rendererType === 'line2') {
      this.stroke = new Line2Renderer(resolution, pixelRatio);
    } else if (rendererType === 'meshline') {
      this.stroke = new MeshLineRenderer(resolution, pixelRatio);
    } else {
      this.stroke = new BezierSDFRenderer(resolution, pixelRatio);
    }

    this.threeObject.add(this.fill.group);
    this.threeObject.add(this.stroke.mesh);
  }

  sync(mobject: Mobject): void {
    const mob = mobject as VMobject;
    this.fill.update(mob);
    this.stroke.update(mob);

    // Sync transform
    this.threeObject.position.set(...mob.position);
    this.threeObject.rotation.set(...mob.rotation);
    this.threeObject.scale.set(...mob.scale);
    this.threeObject.visible = mob.visible;
  }

  setHoverHighlight(active: boolean): void {
    this.stroke.setHoverHighlight(active);
  }

  dispose(): void {
    this.fill.dispose();
    this.stroke.dispose();
    this.threeObject.clear();
  }
}
