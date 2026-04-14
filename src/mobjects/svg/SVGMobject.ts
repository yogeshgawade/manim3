/**
 * SVGMobject - Parse and display SVG files/strings as VMobjects.
 * Converts SVG paths to Bezier curves that can be animated.
 */

import { VMobject } from '../../core/VMobject';
import { VGroup } from '../../core/VGroup';
import { WHITE } from '../../constants/colors';
import { DEFAULT_STROKE_WIDTH } from '../../constants';

/** Internal point type for SVG parsing (simple tuple) */
type SVGPoint = [number, number];

/**
 * SVGMobject options
 */
export interface SVGMobjectOptions {
  /** SVG string content */
  svgString?: string;
  /** Stroke color (default: WHITE) */
  color?: string;
  /** Stroke width (default: DEFAULT_STROKE_WIDTH) */
  strokeWidth?: number;
  /** Fill color (optional) */
  fillColor?: string;
  /** Fill opacity (default: 0) */
  fillOpacity?: number;
  /** Scale to fit within this height */
  height?: number;
  /** Scale to fit within this width */
  width?: number;
  /** Center position */
  center?: [number, number, number];
}

/**
 * VMobjectFromSVGPath options
 */
export interface VMobjectFromSVGPathOptions {
  /** SVG path d attribute */
  pathData: string;
  /** Stroke color */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Fill color */
  fillColor?: string;
  /** Fill opacity */
  fillOpacity?: number;
}

/**
 * Parse a single SVG path d attribute into Bezier control points.
 */
