/**
 * Rate Functions (easing functions for animations)
 *
 * These functions control the pacing of animations by mapping
 * time t ∈ [0, 1] to interpolation values.
 *
 * Most functions follow the naming convention:
 * - easeIn*: Accelerates from zero
 * - easeOut*: Decelerates to zero
 * - easeInOut*: Accelerates then decelerates
 */

/** Linear interpolation - constant speed */
export const linear = (t: number): number => t;

/**
 * Manim's smooth function using sigmoid curve.
 * Matches Python manim's smooth(t, inflection=10)
 */
export const smooth = (t: number): number => {
  const inflection = 10.0;
  const error = 1 / (1 + Math.exp(inflection / 2));
  const sigmoid = 1 / (1 + Math.exp(-inflection * (t - 0.5)));
  return Math.max(0, Math.min(1, (sigmoid - error) / (1 - 2 * error)));
};

/** Smoothstep - Hermite interpolation (degree 3) */
export const smoothstep = (t: number): number => 3 * t * t - 2 * t * t * t;

/** There and back - goes to 1 at t=0.5, returns to 0 at t=1 */
export const thereAndBack = (t: number): number => {
  return t < 0.5 ? smooth(2 * t) : smooth(2 * (1 - t));
};

/** There and back with a pause - holds at 1 for a moment */
export const thereAndBackWithPause = (t: number, pauseRatio = 0.3): number => {
  const activeRatio = (1 - pauseRatio) / 2;
  if (t < activeRatio) {
    return smooth(t / activeRatio);
  } else if (t < activeRatio + pauseRatio) {
    return 1;
  } else {
    return smooth((1 - t) / activeRatio);
  }
};

/** Rush into - starts fast, slows down */
export const rushInto = (t: number): number => {
  return 2 * smooth(t / 2);
};

/** Rush from - starts slow, speeds up */
export const rushFrom = (t: number): number => {
  return 2 * smooth(0.5 + t / 2) - 1;
};

/** Double smooth - smooth interpolation with extra smoothness */
export const doubleSmooth = (t: number): number => {
  return smooth(smooth(t));
};

// ============================================================================
// Quadratic Easing
// ============================================================================

/** Quadratic ease in */
export const easeInQuad = (t: number): number => t * t;

/** Quadratic ease out */
export const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);

/** Quadratic ease in-out */
export const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ============================================================================
// Cubic Easing
// ============================================================================

/** Cubic ease in */
export const easeInCubic = (t: number): number => t * t * t;

/** Cubic ease out */
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

/** Cubic ease in-out */
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// ============================================================================
// Quartic Easing
// ============================================================================

/** Quartic ease in */
export const easeInQuart = (t: number): number => t * t * t * t;

/** Quartic ease out */
export const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

/** Quartic ease in-out */
export const easeInOutQuart = (t: number): number =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

// ============================================================================
// Quintic Easing
// ============================================================================

/** Quintic ease in */
export const easeInQuint = (t: number): number => t * t * t * t * t;

/** Quintic ease out */
export const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);

/** Quintic ease in-out */
export const easeInOutQuint = (t: number): number =>
  t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

// ============================================================================
// Sine Easing
// ============================================================================

/** Sine ease in */
export const easeInSine = (t: number): number => 1 - Math.cos((t * Math.PI) / 2);

/** Sine ease out */
export const easeOutSine = (t: number): number => Math.sin((t * Math.PI) / 2);

/** Sine ease in-out */
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

// ============================================================================
// Circular Easing
// ============================================================================

/** Circular ease in */
export const easeInCirc = (t: number): number => 1 - Math.sqrt(1 - Math.pow(t, 2));

/** Circular ease out */
export const easeOutCirc = (t: number): number => Math.sqrt(1 - Math.pow(t - 1, 2));

/** Circular ease in-out */
export const easeInOutCirc = (t: number): number =>
  t < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;

// ============================================================================
// Exponential Easing
// ============================================================================

/** Exponential ease in */
export const easeInExpo = (t: number): number => t === 0 ? 0 : Math.pow(2, 10 * (t - 1));

/** Exponential ease out */
export const easeOutExpo = (t: number): number => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

/** Exponential ease in-out */
export const easeInOutExpo = (t: number): number => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
};

// ============================================================================
// Back Easing (overshoot)
// ============================================================================

const BACK_CONST = 1.70158;

/** Back ease in (overshoot at start) */
export const easeInBack = (t: number): number => {
  return t * t * ((BACK_CONST + 1) * t - BACK_CONST);
};

/** Back ease out (overshoot at end) */
export const easeOutBack = (t: number): number => {
  return 1 + (t - 1) * (t - 1) * ((BACK_CONST + 1) * (t - 1) + BACK_CONST);
};

/** Back ease in-out */
export const easeInOutBack = (t: number): number => {
  const c = BACK_CONST * 1.525;
  return t < 0.5
    ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
    : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
};

// ============================================================================
// Elastic Easing
// ============================================================================

/** Elastic ease in */
export const easeInElastic = (t: number): number => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return -Math.pow(2, 10 * (t - 1)) * Math.sin(((t - 1.1) * 5 * Math.PI) / 0.4);
};

/** Elastic ease out */
export const easeOutElastic = (t: number): number => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin(((t - 0.1) * 5 * Math.PI) / 0.4) + 1;
};

/** Elastic ease in-out */
export const easeInOutElastic = (t: number): number => {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return t < 0.5
    ? -(Math.pow(2, 20 * t - 10) * Math.sin(((20 * t - 11.125) * Math.PI) / 2.25)) / 2
    : (Math.pow(2, -20 * t + 10) * Math.sin(((20 * t - 11.125) * Math.PI) / 2.25)) / 2 + 1;
};

// ============================================================================
// Bounce Easing
// ============================================================================

/** Bounce ease out */
export const easeOutBounce = (t: number): number => {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};

/** Bounce ease in */
export const easeInBounce = (t: number): number => 1 - easeOutBounce(1 - t);

/** Bounce ease in-out */
export const easeInOutBounce = (t: number): number =>
  t < 0.5
    ? (1 - easeOutBounce(1 - 2 * t)) / 2
    : (1 + easeOutBounce(2 * t - 1)) / 2;

// ============================================================================
// Wiggle (for use in animations)
// ============================================================================

/** Wiggle rate function - oscillates with decaying amplitude */
export const wiggle = (t: number, nWiggles = 7): number => {
  return Math.exp(-3 * t) * Math.sin(t * Math.PI * nWiggles) * (1 - t);
};
