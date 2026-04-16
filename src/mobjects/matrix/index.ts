/**
 * Matrix mobjects for manim3
 *
 * This module provides matrix mobjects for displaying 2D arrays
 * with configurable brackets and styling.
 */

export {
  Matrix,
  IntegerMatrix,
  DecimalMatrix,
  MobjectMatrix,
  type MatrixOptions,
  type IntegerMatrixOptions,
  type DecimalMatrixOptions,
  type MobjectMatrixOptions,
  type BracketType,
  type ElementAlignment,
} from './Matrix';

export {
  getDetText,
  matrixToMobject,
  matrixToTexString,
  type GetDetTextOptions,
} from './MatrixHelpers';