function parseSVGPath(d: string): SVGPoint[][] {
  const paths: SVGPoint[][] = [];
  let currentPath: SVGPoint[] = [];
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  let lastControlX = 0;
  let lastControlY = 0;
  let lastCommand = '';

  // Tokenize the path
  const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) || [];

  for (const cmd of commands) {
    const type = cmd[0];
    const args = cmd
      .slice(1)
      .trim()
      .split(/[\s,]+/)
      .filter((s) => s)
      .map(parseFloat);
    const isRelative = type === type.toLowerCase();

    switch (type.toUpperCase()) {
      case 'M': {
        // Move to
        if (currentPath.length > 0) {
          paths.push(currentPath);
          currentPath = [];
        }
        for (let i = 0; i < args.length; i += 2) {
          const x = isRelative ? currentX + args[i] : args[i];
          const y = isRelative ? currentY + args[i + 1] : args[i + 1];
          if (i === 0) {
            startX = x;
            startY = y;
          }
          currentX = x;
          currentY = y;
          currentPath.push([x, -y]); // Flip Y for screen coords
        }
        lastCommand = 'M';
        break;
      }

      case 'L': {
        // Line to
        for (let i = 0; i < args.length; i += 2) {
          const x = isRelative ? currentX + args[i] : args[i];
          const y = isRelative ? currentY + args[i + 1] : args[i + 1];
          currentX = x;
          currentY = y;
          currentPath.push([x, -y]);
        }
        lastCommand = 'L';
        break;
      }

      case 'H': {
        // Horizontal line
        for (let i = 0; i < args.length; i++) {
          const x = isRelative ? currentX + args[i] : args[i];
          currentX = x;
          currentPath.push([x, -currentY]);
        }
        lastCommand = 'H';
        break;
      }

      case 'V': {
        // Vertical line
        for (let i = 0; i < args.length; i++) {
          const y = isRelative ? currentY + args[i] : args[i];
          currentY = y;
          currentPath.push([currentX, -y]);
        }
        lastCommand = 'V';
        break;
      }

      case 'C': {
        // Cubic Bezier curve
        for (let i = 0; i < args.length; i += 6) {
          const x1 = isRelative ? currentX + args[i] : args[i];
          const y1 = isRelative ? currentY + args[i + 1] : args[i + 1];
          const x2 = isRelative ? currentX + args[i + 2] : args[i + 2];
          const y2 = isRelative ? currentY + args[i + 3] : args[i + 3];
          const x = isRelative ? currentX + args[i + 4] : args[i + 4];
          const y = isRelative ? currentY + args[i + 5] : args[i + 5];
          
          currentPath.push([x1, -y1]); // Control point 1
          currentPath.push([x2, -y2]); // Control point 2
          currentPath.push([x, -y]);   // End point
          
          lastControlX = x2;
          lastControlY = y2;
          currentX = x;
          currentY = y;
        }
        lastCommand = 'C';
        break;
      }

      case 'S': {
        // Smooth cubic Bezier
        for (let i = 0; i < args.length; i += 4) {
          // Reflect previous control point
          const x1 = isRelative ? currentX + (currentX - lastControlX) : currentX + (currentX - lastControlX);
          const y1 = isRelative ? currentY + (currentY - lastControlY) : currentY + (currentY - lastControlY);
          const x2 = isRelative ? currentX + args[i] : args[i];
          const y2 = isRelative ? currentY + args[i + 1] : args[i + 1];
          const x = isRelative ? currentX + args[i + 2] : args[i + 2];
          const y = isRelative ? currentY + args[i + 3] : args[i + 3];
          
          currentPath.push([x1, -y1]);
          currentPath.push([x2, -y2]);
          currentPath.push([x, -y]);
          
          lastControlX = x2;
          lastControlY = y2;
          currentX = x;
          currentY = y;
        }
        lastCommand = 'S';
        break;
      }

      case 'Q': {
        // Quadratic Bezier
        for (let i = 0; i < args.length; i += 4) {
          const x1 = isRelative ? currentX + args[i] : args[i];
          const y1 = isRelative ? currentY + args[i + 1] : args[i + 1];
          const x = isRelative ? currentX + args[i + 2] : args[i + 2];
          const y = isRelative ? currentY + args[i + 3] : args[i + 3];
          
          // Convert quadratic to cubic
          const cp1x = currentX + (2 / 3) * (x1 - currentX);
          const cp1y = currentY + (2 / 3) * (y1 - currentY);
          const cp2x = x + (2 / 3) * (x1 - x);
          const cp2y = y + (2 / 3) * (y1 - y);
          
          currentPath.push([cp1x, -cp1y]);
          currentPath.push([cp2x, -cp2y]);
          currentPath.push([x, -y]);
          
          lastControlX = x1;
          lastControlY = y1;
          currentX = x;
          currentY = y;
        }
        lastCommand = 'Q';
        break;
      }

      case 'T': {
        // Smooth quadratic Bezier
        for (let i = 0; i < args.length; i += 2) {
          const x = isRelative ? currentX + args[i] : args[i];
          const y = isRelative ? currentY + args[i + 1] : args[i + 1];
          
          // Reflect previous control point
          const x1 = isRelative ? currentX + (currentX - lastControlX) : currentX + (currentX - lastControlX);
          const y1 = isRelative ? currentY + (currentY - lastControlY) : currentY + (currentY - lastControlY);
          
          const cp1x = currentX + (2 / 3) * (x1 - currentX);
          const cp1y = currentY + (2 / 3) * (y1 - currentY);
          const cp2x = x + (2 / 3) * (x1 - x);
          const cp2y = y + (2 / 3) * (y1 - y);
          
          currentPath.push([cp1x, -cp1y]);
          currentPath.push([cp2x, -cp2y]);
          currentPath.push([x, -y]);
          
          lastControlX = x1;
          lastControlY = y1;
          currentX = x;
          currentY = y;
        }
        lastCommand = 'T';
        break;
      }

      case 'A': {
        // Arc (simplified - approximated as line for now)
        // Full implementation would require arc to bezier conversion
        for (let i = 0; i < args.length; i += 7) {
          const x = isRelative ? currentX + args[i + 5] : args[i + 5];
          const y = isRelative ? currentY + args[i + 6] : args[i + 6];
          currentX = x;
          currentY = y;
          currentPath.push([x, -y]);
        }
        lastCommand = 'A';
        break;
      }

      case 'Z':
      case 'z': {
        // Close path
        if (currentPath.length > 0) {
          currentPath.push([startX, -startY]);
        }
        lastCommand = 'Z';
        break;
      }
    }
  }

  if (currentPath.length > 0) {
    paths.push(currentPath);
  }

  return paths;
}

/**
 * Create a VMobject from an SVG path string
 */
