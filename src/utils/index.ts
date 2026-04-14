// Math utilities
export { lerp, clamp, lerpVec3, lerpEuler, lerpColor } from './math';

// Rate functions (easing functions for animations)
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
  wiggle,
} from './rateFunctions';

// Re-export everything from rateFunctions for direct access
export * from './rateFunctions';

// Other utilities
export * from './bezierUtils';
export * from './earcutFillGeometry';
export * from './svgPathConverter';
