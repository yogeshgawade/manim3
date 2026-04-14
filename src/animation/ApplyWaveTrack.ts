/**
 * ApplyWave animation track - applies a wave distortion to a mobject.
 *
 * Creates a wave-like distortion that passes through the mobject,
 * affecting either VMobject points or position for other mobjects.
 */

import { BaseAnimationTrack } from './AnimationTrack';
import { Mobject } from '../core/Mobject';
import { VMobject } from '../core/VMobject';
import type { RateFunction, Vec3 } from '../core/types';
import { linear } from '../utils/rateFunctions';
import { lerp } from '../utils/math';

export type WaveDirection = 'horizontal' | 'vertical' | 'radial';

export interface ApplyWaveOptions {
  /** Duration of the animation in seconds. Default: 1 */
  duration?: number;
  /** Rate function controlling animation pacing. Default: linear */
  rateFunc?: RateFunction;
  /** Direction of the wave. Default: 'horizontal' */
  direction?: WaveDirection;
  /** Amplitude of the wave. Default: 0.2 */
  amplitude?: number;
  /** Number of wave cycles. Default: 1.5 */
  wavelength?: number;
  /** Speed multiplier for wave propagation. Default: 1 */
  speed?: number;
}

/**
 * ApplyWaveTrack — Wave distortion passing through mobject.
 */
export class ApplyWaveTrack extends BaseAnimationTrack {
  private direction: WaveDirection;
  private amplitude: number;
  private wavelength: number;
  private speed: number;
  private startPosition: Vec3;
  private originalPoints: number[][] = [];
  private isVMobject: boolean;
  private bounds: { minX: number; maxX: number; minY: number; maxY: number } = {
    minX: 0, maxX: 1, minY: 0, maxY: 1,
  };
  private center: Vec3 = [0, 0, 0];

  constructor(
    mobject: Mobject,
    options: ApplyWaveOptions = {},
  ) {
    const duration = options.duration ?? 1;
    const rateFunc = options.rateFunc ?? linear;
    super(mobject, duration, rateFunc);
    this.direction = options.direction ?? 'horizontal';
    this.amplitude = options.amplitude ?? 0.2;
    this.wavelength = options.wavelength ?? 1.5;
    this.speed = options.speed ?? 1;
    this.startPosition = [...mobject.position] as Vec3;
    this.isVMobject = mobject instanceof VMobject;
  }

  prepare(): void {
    this.startPosition = [...this.mobject.position] as Vec3;
    this.center = this.mobject.getCenter();

    if (this.isVMobject) {
      const vmob = this.mobject as VMobject;
      this.originalPoints = vmob.points3D.map(p => [...p]);

      // Calculate bounds
      if (this.originalPoints.length > 0) {
        this.bounds = {
          minX: Math.min(...this.originalPoints.map(p => p[0])),
          maxX: Math.max(...this.originalPoints.map(p => p[0])),
          minY: Math.min(...this.originalPoints.map(p => p[1])),
          maxY: Math.max(...this.originalPoints.map(p => p[1])),
        };
      }
    }
  }

  interpolate(alpha: number): void {
    if (this.isVMobject) {
      this.applyWaveToVMobject(alpha);
    } else {
      this.applyWaveToPosition(alpha);
    }
  }

  private applyWaveToVMobject(alpha: number): void {
    const vmob = this.mobject as VMobject;

    // Wave travels from one side to the other
    const wavePhase = alpha * (1 + this.wavelength * 2) * this.speed;

    // Apply wave distortion to each point
    const newPoints = this.originalPoints.map((point) => {
      const [x, y, z] = point;

      // Calculate normalized position along wave direction
      let normalizedPos: number;
      if (this.direction === 'radial') {
        // Radial distance from center
        const dx = x - this.center[0];
        const dy = y - this.center[1];
        normalizedPos = Math.sqrt(dx * dx + dy * dy);
        // Normalize by max distance
        const maxDist = Math.max(
          this.bounds.maxX - this.center[0],
          this.center[0] - this.bounds.minX,
          this.bounds.maxY - this.center[1],
          this.center[1] - this.bounds.minY,
        );
        normalizedPos = normalizedPos / (maxDist || 1);
      } else if (this.direction === 'horizontal') {
        normalizedPos = (x - this.bounds.minX) / (this.bounds.maxX - this.bounds.minX || 1);
      } else {
        normalizedPos = (y - this.bounds.minY) / (this.bounds.maxY - this.bounds.minY || 1);
      }

      // Calculate wave displacement
      const waveInput = (normalizedPos - wavePhase) * Math.PI * 2 * this.wavelength;

      // Envelope: wave starts and ends smoothly
      const envelope = Math.sin(alpha * Math.PI);

      // Wave displacement
      const displacement = Math.sin(waveInput) * this.amplitude * envelope;

      // Apply displacement perpendicular to wave direction
      if (this.direction === 'radial') {
        const dx = x - this.center[0];
        const dy = y - this.center[1];
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        return [
          x + (dx / dist) * displacement * 0.5,
          y + (dy / dist) * displacement * 0.5,
          z,
        ];
      } else if (this.direction === 'horizontal') {
        return [x, y + displacement, z];
      } else {
        return [x + displacement, y, z];
      }
    });

    vmob.setPoints3D(newPoints);
    vmob.markDirty();
  }

  private applyWaveToPosition(alpha: number): void {
    // For non-VMobjects, apply simple position oscillation
    const envelope = Math.sin(alpha * Math.PI);
    const wave = Math.sin(alpha * Math.PI * 2 * this.wavelength * this.speed);
    const displacement = wave * this.amplitude * envelope;

    if (this.direction === 'horizontal') {
      this.mobject.position = [
        this.startPosition[0],
        this.startPosition[1] + displacement,
        this.startPosition[2],
      ];
    } else {
      this.mobject.position = [
        this.startPosition[0] + displacement,
        this.startPosition[1],
        this.startPosition[2],
      ];
    }
    this.mobject.markDirty();
  }
}

/**
 * Create an ApplyWave animation track.
 * @param mob The mobject to apply wave to
 * @param options ApplyWave options (direction, amplitude, wavelength, speed)
 */
export function applyWave(mob: Mobject, options?: ApplyWaveOptions): ApplyWaveTrack {
  return new ApplyWaveTrack(mob, options);
}
