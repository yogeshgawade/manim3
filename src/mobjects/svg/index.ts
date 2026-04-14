/**
 * SVG-based mobjects for manim-web-v2
 *
 * This module provides mobjects that are traditionally SVG-based in Manim,
 * but are implemented using Bezier curves for consistency with the rest
 * of the manimweb rendering pipeline.
 */

// Brace - Curly brace shapes
export {
  Brace,
  BraceBetweenPoints,
  type BraceOptions,
  type BraceBetweenPointsOptions,
} from './Brace';

// SVGMobject - Parse and display SVG
export {
  SVGMobject,
  svgMobject,
  VMobjectFromSVGPath,
  type SVGMobjectOptions,
  type VMobjectFromSVGPathOptions,
} from './SVGMobject';