export function VMobjectFromSVGPath(options: VMobjectFromSVGPathOptions): VMobject {
  const {
    pathData,
    color = WHITE,
    strokeWidth = DEFAULT_STROKE_WIDTH,
    fillColor,
    fillOpacity = 0,
  } = options;

  const paths = parseSVGPath(pathData);
  const vmobject = new VMobject();

  vmobject.color = color;
  vmobject.strokeWidth = strokeWidth;
  
  if (fillColor) {
    vmobject.fillColor = fillColor;
  }
  vmobject.fillOpacity = fillOpacity;

  // Convert paths to points3D
  const allPoints: number[][] = [];
  for (const path of paths) {
    for (const point of path) {
      allPoints.push([point[0], point[1], 0]);
    }
  }

  if (allPoints.length > 0) {
    vmobject.setPoints3D(allPoints as [number, number, number][]);
  }

  return vmobject;
}

/**
 * SVGMobject - Parse and display SVG content as VMobjects
 */
export class SVGMobject extends VGroup {
  private _svgString: string;
  private _originalWidth = 0;
  private _originalHeight = 0;

  constructor(options: SVGMobjectOptions = {}) {
    super();

    const {
      svgString = '',
      color = WHITE,
      strokeWidth = DEFAULT_STROKE_WIDTH,
      fillColor,
      fillOpacity = 0,
      height,
      width,
      center,
    } = options;

    this._svgString = svgString;

    if (svgString) {
      this._parseAndCreate(color, strokeWidth, fillColor, fillOpacity);

      // Apply scaling if requested
      if (height !== undefined || width !== undefined) {
        this._applyScaling(height, width);
      }

      // Center if requested
      if (center) {
        this.moveTo(center);
      }
    }
  }

