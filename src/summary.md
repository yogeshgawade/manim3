# Manim3 Source Code Summary

## Overview
Manim3 is a TypeScript-based animation library for creating mathematical animations, inspired by Python's Manim. It uses Three.js for rendering and provides a declarative API for animating 2D and 3D objects.

## Core Architecture

### Core Module (`/core`)
- **Mobject.ts**: Base class for all mathematical objects. Manages position, rotation, scale, color, opacity, stroke/fill properties, hierarchy (parent/child), dirty flags, updaters, and interaction handlers. Provides state capture/restore for animations.
- **VMobject.ts**: Vectorized Mobject with bezier curves support. Contains 3D points array defining shapes, fill properties, visibleFraction for progressive drawing, and multi-subpath support for complex shapes.
- **Group.ts**: Container class extending Mobject (no bezier points). Manages collections of mobjects as a unit.
- **VGroup.ts**: Group specialized for VMobject children. Provides array-like methods (map, filter, forEach) and bulk property setters (setColor, setOpacity).
- **Signal.ts**: Reactive state container with pub/sub pattern. Provides `onChange` subscriptions and `derived` computed signals.
- **types.ts**: Type definitions including Vec2/Vec3, Color, Direction constants (UP, DOWN, LEFT, RIGHT), MobjectState, RateFunction, and interaction handler types.

### Animation Module (`/animation`)

#### Base & Core Tracks
- **AnimationTrack.ts**: Interface and base class for all animation tracks. Defines `prepare()`, `interpolate(alpha)`, and `dispose()` lifecycle. Tracks have id, duration, rateFunc, and remover flag.
- **UpdaterTrack.ts**: Per-frame callback runner for custom animation logic. Called every frame with delta time.
- **GroupTrack.ts**: Combines multiple tracks with parallel, sequence, or stagger timing modes.

#### Transform Animations
- **MoveTrack.ts**: Position interpolation from start to end Vec3. Factory: `moveTo()`
- **ScaleTrack.ts**: Scale interpolation supporting both number (uniform) and Vec3 (non-uniform) targets. Factory: `scaleTo()`
- **RotateTrack.ts**: Euler angle rotation interpolation. Factory: `rotateTo()`
- **ColorTrack.ts**: RGB interpolation of stroke and fill colors. Factory: `colorTo()`
- **FadeTrack.ts**: Opacity interpolation from one value to another. Factories: `fadeIn()`, `fadeOut()`

#### Creation/Destruction Animations
- **CreateTrack.ts**: Reveals stroke using visibleFraction (dash-based), then fades in fill. Supports stroke-fill lag ratio for DrawBorderThenFill effect. Factory: `create()`
- **CreateGroupTrack.ts**: Applies CreateTrack to all leaf VMobjects in a group with optional staggered timing.
- **FadeGroupTrack.ts**: Fades entire group including all descendants with stagger support. Factories: `fadeInGroup()`, `fadeOutGroup()`
- **ShrinkTrack.ts**: Scales mobject down to 0 at its center. Factory: `shrinkToCenter()`

#### Grow Animations (from Python Manim)
- **GrowTrack.ts**: Base and variants for growing mobjects from points.
  - `GrowFromPointTrack`: Grows from arbitrary point
  - `GrowFromCenterTrack`: Grows from center
  - `GrowFromEdgeTrack`: Grows from bounding box edge (UP, DOWN, LEFT, RIGHT)
  - Factories: `growFromPoint()`, `growFromCenter()`, `growFromEdge()`, with color variants
- **GrowArrowTrack.ts**: Special grow animation for Arrow (scales about start point while maintaining tip). Factories: `growArrow()`, `growArrowWithColor()`
- **SpinInTrack.ts**: Grows from center while spinning around Z-axis. Factories: `spinInFromNothing()`, `spinInFromNothingWithColor()`

#### Morph Animations
- **MorphTrack.ts**: Shape morphing using GSAP MorphSVGPlugin. Converts VMobject points to/from SVG paths, interpolates rotation/position/scale/opacity. Factory: `morphTo()`
- **VGroupMorphTrack.ts**: Morphs between groups using Hungarian matching algorithm to pair similar shapes. Handles matched pairs (morph), unmatched sources (fade out), unmatched targets (fade in).

