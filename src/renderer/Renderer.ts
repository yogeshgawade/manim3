import * as THREE from 'three';

import { RenderNode }         from './RenderNode';

import { VMobjectRenderNode } from './VMobjectRenderNode';

import { GroupRenderNode }    from './GroupRenderNode';

import { Surface3DRenderNode } from './Surface3DRenderNode';

import { Arrow3DRenderNode } from './Arrow3DRenderNode';

import { Line3DRenderNode } from './Line3DRenderNode';

import { VMobject }           from '../core/VMobject';

import { Group }              from '../core/Group';

import { Surface3D }          from '../mobjects/three/Surface3D';

import { Arrow3D }          from '../mobjects/three/Arrow3D';

import { Line3D }          from '../mobjects/three/Line3D';

import { BillboardRenderNode } from './BillboardRenderNode';

import { BillboardGroup } from '../mobjects/three/BillboardGroup';

import { Mesh3DRenderNode } from './Mesh3DRenderNode';

import { Cube, Box3D } from '../mobjects/three/Cube';

import { Sphere } from '../mobjects/three/Sphere';

import { Cylinder, Cone } from '../mobjects/three/Cylinder';

import { Torus } from '../mobjects/three/Torus';

import { Polyhedron, Prism } from '../mobjects/three/Polyhedra';

import { Dot3D } from '../mobjects/three/Dot3D';

import { TexturedSurfaceRenderNode } from './TexturedSurfaceRenderNode';

import { TexturedSurface } from '../mobjects/three/TexturedSurface';

import { ImageRenderNode } from './ImageRenderNode';

import { ImageObject } from '../mobjects/image/ImageObject';

import { TextRenderNode } from './TextRenderNode';

import { Text } from '../mobjects/text/Text';

import type { Mobject } from '../core/Mobject';



export interface RendererOptions {

  width?:      number;

  height?:     number;

  pixelRatio?: number;

  antialias?:  boolean;

  preserveDrawingBuffer?: boolean;

}



export class Renderer {

  protected threeScene    = new THREE.Scene();

  protected threeRenderer: THREE.WebGLRenderer;

  protected camera:        THREE.OrthographicCamera;

  protected renderNodeMap = new Map<string, RenderNode>();

  protected resolution:   [number, number];

  protected pixelRatio:   number;

  /** Optional hook called before each render pass - for custom render targets */
  preRenderHook: ((renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.OrthographicCamera) => void) | null = null;



  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {

    const {

      width      = 800,

      height     = 450,

      pixelRatio = 1,

      antialias  = true,

      preserveDrawingBuffer = false,

    } = options;



    this.resolution = [width, height];

    this.pixelRatio = pixelRatio;



    this.threeRenderer = new THREE.WebGLRenderer({ 

      canvas, 

      antialias, 

      alpha: true,

      preserveDrawingBuffer,

      stencil: true,

    });

    this.threeRenderer.setSize(width, height);

    this.threeRenderer.setPixelRatio(pixelRatio);

    // Enable clipping planes for sweep animations
    this.threeRenderer.localClippingEnabled = true;

    // Orthographic camera matching Manim coordinate space

    const aspect = width / height;

    const frustum = 4;

    this.camera = new THREE.OrthographicCamera(

      -frustum * aspect, frustum * aspect,

       frustum,         -frustum,

       0.1,              100,

    );

    this.camera.position.set(0, 0, 10);

    this.camera.lookAt(0, 0, 0);

  }



  // ── Public API ────────────────────────────────────────────────────────



  /** Reconcile logical mobject list → RenderNode map */

