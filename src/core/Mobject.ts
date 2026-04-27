// NO import from 'three' — ever.
import type { Vec3, Color, MobjectState, UpdaterFn, InteractionHandlers } from './types';
import type { Scene } from '../scene/Scene';

let _idCounter = 0;
const genId = () => `mob_${++_idCounter}`;
const DEFAULT_FRAME_WIDTH = 14;
const DEFAULT_FRAME_HEIGHT = 8;
const DEFAULT_EDGE_BUFF = 0.5;

export class Mobject {
  id:            string           = genId();
  position:      Vec3             = [0, 0, 0];
  rotation:      Vec3             = [0, 0, 0];
  scale:         Vec3             = [1, 1, 1];
  color:         Color            = '#ffffff';
  opacity:       number           = 0;
  strokeWidth:   number           = 4;
  fillColor:     Color            = '#ffffff';
  fillOpacity:   number           = 0.8;
  strokeOpacity: number           = 1;
  visible:       boolean          = true;
  dirty:         boolean          = true;
  interactive:   boolean          = false;
  children:      Mobject[]        = [];
  handlers:      InteractionHandlers = {};
  scene?:        Scene;            // Set when added directly to scene

  // Target copy for animations (set by generateTarget)
  targetCopy!: Mobject;

  private updaters: UpdaterFn[] = [];

  // ── Hierarchy ──────────────────────────────────────────────
  add(...mobjects: Mobject[]): this {
    for (const m of mobjects) {
      if (!this.children.includes(m)) {
        this.children.push(m);
        (m as any).parent = this;
      }
    }
    this.markDirty();
    return this;
  }

  remove(...mobjects: Mobject[]): this {
    this.children = this.children.filter(c => !mobjects.includes(c));
    this.markDirty();
    return this;
  }

  getFamily(): Mobject[] {
    const result: Mobject[] = [this];
    for (const child of this.children) result.push(...child.getFamily());
    return result;
  }

  protected _getAbsolutePosition(parentOffset: Vec3 = [0, 0, 0]): Vec3 {
    return [
      parentOffset[0] + this.position[0],
      parentOffset[1] + this.position[1],
      parentOffset[2] + this.position[2],
    ];
  }

  protected _getOwnBoundaryPoints(_parentOffset: Vec3 = [0, 0, 0]): Vec3[] {
    return [];
  }

  protected _getBoundaryPoints(parentOffset: Vec3 = [0, 0, 0]): Vec3[] {
    const absolutePosition = this._getAbsolutePosition(parentOffset);
    const ownPoints = this._getOwnBoundaryPoints(parentOffset);
    const childPoints = this.children.flatMap((child) => child._getBoundaryPoints(absolutePosition));

    if (ownPoints.length > 0 || childPoints.length > 0) {
      return [...ownPoints, ...childPoints];
    }

    return [absolutePosition];
  }

  // ── Transform ─────────────────────────────────────────────
  shift(delta: Vec3): this {
    this.position = [
      this.position[0] + delta[0],
      this.position[1] + delta[1],
      this.position[2] + delta[2],
    ];
    this.markDirty();
    return this;
  }

  moveTo(target: Vec3 | Mobject): this {
    const point = target instanceof Mobject ? target.getCenter() : target;
    const center = this.getCenter();
    return this.shift([
      point[0] - center[0],
      point[1] - center[1],
      point[2] - center[2],
    ]);
  }