#### Indication/Emphasis Animations
- **IndicateTrack.ts**: Scales up/down with color change to draw attention. Uses `thereAndBack` rate function. Factory: `indicate()`
- **PulseTrack.ts**: Sine wave scale pulsing with configurable pulses count. Factory: `pulse()`
- **BlinkTrack.ts**: Opacity modulation for blinking effect. Factory: `blink()`
- **WiggleTrack.ts**: Rotation oscillation with optional scale envelope. Factory: `wiggle()`
- **WiggleOutThenInTrack.ts**: Scales outward with rotation wiggle, then returns. Factory: `wiggleOutThenIn()`

#### Effect Animations
- **ApplyWaveTrack.ts**: Wave distortion passing through mobject (horizontal/vertical/radial). Factory: `applyWave()`
- **FlashTrack.ts**: Radiating flash lines from center. Factory: `flash()`
- **CircumscribeTrack.ts**: Draws rectangle or circle around mobject, then fades. Factory: `circumscribe()`
- **FocusOnTrack.ts**: Converging rings focusing on mobject. Factory: `focusOn()`
- **ShowPassingFlashTrack.ts**: Flash of light traveling along a path. Factory: `showPassingFlash()`
- **TaperedFlashTrack.ts**: Flash with tapered stroke width (thick at head, thin at tail). Factory: `taperedFlash()`

#### Movement & Path Animations
- **MoveAlongPathTrack.ts**: Moves mobject along a VMobject path using cubic bezier evaluation.
- **SpiralInTrack.ts**: Sub-mobjects fly in on spiral trajectories while rotating. Factory: `spiralIn()`

#### Transitions
- **CrossFadeTrack.ts**: Crossfade between two mobjects with position interpolation. Factory: `crossFade()`

#### Utilities
- **ValueTrack.ts**: Scalar value animation with onChange callback for custom effects. `ValueTracker` holds value, `animateTo()` creates track.
- **index.ts**: Re-exports all animation modules.

### Scheduler Module (`/scheduler`)
- **Scheduler.ts**: Single source of truth for time. One rAF loop drives all animations.
  - Manages track scheduling with start/end times
  - Provides `play()`, `pause()`, `seek()`, `reset()`
  - TimelineBuilder for positioning tracks at specific times
  - Supports bookmarks and relative positioning ('+=', '<', 'bookmark:name')
- **AudioScheduler.ts**: Wraps Web Audio API, syncs to Scheduler clock. Supports audio clips, TTS segments with word-level timing bookmarks.

### Scene Module (`/scene`)
- **Scene.ts**: Main 2D scene coordinating Scheduler, Renderer, LogicalScene, InteractionLayer.
  - `add()`, `remove()`, `addForeground()`, `clear()` for mobject management
  - `play()` for animation playback with Promise resolution
  - `seek()`, `pause()`, `resume()`, `reset()` for control
  - Captures initial states for reset functionality
- **LogicalScene.ts**: Manages mobject hierarchy, layers (background, main, foreground), and query methods.
- **InteractionLayer.ts**: Pointer event handling for click, hover, drag interactions on mobjects.
- **ThreeDScene.ts**: 3D scene variant with perspective camera and 3D-specific rendering.
- **MovingCameraScene.ts**: Scene with camera that can move/animate.
- **ZoomedScene.ts**: Scene with zoomed inset view capability.
- **index.ts**: Re-exports all scene types.

### Renderer Module (`/renderer`)
- **Renderer.ts**: Main rendering orchestrator using Three.js.
  - Creates WebGLRenderer with orthographic camera matching Manim coordinates
  - `reconcile()`: Maps logical mobjects to RenderNodes
  - `syncDirty()`: Updates only changed mobjects
  - `render()`: Executes Three.js render pass
  - `resize()`, `setBackground()`, `dispose()`
