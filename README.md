# Manim3

A TypeScript animation library for creating mathematical animations, inspired by Python's Manim. Built on top of Three.js for high-performance WebGL rendering.

## Installation

```bash
npm install manim3 three
```

Note: `three` is a peer dependency and must be installed separately.

## Quick Start

### NPM (Recommended)

```typescript
import { Scene, Circle, moveTo, create, fadeIn } from 'manim3';

// Create a scene
const scene = new Scene(
  document.getElementById('canvas-container')!,
  { width: 1920, height: 1080 }
);

// Create a circle
const circle = new Circle({
  radius: 2,
  color: '#58C4DD',
  fillColor: '#83C9DD',
  fillOpacity: 0.5,
});

// Add to scene and animate
scene.add(circle);

// Build timeline and play
scene.scheduler.reset();
scene.at(0).play(create(circle, 1));
scene.at('+=0.5').play(moveTo(circle, [3, 0, 0], 1));
scene.scheduler.play();
```

### CDN (No Build Required)

Use Manim3 directly in the browser with no build step:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://unpkg.com/manim3@latest/dist/ManimPlayer.css">
</head>
<body>
  <div id="player-container"></div>

  <script type="module">
    import { Scene, ManimPlayer, Circle, create } from 'https://esm.sh/manim3@latest';

    // Create scene and player
    const container = document.getElementById('player-container');
    const scene = new Scene(container, { width: 960, height: 540 });
    const player = new ManimPlayer(container, scene);

    // Create and animate a circle
    const circle = new Circle({ radius: 1, color: '#58C4DD' });
    scene.add(circle);
    scene.scheduler.reset();
    scene.at(0).play(create(circle, 1));
    scene.scheduler.play();
  </script>
</body>
</html>
```

## Features

- **2D & 3D Graphics**: Geometric shapes, text, graphs, and 3D objects
- **Animation System**: Rich animation tracks (move, rotate, scale, color, morph, create, etc.)
- **LaTeX/Math Support**: Render mathematical expressions with MathJax/KaTeX
- **SVG Import**: Load and animate SVG files
- **Timeline Control**: Precise scheduling with bookmarks and relative positioning
- **Audio Sync**: Synchronize animations with audio and voiceovers
- **Export**: Export animations as video frames

## Core Concepts

### Mobjects

Mobjects (Mathematical Objects) are the basic building blocks:

```typescript
import { Circle, Rectangle, Line, Arrow, Text } from 'manim3';

const circle = new Circle({ radius: 1, color: '#FF0000' });
const rect = new Rectangle({ width: 2, height: 1 });
const line = new Line({ start: [-1, 0, 0], end: [1, 0, 0] });
```

### Animations

Apply animations using the timeline-based API:

```typescript
import { Scene, create, moveTo, rotateTo, scaleTo, fadeOut, smooth } from 'manim3';

// Create scene
const scene = new Scene(container, { width: 1920, height: 1080 });

// Reset scheduler before building timeline
scene.scheduler.reset();

// Play animations at specific times with relative offsets
scene.at(0).play(create(circle, 1, smooth));                    // Start at t=0
scene.at('+=0.5').play(moveTo(circle, [2, 0, 0], 1, smooth));  // +0.5s after previous
scene.at('+=0.5').play(rotateTo(circle, [0, 0, Math.PI], 1));  // +0.5s gap
scene.at('+=0.5').play(scaleTo(circle, 2, 1, smooth));
scene.at('+=0.5').play(fadeOut(circle, 1, smooth));

// Start playback
scene.scheduler.play();
```

### Scenes

Scenes coordinate rendering and animation:

```typescript
import { Scene, ThreeDScene } from 'manim3';

// Scene constructor takes container as first argument
const scene2D = new Scene(container, { width: 1920, height: 1080 });
const scene3D = new ThreeDScene(container, { width: 1920, height: 1080 });
```

### ManimPlayer

A ready-to-use video player component with playback controls, scrubber, and export functionality:

```typescript
import { Scene, ManimPlayer } from 'manim3';

const container = document.getElementById('player-container');
const scene = new Scene(container, { width: 960, height: 540 });

// Create player with options
const player = new ManimPlayer(container, scene, {
  showExport: true,        // Show export controls
  keyboardShortcuts: true,  // Enable Space (play/pause) and R (restart)
});
```

**Note:** When using ManimPlayer, include the CSS file:
- **NPM**: Import from `node_modules/manim3/dist/ManimPlayer.css`
- **CDN**: Link to `https://unpkg.com/manim3@latest/dist/ManimPlayer.css`

## API Overview

### Core Classes
- `Mobject` - Base class for all objects
- `VMobject` - Vectorized mobject with bezier curves
- `Group` / `VGroup` - Collections of mobjects
- `Scene` - 2D animation scene
- `ThreeDScene` - 3D animation scene
- `ManimPlayer` - Video player component with controls

### Geometric Shapes
- `Circle`, `Ellipse`, `Arc`, `Sector`
- `Rectangle`, `Square`, `Polygon`, `Triangle`
- `Line`, `Arrow`, `CurvedArrow`, `DoubleArrow`
- `Dot`, `SmallDot`, `LargeDot`
- `Annulus`, `AnnularSector`

### Text & Math
- `Text` - Canvas-based text
- `MathTex` / `Tex` - LaTeX rendering
- `MarkupText` - Styled text
- `Paragraph` - Multi-line text
- `DecimalNumber` / `Integer` - Animated numbers

### Graphing
- `Axes` - 2D coordinate system
- `NumberLine` - 1D axis
- `NumberPlane` - Grid background
- `FunctionGraph` - Plot functions
- `ComplexPlane` - Complex number visualization
- `VectorField` - Vector field display
- `StreamLines` - Flow visualization

### 3D Objects
- `Sphere`, `Cube`, `Cylinder`, `Cone`
- `Torus`, `Polyhedron`
- `Arrow3D`, `Line3D`
- `Surface3D`, `ParametricSurface`

### Animations
- `create()` - Draw border then fill
- `moveTo()` - Position interpolation
- `rotateTo()` - Rotation interpolation
- `scaleTo()` - Scale interpolation
- `colorTo()` - Color interpolation
- `fadeIn()` / `fadeOut()` - Opacity changes
- `morphTo()` - Shape morphing
- `growFromCenter()` - Grow from center
- `indicate()` - Pulse to draw attention
- `wiggle()` - Rotation oscillation
- `crossFade()` - Crossfade between objects

### Utilities
- Rate functions: `linear`, `smooth`, `easeInOutQuad`, etc.
- `ValueTracker` - Animate scalar values
- Color palette from `constants/colors`

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build for production
npm run build

# Type check
npm run lint
```

## License

MIT

## Credits

Inspired by [3Blue1Brown's Manim](https://github.com/3b1b/manim).