  getCriticalPoint(direction: Vec3): Vec3 {
    const boundaryPoints = this._getBoundaryPoints();
    const [dx, dy, dz] = direction;

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const [x, y, z] of boundaryPoints) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (z > maxZ) maxZ = z;
    }

    return [
      dx > 0 ? maxX : (dx < 0 ? minX : (minX + maxX) / 2),
      dy > 0 ? maxY : (dy < 0 ? minY : (minY + maxY) / 2),
      dz > 0 ? maxZ : (dz < 0 ? minZ : (minZ + maxZ) / 2),
    ];
  }

  getEdgeCenter(direction: Vec3): Vec3 {
    return this.getCriticalPoint(direction);
  }

  getCorner(direction: Vec3): Vec3 {
    return this.getCriticalPoint(direction);
  }

  getCenter(): Vec3 {
    return this.getCriticalPoint([0, 0, 0]);
  }

  alignTo(target: Vec3 | Mobject, direction: Vec3 = [0, 0, 0]): this {
    const point = target instanceof Mobject ? target.getCriticalPoint(direction) : target;
    const current = this.getCriticalPoint(direction);
    const delta: Vec3 = [0, 0, 0];

    if (direction[0] !== 0) delta[0] = point[0] - current[0];
    if (direction[1] !== 0) delta[1] = point[1] - current[1];
    if (direction[2] !== 0) delta[2] = point[2] - current[2];

    return this.shift(delta);
  }

  nextTo(
    target: Vec3 | Mobject,
    direction: Vec3 = [1, 0, 0],
    buff = 0.25,
    alignedEdge: Vec3 = [0, 0, 0],
  ): this {
    const point = target instanceof Mobject ? target.getCriticalPoint(direction) : target;
    const oppositeDirection: Vec3 = [-direction[0], -direction[1], -direction[2]];
    const current = this.getCriticalPoint(oppositeDirection);

    this.shift([
      point[0] + direction[0] * buff - current[0],
      point[1] + direction[1] * buff - current[1],
      point[2] + direction[2] * buff - current[2],
    ]);

    if (alignedEdge[0] !== 0 || alignedEdge[1] !== 0 || alignedEdge[2] !== 0) {
      this.alignTo(target, alignedEdge);
    }

    return this;
  }

  // ── Dirty flag ────────────────────────────────────────────
  center(): this {
    return this.moveTo([0, 0, this.getCenter()[2]]);
  }

  toEdge(edge: Vec3 = [-1, 0, 0], buff = DEFAULT_EDGE_BUFF): this {
    const frameTarget: Vec3 = [
      edge[0] === 0 ? this.getCenter()[0] : edge[0] * (DEFAULT_FRAME_WIDTH / 2),
      edge[1] === 0 ? this.getCenter()[1] : edge[1] * (DEFAULT_FRAME_HEIGHT / 2),
      edge[2] === 0 ? this.getCenter()[2] : edge[2],
    ];
    const current = this.getCriticalPoint(edge);

    return this.shift([
      edge[0] === 0 ? 0 : frameTarget[0] - current[0] - edge[0] * buff,
      edge[1] === 0 ? 0 : frameTarget[1] - current[1] - edge[1] * buff,
      edge[2] === 0 ? 0 : frameTarget[2] - current[2] - edge[2] * buff,
    ]);
  }

  toCorner(corner: Vec3 = [-1, -1, 0], buff = DEFAULT_EDGE_BUFF): this {
    return this.toEdge(corner, buff);
  }

  getCoord(dim: number, direction: Vec3 = [0, 0, 0]): number {
    return this.getCriticalPoint(direction)[dim];
  }

  setCoord(value: number, dim: number, direction: Vec3 = [0, 0, 0]): this {
    const delta: Vec3 = [0, 0, 0];
    delta[dim] = value - this.getCoord(dim, direction);
    return this.shift(delta);
  }

  setX(x: number, direction: Vec3 = [0, 0, 0]): this {
    return this.setCoord(x, 0, direction);
  }

  setY(y: number, direction: Vec3 = [0, 0, 0]): this {
    return this.setCoord(y, 1, direction);
  }

  setZ(z: number, direction: Vec3 = [0, 0, 0]): this {
    return this.setCoord(z, 2, direction);
  }

  matchCoord(target: Mobject, dim: number, direction: Vec3 = [0, 0, 0]): this {
    return this.setCoord(target.getCoord(dim, direction), dim, direction);
  }

  matchX(target: Mobject, direction: Vec3 = [0, 0, 0]): this {
    return this.matchCoord(target, 0, direction);
  }

  matchY(target: Mobject, direction: Vec3 = [0, 0, 0]): this {
    return this.matchCoord(target, 1, direction);
  }

  matchZ(target: Mobject, direction: Vec3 = [0, 0, 0]): this {
    return this.matchCoord(target, 2, direction);
  }

  markDirty(): void {
    this.dirty = true;
  }

  // ── Updaters ─────────────────────────────────────────────
  addUpdater(fn: UpdaterFn): this {
    this.updaters.push(fn);
    return this;
  }

  removeUpdater(fn: UpdaterFn): this {
    this.updaters = this.updaters.filter(u => u !== fn);
    return this;
  }

  update(dt: number): void {
    for (const fn of this.updaters) fn(this, dt);
    for (const child of this.children) child.update(dt);
  }

  // ── Interaction ───────────────────────────────────────────
  on(event: string, handler: Function): this {
    if (event === 'click')    this.handlers.onClick    = handler as any;
    if (event === 'hover')    this.handlers.onHover    = handler as any;
    if (event === 'hoverOut') this.handlers.onHoverOut = handler as any;
    if (event === 'drag')     this.handlers.onDrag     = handler as any;
    if (event === 'dragEnd')  this.handlers.onDragEnd  = handler as any;
    return this;
  }

  off(event: string): this {
    if (event === 'click')    delete this.handlers.onClick;
    if (event === 'hover')    delete this.handlers.onHover;
    if (event === 'hoverOut') delete this.handlers.onHoverOut;
    if (event === 'drag')     delete this.handlers.onDrag;
    if (event === 'dragEnd')  delete this.handlers.onDragEnd;
    return this;
  }

  // ── State snapshot (deep clone — mutating result never affects mobject) ──
  captureState(): MobjectState {
    return JSON.parse(JSON.stringify({
      id:            this.id,
      position:      this.position,
      rotation:      this.rotation,
      scale:         this.scale,
      color:         this.color,
      opacity:       this.opacity,
      strokeWidth:   this.strokeWidth,
      fillColor:     this.fillColor,
      fillOpacity:   this.fillOpacity,
      strokeOpacity: this.strokeOpacity,
      points3D:      [],
      visible:       this.visible,
      children:      this.children.map(c => c.captureState()),
      extra:         {},
    }));
  }

  restoreState(state: MobjectState): this {
    this.position      = [...state.position]      as Vec3;
    this.rotation      = [...state.rotation]      as Vec3;
    this.scale         = [...state.scale]         as Vec3;
    this.color         = state.color;
    this.opacity       = state.opacity;
    this.strokeWidth   = state.strokeWidth;
    this.fillColor     = state.fillColor;
    this.fillOpacity   = state.fillOpacity;
    this.strokeOpacity = state.strokeOpacity;
    this.visible       = state.visible;
    this.markDirty();
    return this;
  }

  copy(): this {
    const clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.id       = genId();
    clone.children = this.children.map(c => c.copy());
    return clone;
  }

  dispose(): void {
    this.updaters = [];
    this.handlers = {};
    this.children = [];
  }
}
