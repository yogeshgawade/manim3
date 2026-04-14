/**
 * LogicalScene — Pure data container for the mobject tree.
 * No Three.js imports. Managed by Scene.
 */

import type { Mobject } from '../core/Mobject';

export class LogicalScene {
  private _mobjects: Mobject[] = [];
  private _foregroundMobjects: Mobject[] = [];

  // ── Hierarchy Management ────────────────────────────────────────────────

  add(...mobjects: Mobject[]): this {
    for (const mob of mobjects) {
      if (!this._mobjects.includes(mob)) {
        this._mobjects.push(mob);
      }
    }
    return this;
  }

  remove(...mobjects: Mobject[]): this {
    this._mobjects = this._mobjects.filter(m => !mobjects.includes(m));
    this._foregroundMobjects = this._foregroundMobjects.filter(m => !mobjects.includes(m));
    return this;
  }

  clear(): this {
    this._mobjects = [];
    this._foregroundMobjects = [];
    return this;
  }

  has(mobject: Mobject): boolean {
    return this._mobjects.includes(mobject) || this._foregroundMobjects.includes(mobject);
  }

  getMobjects(): readonly Mobject[] {
    return this._mobjects;
  }

  // ── Foreground Mobjects ──────────────────────────────────────────────────

  addForeground(...mobjects: Mobject[]): this {
    for (const mob of mobjects) {
      if (!this._foregroundMobjects.includes(mob)) {
        this._foregroundMobjects.push(mob);
      }
    }
    return this;
  }

  removeForeground(...mobjects: Mobject[]): this {
    this._foregroundMobjects = this._foregroundMobjects.filter(m => !mobjects.includes(m));
    return this;
  }

  getForegroundMobjects(): readonly Mobject[] {
    return this._foregroundMobjects;
  }

  // ── Flattened Tree Access ──────────────────────────────────────────────

  /** Get all mobjects including descendants (for Renderer reconciliation) */
  getAllMobjects(): Mobject[] {
    const result: Mobject[] = [];
    for (const mob of this._mobjects) {
      result.push(...mob.getFamily());
    }
    // Foreground mobjects are rendered last (on top)
    for (const mob of this._foregroundMobjects) {
      result.push(...mob.getFamily());
    }
    return result;
  }

  /** Count of root-level mobjects only */
  get count(): number {
    return this._mobjects.length + this._foregroundMobjects.length;
  }
}
