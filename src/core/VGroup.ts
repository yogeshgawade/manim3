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
    for (let i = 1; i < this.children.length; i++) {
      this.children[i].nextTo(this.children[i - 1], direction, buff);
    }
    this.markDirty();
    return this;
  }

  arrangeInGrid(
    rows?: number,
    cols?: number,
    buff: number | [number, number] = 0.25,
  ): this {
    const count = this.children.length;
    if (count === 0) return this;

    let resolvedRows = rows;
    let resolvedCols = cols;

    if (resolvedRows == null && resolvedCols == null) {
      resolvedCols = Math.ceil(Math.sqrt(count));
      resolvedRows = Math.ceil(count / resolvedCols);
    } else if (resolvedRows == null) {
      resolvedRows = Math.ceil(count / resolvedCols!);
    } else if (resolvedCols == null) {
      resolvedCols = Math.ceil(count / resolvedRows);
    }

    const [rowBuff, colBuff] = Array.isArray(buff) ? buff : [buff, buff];

    const rowGroups: VGroup[] = [];
    for (let row = 0; row < resolvedRows; row++) {
      const start = row * resolvedCols;
      const end = Math.min(start + resolvedCols, count);
      if (start >= end) break;

      const rowGroup = new VGroup(...(this.children.slice(start, end) as VMobject[]));
      rowGroup.arrange([1, 0, 0], colBuff);
      rowGroups.push(rowGroup);
    }

    for (let row = 0; row < rowGroups.length; row++) {
      const rowGroup = rowGroups[row];
      const rowCenter = rowGroup.getCenter();
      const targetY = ((rowGroups.length - 1) / 2 - row) * rowBuff;

      for (const child of rowGroup.children) {
        child.shift([-rowCenter[0], targetY - rowCenter[1], 0]);
      }
    }

    this.markDirty();
    return this;
  }
}
