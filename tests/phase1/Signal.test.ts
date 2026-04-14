import { describe, it, expect } from 'vitest';
import { Signal, signal, derived } from '../../src/core/Signal';
import * as THREE from 'three';

describe('Signal — plain TypeScript, no THREE.js', () => {
  it('initial value is accessible via get()', () => {
    const s = new Signal(42);
    expect(s.get()).toBe(42);
  });

  it('set() updates the value', () => {
    const s = new Signal(0);
    s.set(10);
    expect(s.get()).toBe(10);
  });

  it('onChange fires with new and previous value', () => {
    const s = new Signal(0);
    const calls: [number, number][] = [];
    s.onChange((v, prev) => calls.push([v, prev]));
    s.set(5);
    expect(calls[0]).toEqual([5, 0]);
  });

  it('onChange unsubscribe works', () => {
    const s = new Signal(0);
    const calls: number[] = [];
    const unsub = s.onChange(v => calls.push(v));
    s.set(1);
    unsub();
    s.set(2);
    expect(calls).toHaveLength(1);
  });

  it('is NOT an instance of Mobject or THREE object', () => {
    const s = new Signal(0);
    expect(s instanceof THREE.Mesh).toBe(false);
    expect((s as any).getThreeObject).toBeUndefined();
    expect((s as any).syncToThree).toBeUndefined();
  });

  it('derived() recomputes when dependency changes', () => {
    const x       = new Signal(2);
    const doubled = derived(() => x.get() * 2, [x]);
    expect(doubled.get()).toBe(4);
    x.set(5);
    expect(doubled.get()).toBe(10);
  });
});
