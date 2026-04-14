// 3D mobjects for manim-web-v2

// Basic 3D primitives
export { Arrow3D, type Arrow3DOptions } from './Arrow3D';
export { Line3D, type Line3DOptions } from './Line3D';

// Axes and coordinate systems
export { ThreeDAxes, type ThreeDAxesOptions } from './ThreeDAxes';

// Surfaces
export { Surface3D, type Surface3DOptions } from './Surface3D';
export { ParametricSurface, SurfacePresets, type ParametricSurfaceOptions } from './ParametricSurface';
export { TexturedSurface, texturedSphere, type TexturedSurfaceOptions, type TexturedSphereOptions } from './TexturedSurface';

// Billboard
export { BillboardGroup, type BillboardGroupOptions } from './BillboardGroup';

// Cube and Box
export { Cube, Box3D, type CubeOptions, type Box3DOptions } from './Cube';

// Cylinder and Cone
export { Cylinder, Cone, type CylinderOptions, type ConeOptions } from './Cylinder';

// Sphere
export { Sphere, type SphereOptions } from './Sphere';

// Torus
export { Torus, type TorusOptions } from './Torus';

// Polyhedra (Platonic solids)
export {
  Polyhedron,
  Tetrahedron,
  Octahedron,
  Icosahedron,
  Dodecahedron,
  Prism,
  type PolyhedronOptions,
  type PrismOptions,
} from './Polyhedra';

// Dot3D
export { Dot3D, type Dot3DOptions } from './Dot3D';

// 3D Vector mobject
export { ThreeDVMobject, type ThreeDVMobjectOptions } from './ThreeDVMobject';
