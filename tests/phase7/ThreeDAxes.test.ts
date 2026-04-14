import { describe, it, expect } from 'vitest';
import { ThreeDAxes } from '../../src/mobjects/three/ThreeDAxes';
import { Mobject } from '../../src/core/Mobject';

describe('ThreeDAxes', () => {
  it('creates with default ranges', () => {
    const axes = new ThreeDAxes();

    expect(axes.xRange).toEqual([-5, 5, 1]);
    expect(axes.yRange).toEqual([-5, 5, 1]);
    expect(axes.zRange).toEqual([-5, 5, 1]);
    expect(axes.strokeWidth).toBe(2);
    expect(axes.withLabels).toBe(true);
  });

  it('creates with custom ranges', () => {
    const axes = new ThreeDAxes({
      xRange: [-10, 10, 2],
      yRange: [-3, 3, 0.5],
      zRange: [0, 5, 1],
      strokeWidth: 4,
      withLabels: false,
    });

    expect(axes.xRange).toEqual([-10, 10, 2]);
    expect(axes.yRange).toEqual([-3, 3, 0.5]);
    expect(axes.zRange).toEqual([0, 5, 1]);
    expect(axes.strokeWidth).toBe(4);
    expect(axes.withLabels).toBe(false);
  });

  it('coordsToPoint returns identity mapping', () => {
    const axes = new ThreeDAxes();
    const point = axes.coordsToPoint(1, 2, 3);

    expect(point).toEqual([1, 2, 3]);
  });

  it('pointToCoords returns coordinates', () => {
    const axes = new ThreeDAxes();
    const coords = axes.pointToCoords([1, 2, 3]);

    expect(coords).toEqual([1, 2, 3]);
  });

  it('getXAxisEnd returns X-axis endpoint', () => {
    const axes = new ThreeDAxes({ xRange: [0, 10, 1] });
    const end = axes.getXAxisEnd();

    expect(end).toEqual([10, 0, 0]);
  });

  it('getYAxisEnd returns Y-axis endpoint', () => {
    const axes = new ThreeDAxes({ yRange: [0, 8, 1] });
    const end = axes.getYAxisEnd();

    expect(end).toEqual([0, 8, 0]);
  });

  it('getZAxisEnd returns Z-axis endpoint', () => {
    const axes = new ThreeDAxes({ zRange: [0, 12, 1] });
    const end = axes.getZAxisEnd();

    expect(end).toEqual([0, 0, 12]);
  });

  it('addLabel creates label mobject', () => {
    const axes = new ThreeDAxes({ withLabels: false });
    const label = axes.addLabel('Test', [1, 2, 3], { size: 0.5, color: '#ff0000' });

    expect(label).toBeInstanceOf(Mobject);
    expect(label.position).toEqual([1, 2, 3]);
    expect(label.scale).toEqual([0.5, 0.5, 1]);
    expect((label as any).labelText).toBe('Test');
    expect((label as any).labelColor).toBe('#ff0000');
    expect((label as any).isHUD).toBe(true);
  });

  it('getLabels returns all added labels', () => {
    const axes = new ThreeDAxes({ withLabels: false });

    expect(axes.getLabels()).toHaveLength(0);

    axes.addLabel('A', [0, 0, 0]);
    axes.addLabel('B', [1, 1, 1]);

    expect(axes.getLabels()).toHaveLength(2);
  });

  it('withLabels creates axis labels', () => {
    const axes = new ThreeDAxes({
      xRange: [0, 2, 1],
      yRange: [0, 2, 1],
      zRange: [0, 2, 1],
      withLabels: true,
    });

    // Should have labels for x=1,2, y=1,2, z=1,2 (skips 0)
    const labels = axes.getLabels();
    expect(labels.length).toBeGreaterThan(0);
  });

  it('contains three VMobject axes', () => {
    const axes = new ThreeDAxes();

    // ThreeDAxes extends Group, so children should include axes and labels
    const children = axes.children;
    expect(children.length).toBeGreaterThanOrEqual(3);
  });
});