- **RenderNode.ts**: Base class for all render nodes wrapping Three.js objects.
- **VMobjectRenderNode.ts**: Renders VMobjects with configurable stroke renderer (line2, bezier-sdf, meshline).
- **GroupRenderNode.ts**: Container node for Group mobjects.
- **TextRenderNode.ts**: Canvas-based text rendering.
- **ImageRenderNode.ts**: Texture-based image rendering.
- **3D RenderNodes**: Surface3DRenderNode, Arrow3DRenderNode, Line3DRenderNode, Mesh3DRenderNode, BillboardRenderNode, TexturedSurfaceRenderNode.
- **Stroke renderers**: Line2Renderer, BezierSDFRenderer, MeshLineRenderer with corresponding materials/geometries.
- **FillRenderer.ts**: Fill rendering for closed shapes.
- **Camera2D.ts** / **Camera3D.ts**: Camera controllers.
- **index.ts**: Re-exports renderer public API.

### Mobjects Module (`/mobjects`)

#### Geometry (`/mobjects/geometry`)
- **Circle.ts**: Circle with radius, configurable resolution.
- **Rectangle.ts**: Rectangle with width/height. `Square` variant.
- **Line.ts**: Line between two points.
- **Polygon.ts**: Polygon from vertex array. `Triangle`, `RegularPolygon`, `Hexagon`, `Pentagon` variants.
- **Polygram.ts**: Multi-contour polygons. `Star` variant.
- **Arc.ts**: Circular arc with angle/radius. `ArcBetweenPoints` variant.
- **Sector.ts**: Pie wedge shape.
- **Annulus.ts**: Ring shape.
- **AnnularSector.ts**: Ring sector.
- **Ellipse.ts**: Ellipse with width/height.
- **Dot.ts**: Small filled circle. `SmallDot`, `LargeDot` variants.
- **Arrow.ts**: Arrow with shaft and triangular tip. `DoubleArrow`, `Vector` variants.
- **CurvedArrow.ts**: Arc-based arrow. `CurvedDoubleArrow` variant.
- **DashedLine.ts**: Line rendered as dashes.
- **DashedVMobject.ts**: Base for dashed shapes.
- **CubicBezier.ts**: Cubic bezier curve from control points.
- **TangentialArc.ts**: Arc tangent to a line.
- **ArcPolygon.ts**: Polygon with arc-rounded corners.
- **AngleShapes.ts**: `Angle`, `RightAngle`, `Elbow`, `TangentLine` for geometric annotations.
- **LabeledGeometry.ts**: `LabeledLine`, `LabeledArrow`, `LabeledDot` with text labels.
- **BooleanOperations.ts**: `union()`, `intersection()`, `difference()`, `exclusion()` for shape operations.
- **ShapeMatchers.ts**: `BackgroundRectangle`, `Cross`, `SurroundingRectangle`, `Grid` utility shapes.
- **index.ts**: Re-exports all geometry mobjects.

#### Text (`/mobjects/text`)
- **Text.ts**: Canvas-based text rendering with font/size/color options. Uses pixel-to-world scaling.
- **Paragraph.ts**: Multi-line text block with word wrapping.
- **MarkupText.ts**: HTML-style markup support (bold, italic, colors).
- **MathTex.ts**: LaTeX/MathJax math rendering to SVG paths.
- **MathJaxRenderer.ts**: MathJax integration for formula rendering.
- **DecimalNumber.ts**: Animated number display with decimal places.
- **Variable.ts**: Label=value display that auto-updates.
- **index.ts**: Re-exports all text mobjects.

#### Graphing (`/mobjects/graphing`)
- **NumberLine.ts**: 1D axis with ticks and labels.
- **Axes.ts**: 2D coordinate system with X/Y axes.
- **NumberPlane.ts**: Grid background with axis lines.
- **ComplexPlane.ts**: Complex number visualization with real/imaginary axes.
- **FunctionGraph.ts**: Mathematical function plotting.
- **VectorField.ts**: Vector field visualization with arrows.
- **StreamLines.ts**: Animated flow lines for vector fields.
- **index.ts**: Re-exports all graphing mobjects.

