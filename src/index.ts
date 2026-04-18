/**
 * Manim3 - A TypeScript animation library for creating mathematical animations
 * Inspired by Python's Manim, using Three.js for rendering
 *
 * @packageDocumentation
 */

// Core types and base classes
export type {
  Vec2,
  Vec3,
  Color,
  SubpathInfo,
  MobjectState,
  RateFunction,
  UpdaterFn,
  InteractionHandlers,
  TimePosition,
} from './core/types';

export {
  UP,
  DOWN,
  LEFT,
  RIGHT,
  OUT,
  IN,
  ORIGIN,
  UL,
  UR,
  DL,
  DR,
} from './core/types';

// Core classes
export { Mobject } from './core/Mobject';
export { VMobject } from './core/VMobject';
export { Group } from './core/Group';
export { VGroup } from './core/VGroup';
export { Signal, signal, derived } from './core/Signal';

// Animation system
export * from './animation';

// Scene management
export * from './scene';

// Rendering
export * from './renderer';

// Scheduler and timing
export { Scheduler } from './scheduler/Scheduler';
export { AudioScheduler } from './scheduler/AudioScheduler';

// Player
export { ManimPlayer } from './player/ManimPlayer';

// Mobjects - Geometry
export * from './mobjects/geometry';

// Mobjects - Text and Math
export * from './mobjects/text';

// Mobjects - SVG
export * from './mobjects/svg';

// Mobjects - 3D
export * from './mobjects/three';

// Mobjects - Graphing
export * from './mobjects/graphing';

// Mobjects - Matrix
export * from './mobjects/matrix';

// Mobjects - Table
export * from './mobjects/table';

// Mobjects - Image
export * from './mobjects/image';

// Mobjects - Camera
export * from './mobjects/camera';

// Utilities - Math functions
export { lerp, clamp, lerpVec3, lerpEuler, lerpColor } from './utils/math';

// Utilities - Rate functions (easing)
// Note: 'wiggle' rate function is excluded to avoid conflict with animation.wiggle()
export {
  linear,
  smooth,
  smoothstep,
  thereAndBack,
  thereAndBackWithPause,
  rushInto,
  rushFrom,
  doubleSmooth,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeInQuint,
  easeOutQuint,
  easeInOutQuint,
  easeInSine,
  easeOutSine,
  easeInOutSine,
  easeInCirc,
  easeOutCirc,
  easeInOutCirc,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInBack,
  easeOutBack,
  easeInOutBack,
  easeInElastic,
  easeOutElastic,
  easeInOutElastic,
  easeInBounce,
  easeOutBounce,
  easeInOutBounce,
} from './utils/rateFunctions';

// Re-export wiggle rate function with alias
export { wiggle as wiggleRate } from './utils/rateFunctions';

// Utilities - Other
export * from './utils/bezierUtils';
export * from './utils/earcutFillGeometry';
export * from './utils/svgPathConverter';

// Constants (colors, etc.)
export * from './constants';

// Voiceover
export * from './voiceover';

// Export functionality
export { FrameExporter } from './export/FrameExporter';
