// NO import from 'three' — ever.
import type { Vec3, Color, MobjectState, UpdaterFn, InteractionHandlers } from './types';
import type { Scene } from '../scene/Scene';

let _idCounter = 0;
const genId = () => `mob_${++_idCounter}`;

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

  moveTo(target: Vec3): this {
    this.position = [...target];
    this.markDirty();
    return this;
  }

  getCenter(): Vec3 {
    return [...this.position] as Vec3;
  }

  // ── Dirty flag ────────────────────────────────────────────
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
