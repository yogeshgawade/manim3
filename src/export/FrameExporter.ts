import type { Scene } from '../scene/Scene';
import * as THREE from 'three';

export interface FrameExportOptions {
  fps?: number;
  filenamePrefix?: string;
  quality?: number;
  /** Background color for export (default: '#000000' for black, matching video output) */
  backgroundColor?: string;
  /** Export width in pixels (default: canvas width) - use 3840 for 4K */
  width?: number;
  /** Export height in pixels (default: canvas height) - use 2160 for 4K */
  height?: number;
}

export interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  time: number;
}

export class FrameExporter {
  async exportAnimation(
    scene: Scene,
    canvas: HTMLCanvasElement,
    options: FrameExportOptions = {},
    onProgress?: (progress: ExportProgress) => void
  ): Promise<string[]> {
    const fps = options.fps ?? 30;
    const totalDuration = scene.scheduler.totalDuration;
    const totalFrames = Math.ceil(totalDuration * fps);
    const frames: string[] = [];
    const bgColor = options.backgroundColor ?? '#000000';

    // Access renderer and get original state
    const renderer = (scene as any).renderer;
    const threeRenderer = renderer?.['threeRenderer'] as THREE.WebGLRenderer | undefined;
    const originalColor = new THREE.Color();
    const originalBg = threeRenderer?.getClearColor(originalColor).getHexString() ?? '000000';

    // Handle resolution scaling for 4K export
    const originalWidth = canvas.width;
    const originalHeight = canvas.height;
    const exportWidth = options.width ?? originalWidth;
    const exportHeight = options.height ?? originalHeight;
    const needsResize = exportWidth !== originalWidth || exportHeight !== originalHeight;

    if (needsResize) {
      renderer?.resize?.(exportWidth, exportHeight);
    }
    renderer?.setBackground?.(bgColor);

    try {
      for (let i = 0; i <= totalFrames; i++) {
        const time = Math.min(i / fps, totalDuration);
        scene.seek(time);

        const dataUrl = canvas.toDataURL('image/png', options.quality ?? 1.0);
        frames.push(dataUrl);

        onProgress?.({
          currentFrame: i + 1,
          totalFrames: totalFrames + 1,
          time
        });

        // Yield to prevent UI blocking
        if (i % 10 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }
    } finally {
      // Restore original background and resolution
      renderer?.setBackground?.('#' + originalBg);
      if (needsResize) {
        renderer?.resize?.(originalWidth, originalHeight);
      }
      scene.seek(0);
    }

    return frames;
  }

  async downloadAsZip(frames: string[], filenamePrefix: string = 'frame'): Promise<void> {
    const JSZip = await import('jszip').then(m => m.default);
    const zip = new JSZip();
    const folder = zip.folder('frames');
    
    if (!folder) throw new Error('Failed to create ZIP folder');

    const padLength = String(frames.length).length;
    
    for (let i = 0; i < frames.length; i++) {
      const base64Data = frames[i].replace(/^data:image\/png;base64,/, '');
      const paddedIndex = String(i).padStart(padLength, '0');
      folder.file(`${filenamePrefix}_${paddedIndex}.png`, base64Data, { base64: true });
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenamePrefix}_frames.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
