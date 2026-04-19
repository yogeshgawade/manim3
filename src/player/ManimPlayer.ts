import { FrameExporter } from '../export/FrameExporter.js';
import type { Scene } from '../scene/Scene.js';

export interface ManimPlayerOptions {
  showExport?: boolean;
  showSpeedControl?: boolean;
  keyboardShortcuts?: boolean;
}

interface PlayerElements {
  canvasContainer: HTMLDivElement;
  scrubber: HTMLInputElement;
  scrubberFill: HTMLDivElement;
  scrubberThumb: HTMLDivElement;
  playBtn: HTMLButtonElement;
  replayBtn: HTMLButtonElement;
  timeCurrent: HTMLSpanElement;
  timeTotal: HTMLSpanElement;
  statusText: HTMLSpanElement;
  fpsSelect?: HTMLSelectElement;
  resSelect?: HTMLSelectElement;
  exportBtn?: HTMLButtonElement;
  exportProgress?: HTMLSpanElement;
}

export class ManimPlayer {
  private container: HTMLElement;
  private scene: Scene;
  private options: Required<ManimPlayerOptions>;
  private isPlaying: boolean;
  private exporter: FrameExporter;
  private canvasContainer!: HTMLDivElement;
  private els!: PlayerElements;

  constructor(container: HTMLElement, scene: Scene, options: ManimPlayerOptions = {}) {
    this.container = container;
    this.scene = scene;
    this.options = {
      showExport: true,
      showSpeedControl: false,
      keyboardShortcuts: true,
      ...options
    };

    this.isPlaying = false;
    this.exporter = new FrameExporter();

    this._init();
  }

  private _init(): void {
    try {
      this._buildUI();
      this._moveCanvas();
      this._bindEvents();
      this._setupSceneHooks();
    } catch (err) {
      console.error('ManimPlayer initialization failed:', err);
    }
  }

  private _q<T extends HTMLElement>(selector: string): T {
    return this.container.querySelector<T>(selector)!;
  }

  private _buildUI(): void {
    this.container.classList.add('manim-player');

    this.canvasContainer = document.createElement('div');
    this.canvasContainer.className = 'manim-player__canvas-container';

    const controls = document.createElement('div');
    controls.className = 'manim-player__controls';
    controls.innerHTML = `
      <div class="manim-player__scrubber-row">
        <div class="manim-player__scrubber-track">
          <div class="manim-player__scrubber-fill js-scrubber-fill"></div>
          <div class="manim-player__scrubber-thumb js-scrubber-thumb"></div>
          <input type="range" class="manim-player__scrubber-input js-scrubber" min="0" max="100" value="0" step="0.01">
        </div>
      </div>
      <div class="manim-player__btn-row">
        <button class="manim-player__btn manim-player__btn--accent js-btn-play" title="Play / Pause (Space)">
          <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
            <path d="M0 0 L10 6 L0 12 Z" />
          </svg>
        </button>
        <button class="manim-player__btn js-btn-replay" title="Restart">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 7A6 6 0 1 0 3.5 2.5" />
            <path d="M1 1v4h4" />
          </svg>
        </button>
        <span class="manim-player__time-current js-time-current">0.00s</span>
        <div class="manim-player__spacer"></div>
        <span class="manim-player__time-total js-time-total">0.00s</span>
      </div>
    `;

    const statusbar = document.createElement('div');
    statusbar.className = 'manim-player__statusbar';

    let statusHTML = `
      <div class="manim-player__status-pill">
        <div class="manim-player__status-dot manim-player__status-dot--ready js-status-dot"></div>
        <span class="js-status-text">ready</span>
      </div>
      <div class="manim-player__status-pill">
        <span class="manim-player__kbd">Space</span> play/pause &nbsp; <span class="manim-player__kbd">R</span> restart
      </div>
    `;

    if (this.options.showExport) {
      statusHTML += `
        <div class="manim-player__status-right">
          <select class="manim-player__select js-fps-select" title="Export FPS">
            <option value="24">24 FPS</option>
            <option value="30" selected>30 FPS</option>
            <option value="60">60 FPS</option>
          </select>
          <select class="manim-player__select js-res-select" title="Export Resolution">
            <option value="960x540">960p</option>
            <option value="1920x1080">1080p</option>
            <option value="3840x2160">4K</option>
          </select>
          <button class="manim-player__export-btn js-btn-export" title="Export frames as PNG sequence">Export Frames</button>
          <span class="manim-player__export-progress js-export-progress"></span>
        </div>
      `;
    } else {
      statusHTML += `
        <div class="manim-player__status-right">
          <div class="manim-player__status-pill">960 × 540</div>
        </div>
      `;
    }

    statusbar.innerHTML = statusHTML;

    this.container.appendChild(this.canvasContainer);
    this.container.appendChild(controls);
    this.container.appendChild(statusbar);

    // ✅ All lookups scoped to this.container — no global getElementById
    this.els = {
      canvasContainer: this.canvasContainer,
      scrubber:      this._q<HTMLInputElement>('.js-scrubber'),
      scrubberFill:  this._q<HTMLDivElement>('.js-scrubber-fill'),
      scrubberThumb: this._q<HTMLDivElement>('.js-scrubber-thumb'),
      playBtn:       this._q<HTMLButtonElement>('.js-btn-play'),
      replayBtn:     this._q<HTMLButtonElement>('.js-btn-replay'),
      timeCurrent:   this._q<HTMLSpanElement>('.js-time-current'),
      timeTotal:     this._q<HTMLSpanElement>('.js-time-total'),
      statusText:    this._q<HTMLSpanElement>('.js-status-text'),
    };

    if (this.options.showExport) {
      this.els.fpsSelect     = this._q<HTMLSelectElement>('.js-fps-select');
      this.els.resSelect     = this._q<HTMLSelectElement>('.js-res-select');
      this.els.exportBtn     = this._q<HTMLButtonElement>('.js-btn-export');
      this.els.exportProgress = this._q<HTMLSpanElement>('.js-export-progress');
    }
  }

