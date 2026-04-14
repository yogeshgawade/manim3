import { Group }    from './Group';
import { VMobject } from './VMobject';
import type { Vec3 } from './types';

export class VGroup extends Group {
  constructor(...mobjects: VMobject[]) {
    super(...mobjects);
  }

  get(index: number): VMobject {
    return this.children[index] as VMobject;
  }

  map<T>(fn: (mob: VMobject, i: number) => T): T[] {
    return (this.children as VMobject[]).map(fn);
  }

  filter(fn: (mob: VMobject, i: number) => boolean): VGroup {
    const kept = (this.children as VMobject[]).filter(fn);
    return new VGroup(...kept);
  }

  forEach(fn: (mob: VMobject, i: number) => void): this {
    (this.children as VMobject[]).forEach(fn);
    return this;
  }

  [Symbol.iterator]() {
    return this.children[Symbol.iterator]();
  }

  setColor(color: string): this {
    for (const child of this.children as VMobject[]) child.color = color;
    this.markDirty();
    return this;
  }

  setOpacity(opacity: number): this {
    for (const child of this.children as VMobject[]) child.opacity = opacity;
    this.markDirty();
    return this;
  }

  arrange(
    direction: Vec3 = [1, 0, 0],
    buff = 0.25,
  ): this {
    let offset = 0;
    for (const child of this.children) {
      child.position = [
        direction[0] * offset,
        direction[1] * offset,
        direction[2] * offset,
      ];
      offset += buff;
    }
    this.markDirty();
    return this;
  }
}
