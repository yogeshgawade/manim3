// Text/Math rendering exports

export {
  parseSVGPathData,
  svgToVMobjects,
  pathDataToVMobjectSimple,
  type Vec2,
  type Vec3,
  type SVGToVMobjectOptions,
} from './svgPathParser';

export {
  renderLatexToSVG,
  svgElementToVMobjects,
  preloadMathJax,
  isMathJaxLoaded,
  katexCanRender,
  type MathJaxRenderOptions,
  type MathJaxRenderResult,
} from './MathJaxRenderer';

export {
  MathTex,
  type MathTexOptions,
} from './MathTex';

// Canvas-based text rendering
export {
  Text,
  type TextOptions,
  PIXEL_TO_WORLD,
  RESOLUTION_SCALE,
} from './Text';

export {
  Paragraph,
  type ParagraphOptions,
} from './Paragraph';

export {
  MarkupText,
  type MarkupTextOptions,
} from './MarkupText';

// Animatable numbers
export {
  DecimalNumber,
  Integer,
  type DecimalNumberOptions,
} from './DecimalNumber';

// Variable display (label = value)
export {
  Variable,
  type VariableOptions,
} from './Variable';
