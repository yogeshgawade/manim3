/**
 * Geometry mobjects for manim-web-v2
 *
 * This module provides basic geometric shapes as VMobjects that can be
 * animated and composed in scenes.
 */

// Circle
export { Circle, type CircleOptions } from './Circle';

// Line and variants
export { Line, type LineOptions } from './Line';
export { DashedLine, type DashedLineOptions } from './DashedLine';

// Rectangle and Square
export { Rectangle, Square, type RectangleOptions } from './Rectangle';

// Polygon and variants
export {
  Polygon,
  Triangle,
  RegularPolygon,
  Hexagon,
  Pentagon,
  type PolygonOptions,
} from './Polygon';

// Polygram (multi-contour polygons)
export { Polygram, Star, type PolygramOptions } from './Polygram';

// Arc and variants
export { Arc, type ArcOptions } from './Arc';
export { ArcBetweenPoints, type ArcBetweenPointsOptions } from './Arc';
export { Sector, type SectorOptions } from './Sector';
export { Annulus, type AnnulusOptions } from './Annulus';
export { AnnularSector, type AnnularSectorOptions } from './AnnularSector';
export { TangentialArc, type TangentialArcOptions } from './TangentialArc';

// ArcPolygon
export { ArcPolygon, type ArcPolygonOptions, type ArcConfig } from './ArcPolygon';

// Ellipse
export { Ellipse, type EllipseOptions } from './Ellipse';

// Dot and variants
export { Dot, SmallDot, LargeDot, type DotOptions } from './Dot';

// Arrows
export {
  Arrow,
  DoubleArrow,
  Vector,
  type ArrowOptions,
} from './Arrow';
export {
  CurvedArrow,
  CurvedDoubleArrow,
  type CurvedArrowOptions,
} from './CurvedArrow';

// Cubic Bezier
export {
  CubicBezier,
  type CubicBezierOptions,
  type CubicBezierPoints,
} from './CubicBezier';

// DashedVMobject
export { DashedVMobject, type DashedVMobjectOptions } from './DashedVMobject';

// Angle shapes
export {
  Angle,
  RightAngle,
  Elbow,
  TangentLine,
  type AngleOptions,
  type AngleInput,
  type RightAngleOptions,
  type ElbowOptions,
  type TangentLineOptions,
} from './AngleShapes';

// Labeled geometry
export {
  LabeledLine,
  LabeledArrow,
  LabeledDot,
  type LabeledLineOptions,
  type LabeledArrowOptions,
  type LabeledDotOptions,
  type LabelDirection,
} from './LabeledGeometry';

// Boolean operations
export {
  UnionResult,
  IntersectionResult,
  DifferenceResult,
  ExclusionResult,
  union,
  intersection,
  difference,
  exclusion,
  type BooleanOperationOptions,
  type Polygon2D,
} from './BooleanOperations';

// Shape matchers
export {
  BackgroundRectangle,
  Cross,
  SurroundingRectangle,
  Grid,
  type BackgroundRectangleOptions,
  type CrossOptions,
  type SurroundingRectangleOptions,
  type GridOptions,
} from './ShapeMatchers';