  /**
   * Parse SVG string and create VMobjects
   */
  private _parseAndCreate(
    color: string,
    strokeWidth: number,
    fillColor: string | undefined,
    fillOpacity: number
  ): void {
    // Extract viewBox dimensions
    const viewBoxMatch = this._svgString.match(/viewBox="([^"]+)"/);
    let vbWidth = 100;
    let vbHeight = 100;
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].split(/[\s,]+/).map(parseFloat);
      if (parts.length >= 4) {
        vbWidth = parts[2];
        vbHeight = parts[3];
      }
    }
    this._originalWidth = vbWidth;
    this._originalHeight = vbHeight;

    // Extract all path elements
    const pathRegex = /<path[^>]*d="([^"]*)"[^>]*>/g;
    let match;

    while ((match = pathRegex.exec(this._svgString)) !== null) {
      const pathData = match[1];
      const vmob = VMobjectFromSVGPath({
        pathData,
        color,
        strokeWidth,
        fillColor,
        fillOpacity,
      });
      this.add(vmob);
    }

    // Also extract rect, circle, ellipse, line, polyline, polygon as simple shapes
    this._extractRectangles(color, strokeWidth, fillColor, fillOpacity);
    this._extractCircles(color, strokeWidth, fillColor, fillOpacity);
    this._extractLines(color, strokeWidth);
    this._extractPolylines(color, strokeWidth, fillColor, fillOpacity);
  }

  /**
   * Extract rectangle elements
   */
  private _extractRectangles(
    color: string,
    strokeWidth: number,
    fillColor: string | undefined,
    fillOpacity: number
  ): void {
    const rectRegex = /<rect[^>]*x="([^"]*)"[^>]*y="([^"]*)"[^>]*width="([^"]*)"[^>]*height="([^"]*)"[^>]*>/g;
    let match;

    while ((match = rectRegex.exec(this._svgString)) !== null) {
      const x = parseFloat(match[1]) || 0;
      const y = parseFloat(match[2]) || 0;
      const w = parseFloat(match[3]) || 0;
      const h = parseFloat(match[4]) || 0;

      const vmob = new VMobject();
      vmob.color = color;
      vmob.strokeWidth = strokeWidth;
      if (fillColor) {
        vmob.fillColor = fillColor;
        vmob.fillOpacity = fillOpacity;
      }

      // Create rectangle as path
      vmob.setPoints3D([
        [x, -y, 0],
        [x + w, -y, 0],
        [x + w, -(y + h), 0],
        [x, -(y + h), 0],
        [x, -y, 0],
      ]);

      this.add(vmob);
    }
  }

  /**
   * Extract circle elements
   */
  private _extractCircles(
    color: string,
    strokeWidth: number,
    fillColor: string | undefined,
    fillOpacity: number
  ): void {
    const circleRegex = /<circle[^>]*cx="([^"]*)"[^>]*cy="([^"]*)"[^>]*r="([^"]*)"[^>]*>/g;
    let match;

    while ((match = circleRegex.exec(this._svgString)) !== null) {
      const cx = parseFloat(match[1]) || 0;
      const cy = parseFloat(match[2]) || 0;
      const r = parseFloat(match[3]) || 0;

      const vmob = new VMobject();
      vmob.color = color;
      vmob.strokeWidth = strokeWidth;
      if (fillColor) {
        vmob.fillColor = fillColor;
        vmob.fillOpacity = fillOpacity;
      }

      // Approximate circle with bezier curves (4 cubic beziers)
      const k = 0.552284749831; // Magic number for circle approximation
      const points: [number, number, number][] = [
        [cx + r, -cy, 0],
        [cx + r, -(cy - k * r), 0],
        [cx + k * r, -(cy - r), 0],
        [cx, -(cy - r), 0],
        [cx - k * r, -(cy - r), 0],
        [cx - r, -(cy - k * r), 0],
        [cx - r, -cy, 0],
        [cx - r, -(cy + k * r), 0],
        [cx - k * r, -(cy + r), 0],
        [cx, -(cy + r), 0],
        [cx + k * r, -(cy + r), 0],
        [cx + r, -(cy + k * r), 0],
        [cx + r, -cy, 0],
      ];

      vmob.setPoints3D(points);
      this.add(vmob);
    }
  }

  /**
   * Extract line elements
   */
  private _extractLines(color: string, strokeWidth: number): void {
    const lineRegex = /<line[^>]*x1="([^"]*)"[^>]*y1="([^"]*)"[^>]*x2="([^"]*)"[^>]*y2="([^"]*)"[^>]*>/g;
    let match;

    while ((match = lineRegex.exec(this._svgString)) !== null) {
      const x1 = parseFloat(match[1]) || 0;
      const y1 = parseFloat(match[2]) || 0;
      const x2 = parseFloat(match[3]) || 0;
      const y2 = parseFloat(match[4]) || 0;

      const vmob = new VMobject();
      vmob.color = color;
      vmob.strokeWidth = strokeWidth;
      vmob.setPoints3D([
        [x1, -y1, 0],
        [x2, -y2, 0],
      ]);
      this.add(vmob);
    }
  }

  /**
   * Extract polyline and polygon elements
   */
  private _extractPolylines(
    color: string,
    strokeWidth: number,
    fillColor: string | undefined,
    fillOpacity: number
  ): void {
    const polyRegex = /<(polyline|polygon)[^>]*points="([^"]*)"[^>]*>/g;
    let match;

    while ((match = polyRegex.exec(this._svgString)) !== null) {
      const type = match[1];
      const pointsStr = match[2];
      const coords = pointsStr.trim().split(/[\s,]+/).map(parseFloat);

      const points: [number, number, number][] = [];
      for (let i = 0; i < coords.length; i += 2) {
        points.push([coords[i], -coords[i + 1], 0]);
      }

      if (type === 'polygon' && points.length > 0) {
        points.push([...points[0]]); // Close polygon
      }

      const vmob = new VMobject();
      vmob.color = color;
      vmob.strokeWidth = strokeWidth;
      if (fillColor && type === 'polygon') {
        vmob.fillColor = fillColor;
        vmob.fillOpacity = fillOpacity;
      }
      vmob.setPoints3D(points);
      this.add(vmob);
    }
  }

  /**
   * Apply scaling to fit within dimensions
   */
  private _applyScaling(height?: number, width?: number): void {
    if (this._originalWidth === 0 || this._originalHeight === 0) return;

    let scale = 1;
    if (height !== undefined && width !== undefined) {
      const scaleH = height / this._originalHeight;
      const scaleW = width / this._originalWidth;
      scale = Math.min(scaleH, scaleW);
    } else if (height !== undefined) {
      scale = height / this._originalHeight;
    } else if (width !== undefined) {
      scale = width / this._originalWidth;
    }

    this.scale = [scale, scale, scale];
  }

  /**
   * Get the original SVG width
   */
  getOriginalWidth(): number {
    return this._originalWidth;
  }

  /**
   * Get the original SVG height
   */
  getOriginalHeight(): number {
    return this._originalHeight;
  }
}

/**
 * Factory function to create an SVGMobject from a string
 */
export function svgMobject(svgString: string, options: Partial<SVGMobjectOptions> = {}): SVGMobject {
  return new SVGMobject({ svgString, ...options });
}
