export type Vec2 = [number, number];
export type Vec3 = [number, number, number];
export type Color = string;

export const UP:     Vec3 = [0,  1,  0];
export const DOWN:   Vec3 = [0, -1,  0];
export const LEFT:   Vec3 = [-1, 0,  0];
export const RIGHT:  Vec3 = [1,  0,  0];
export const OUT:    Vec3 = [0,  0,  1];
export const IN:     Vec3 = [0,  0, -1];
export const ORIGIN: Vec3 = [0,  0,  0];
export const UL:     Vec3 = [-1, 1,  0];
export const UR:     Vec3 = [1,  1,  0];
export const DL:     Vec3 = [-1,-1,  0];
export const DR:     Vec3 = [1, -1,  0];

export interface SubpathInfo {
  lengths: number[];  // Point count per subpath
  closed: boolean[];  // Whether each subpath is closed
}

export interface MobjectState {
  id:            string;
  position:      Vec3;
  rotation:      Vec3;
  scale:         Vec3;
  color:         Color;
  opacity:       number;
  strokeWidth:   number;
  fillColor:     Color;
  fillOpacity:   number;
  strokeOpacity: number;
  points3D:      number[][];
  visible:       boolean;
  children:      MobjectState[];
  extra:         Record<string, unknown>;
  subpaths?:     SubpathInfo;  // Optional multi-subpath support
  strokeWidths?: number[];    // Per-point variable stroke widths
}

export type RateFunction = (t: number) => number;
export type UpdaterFn    = (mob: any, dt: number) => void;

export interface InteractionHandlers {
  onClick?:    (e: PointerEvent) => void;
  onHover?:    (e: PointerEvent) => void;
  onHoverOut?: (e: PointerEvent) => void;
  onDrag?:     (delta: Vec2, e: PointerEvent) => void;
  onDragEnd?:  (e: PointerEvent) => void;
}

export type TimePosition = number | string;