  reconcile(mobjects: Mobject[]): void {

    const allFamily = new Set(mobjects.flatMap(m => m.getFamily().map(f => f.id)));



    // Remove stale nodes (not in current mobject list or their families)

    for (const [id, node] of this.renderNodeMap) {

      if (!allFamily.has(id)) {

        this.threeScene.remove(node.threeObject);

        node.dispose();

        this.renderNodeMap.delete(id);

      }

    }



    // Create nodes for all mobjects in the family (including children)

    const allMobjects = mobjects.flatMap(m => m.getFamily());

    for (const mob of allMobjects) {

      if (!this.renderNodeMap.has(mob.id)) {

        const node = this._createNode(mob);

        this.renderNodeMap.set(mob.id, node);

      }

    }



    // Build parent-child hierarchy in Three.js scene

    for (const mob of allMobjects) {

      const node = this.renderNodeMap.get(mob.id)!;

      const parent = (mob as any).parent;

      

      if (parent && this.renderNodeMap.has(parent.id)) {

        // Add to parent's threeObject

        const parentNode = this.renderNodeMap.get(parent.id)!;

        parentNode.threeObject.add(node.threeObject);

      } else {

        // Add to root scene

        this.threeScene.add(node.threeObject);

      }

    }

  }



  /** Sync only dirty mobjects → their RenderNodes */

  syncDirty(mobjects: Mobject[]): void {

    for (const mob of mobjects) {

      if (mob.dirty) {

        const node = this.renderNodeMap.get(mob.id);

        if (node) {

          node.sync(mob);

          mob.dirty = false;

        }

      }

    }

  }



  /** Render one frame */

  render(): void {

    // Call pre-render hook for custom render targets (e.g., ZoomedScene)
    if (this.preRenderHook) {
      this.preRenderHook(this.threeRenderer, this.threeScene, this.camera);
    }

    this.threeRenderer.render(this.threeScene, this.camera);

  }



  getRenderNode(id: string): RenderNode | undefined {

    return this.renderNodeMap.get(id);

  }



  resize(width: number, height: number, pixelRatio = this.pixelRatio): void {

    this.resolution = [width, height];

    this.pixelRatio = pixelRatio;

    this.threeRenderer.setSize(width, height);

    this.threeRenderer.setPixelRatio(pixelRatio);

    const aspect  = width / height;

    const frustum = 4;

    this.camera.left   = -frustum * aspect;

    this.camera.right  =  frustum * aspect;

    this.camera.top    =  frustum;

    this.camera.bottom = -frustum;

    this.camera.updateProjectionMatrix();

  }



  dispose(): void {

    for (const node of this.renderNodeMap.values()) node.dispose();

    this.renderNodeMap.clear();

    this.threeRenderer.dispose();

  }



  /** Set background color */

  setBackground(color: string): void {

    this.threeRenderer.setClearColor(color);

  }



  // ── Private ───────────────────────────────────────────────────────────



  private _createNode(mob: Mobject): RenderNode {

    if (mob instanceof BillboardGroup) {

      return new BillboardRenderNode(mob, this.camera);

    }

    // Mesh-based 3D primitives
    if (mob instanceof Cube ||
        mob instanceof Box3D ||
        mob instanceof Sphere ||
        mob instanceof Cylinder ||
        mob instanceof Cone ||
        mob instanceof Torus ||
        mob instanceof Polyhedron ||
        mob instanceof Prism ||
        mob instanceof Dot3D) {
      return new Mesh3DRenderNode(mob);
    }

    if (mob instanceof TexturedSurface) {
      return new TexturedSurfaceRenderNode(mob);
    }

    if (mob instanceof ImageObject) {
      return new ImageRenderNode(mob);
    }

    if (mob instanceof Text) {
      return new TextRenderNode(mob);
    }

    if (mob instanceof Surface3D) {

      return new Surface3DRenderNode(mob);

    }

    if (mob instanceof Arrow3D) {

      return new Arrow3DRenderNode(mob);

    }

    if (mob instanceof Line3D) {

      return new Line3DRenderNode(mob);

    }

    if (mob instanceof VMobject) {

      const rendererType = (mob as any).strokeRendererType ?? 'line2';
      return new VMobjectRenderNode(mob, this.resolution, this.pixelRatio, rendererType);

    }

    if (mob instanceof Group) {

      return new GroupRenderNode(mob);

    }

    // Default fallback — plain Group node for base Mobjects

    return new GroupRenderNode(mob);

  }

}