  private _bindEvents(): void {
    this.els.scrubber.addEventListener('input', (e) => {
      const duration = this.scene?.scheduler?.totalDuration ?? 0;
      if (duration <= 0) return;
      const seekTime = (+((e.target as HTMLInputElement).value) / 100) * duration;
      this.scene.pause?.();
      this.scene.seek?.(seekTime);
      this._setPlaying(false);
    });

    this.els.scrubber.addEventListener('change', (e) => {
      const duration = this.scene?.scheduler?.totalDuration ?? 0;
      if (duration <= 0) return;
      const seekTime = (+((e.target as HTMLInputElement).value) / 100) * duration;
      this.scene.pause?.();
      this.scene.seek?.(seekTime);
    });

    this.els.playBtn.addEventListener('click', () => {
      if (this.isPlaying) {
        this.scene.pause?.();
        this._setPlaying(false);
      } else {
        const scheduler = this.scene?.scheduler;
        if (scheduler && scheduler.clock >= scheduler.totalDuration) {
          this.scene.seek(0);
        }
        scheduler?.play();
        this._setPlaying(true);
      }
    });

    this.els.replayBtn.addEventListener('click', () => {
      this.scene.seek?.(0);
      this.scene?.scheduler?.play();
      this._setPlaying(true);
    });

    if (this.options.showExport) {
      this.els.exportBtn?.addEventListener('click', () => this._handleExport());
    }

    if (this.options.keyboardShortcuts) {
      document.addEventListener('keydown', (e) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        if (e.code === 'Space') {
          e.preventDefault();
          this.els.playBtn.click();
        }
        if (e.key.toLowerCase() === 'r') {
          this.els.replayBtn.click();
        }
      });
    }
  }

  private _setupSceneHooks(): void {
    const scheduler = this.scene?.scheduler;
    if (!scheduler) {
      console.warn('ManimPlayer: Scene scheduler not available');
      return;
    }

    scheduler.onComplete = () => {
      this._setPlaying(false);
      this.els.statusText.textContent = 'done';
    };

    const originalOnFrameReady = scheduler.onFrameReady?.bind(scheduler);
    scheduler.onFrameReady = () => {
      originalOnFrameReady?.();
      this._syncScrubber();
    };
  }

  private _syncScrubber(): void {
    const scheduler = this.scene?.scheduler;
    if (!scheduler) return;
    const clock = scheduler?.clock ?? 0;
    const duration = Math.max(scheduler?.totalDuration ?? 1, 0.01);
    const pct = (clock / duration) * 100;

    this.els.scrubberFill.style.width = pct + '%';
    this.els.scrubberThumb.style.left = pct + '%';
    this.els.timeCurrent.textContent = clock.toFixed(2) + 's';
    this.els.timeTotal.textContent = duration.toFixed(2) + 's';

    if (document.activeElement !== this.els.scrubber) {
      this.els.scrubber.value = pct.toString();
    }
  }

  private _setPlaying(playing: boolean): void {
    this.isPlaying = playing;

    const playIcon  = `<svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><path d="M0 0 L10 6 L0 12 Z"/></svg>`;
    const pauseIcon = `<svg width="11" height="12" viewBox="0 0 11 12" fill="currentColor"><rect x="0" y="0" width="3.5" height="12" rx="1"/><rect x="7.5" y="0" width="3.5" height="12" rx="1"/></svg>`;

    this.els.playBtn.innerHTML = playing ? pauseIcon : playIcon;
    this.els.statusText.textContent = playing ? 'playing' : 'paused';
  }

  private _moveCanvas(): void {
    const tryMoveCanvas = (): boolean => {
      const canvas = (this.scene as any)?.canvas;
      if (canvas instanceof HTMLCanvasElement && canvas.parentElement !== this.canvasContainer) {
        this.canvasContainer.appendChild(canvas);
        return true;
      }
      return false;
    };

    if (tryMoveCanvas()) return;

    setTimeout(() => {
      if (!tryMoveCanvas()) {
        console.warn('ManimPlayer: Could not find scene canvas');
      }
    }, 100);
  }

  private async _handleExport(): Promise<void> {
    const canvas = (this.scene as any)?.canvas;
    if (!canvas) return;

    const fps = parseInt(this.els.fpsSelect?.value ?? '30', 10);
    const resValue = this.els.resSelect?.value ?? '960x540';
    const [width, height] = resValue.split('x').map(v => parseInt(v, 10));
    const wasPlaying = this.isPlaying;

    this.scene.pause?.();
    this._setPlaying(false);
    if (this.els.exportBtn) this.els.exportBtn.disabled = true;
    this.els.exportProgress?.classList.add('manim-player__export-progress--active');

    try {
      const frames = await this.exporter.exportAnimation(
        this.scene,
        canvas,
        { fps, width, height, filenamePrefix: 'frame' },
        (progress: { currentFrame: number; totalFrames: number }) => {
          if (this.els.exportProgress) {
            this.els.exportProgress.textContent = `Frame ${progress.currentFrame}/${progress.totalFrames}`;
          }
        }
      );

      if (this.els.exportProgress) {
        this.els.exportProgress.textContent = 'Saving ZIP...';
      }
      await this.exporter.downloadAsZip(frames, 'frame');
      this.els.statusText.textContent = 'exported';
    } catch (err) {
      console.error('Export failed:', err);
      this.els.statusText.textContent = 'export failed';
    } finally {
      if (this.els.exportBtn) this.els.exportBtn.disabled = false;
      this.els.exportProgress?.classList.remove('manim-player__export-progress--active');
      if (this.els.exportProgress) this.els.exportProgress.textContent = '';
      if (wasPlaying) {
        this.scene?.scheduler?.play();
        this._setPlaying(true);
      }
    }
  }

  play(): void {
    this.scene?.scheduler?.play();
    this._setPlaying(true);
  }

  pause(): void {
    this.scene.pause?.();
    this._setPlaying(false);
  }

  seek(time: number): void {
    this.scene.seek?.(time);
    this._syncScrubber();
  }

  destroy(): void {
    this.container.innerHTML = '';
    this.container.classList.remove('manim-player');
  }
}