#### 3D Objects (`/mobjects/three`)
- **Surface3D.ts**: Parametric 3D surface.
- **Cube.ts** / **Box3D.ts**: 3D box primitives.
- **Sphere.ts**: 3D sphere.
- **Cylinder.ts** / **Cone.ts**: 3D cylinder/cone.
- **Torus.ts**: 3D torus/donut.
- **Polyhedra.ts**: `Polyhedron`, `Prism` 3D shapes.
- **Dot3D.ts**: 3D point marker.
- **Arrow3D.ts**: 3D arrow.
- **Line3D.ts**: 3D line.
- **TexturedSurface.ts**: Image-textured 3D surface.
- **BillboardGroup.ts**: Always-facing-camera group for labels.
- **index.ts**: Re-exports all 3D mobjects.

#### SVG (`/mobjects/svg`)
- **SVGMobject.ts**: Import and render external SVG files as VMobjects.
- **Brace.ts**: Curly brace shape for annotations.
- **index.ts**: Re-exports SVG mobjects.

#### Matrix (`/mobjects/matrix`)
- **Matrix.ts**: Grid layout for matrix/2D array visualization.
- **MatrixHelpers.ts**: Utility functions for matrix operations.
- **index.ts**: Re-exports matrix components.

#### Table (`/mobjects/table`)
- **Table.ts**: Tabular data layout with rows/columns.
- **index.ts**: Re-exports table components.

#### Image (`/mobjects/image`)
- **ImageObject.ts**: Image display mobject.
- **index.ts**: Re-exports image components.

#### Camera (`/mobjects/camera`)
- **Camera2DFrame.ts**: Camera frame indicator for 2D scenes.
- **index.ts**: Re-exports camera components.

### Constants Module (`/constants`)
- **colors.ts**: Manim color palette (WHITE, BLACK, GRAYS, BLUES, REDS, GREENS, YELLOWS, etc.). Includes default stroke width, font size, animation duration constants.
- **index.ts**: Re-exports colors.

### Utils Module (`/utils`)
- **math.ts**: `lerp`, `clamp`, `lerpVec3`, `lerpEuler`, `lerpColor` interpolation functions.
- **rateFunctions.ts**: Animation easing functions:
  - Basic: `linear`, `smooth`, `smoothstep`, `thereAndBack`, `thereAndBackWithPause`, `rushInto`, `rushFrom`, `doubleSmooth`
  - Quadratic: `easeInQuad`, `easeOutQuad`, `easeInOutQuad`
  - Cubic: `easeInCubic`, `easeOutCubic`, `easeInOutCubic`
  - Quartic/Quintic: Similar patterns
  - Sine: `easeInSine`, `easeOutSine`, `easeInOutSine`
  - Circular: `easeInCirc`, `easeOutCirc`, `easeInOutCirc`
  - Exponential: `easeInExpo`, `easeOutExpo`, `easeInOutExpo`
  - Back (overshoot): `easeInBack`, `easeOutBack`, `easeInOutBack`
  - Elastic: `easeInElastic`, `easeOutElastic`, `easeInOutElastic`
  - Bounce: `easeInBounce`, `easeOutBounce`, `easeInOutBounce`
  - Special: `wiggle`
- **bezierUtils.ts**: Bezier curve utilities.
- **earcutFillGeometry.ts**: Triangulation for shape fills.
- **svgPathConverter.ts**: SVG path data conversion to VMobject points.
- **index.ts**: Re-exports all utilities.

### Export Module (`/export`)
- **FrameExporter.ts**: Exports animation frames as PNG images.
  - `exportAnimation()`: Captures all frames at specified FPS
  - `downloadAsZip()`: Packages frames into ZIP file
  - Supports 4K export, custom background colors

## Key Design Patterns

1. **Mobject Hierarchy**: Parent-child relationships with transform inheritance
2. **Dirty Flag**: Only sync changed mobjects to renderer
3. **Animation Tracks**: Pure interpolation functions, no side effects except setting state
4. **Scheduler-Driven**: Single rAF loop coordinates all animations
5. **Three.js Abstraction**: RenderNodes wrap Three.js objects, mobjects remain Three.js-free
6. **Rate Functions**: Easing curves control animation pacing
7. **State Capture/Restore**: Animations can reset to initial states for seeking
8. **Composition**: Group/VGroup for combining mobjects, GroupTrack for combining animations
