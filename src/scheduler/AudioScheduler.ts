/**
 * AudioScheduler — Wraps AudioManager and syncs to Scheduler clock.
 * Provides seek() for audio position sync and word-level bookmarks for TTS.
 */

import type { Scheduler } from './Scheduler';

export interface AudioClip {
  id: string;
  src: string;
  startTime: number;
  duration: number;
  volume?: number;
}

export interface TTSSegment {
  text: string;
  startTime: number;
  wordTimings: Array<{ word: string; start: number; end: number }>;
}

export class AudioScheduler {
  private _scheduler: Scheduler;
  private _audioContext: AudioContext | null = null;
  private _activeSources = new Map<string, AudioBufferSourceNode>();
  private _clips: AudioClip[] = [];
  private _ttsSegments: TTSSegment[] = [];
  private _gainNodes = new Map<string, GainNode>();

  constructor(scheduler: Scheduler) {
    this._scheduler = scheduler;
    this._initAudioContext();

    // Sync to scheduler seek
    const originalSeek = scheduler.seek.bind(scheduler);
    scheduler.seek = (t: number) => {
      originalSeek(t);
      this._syncAudioToClock(t);
    };
  }

  private _initAudioContext(): void {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this._audioContext = new AudioContext();
    }
  }

  /**
   * Add an audio clip to be played at a specific time.
   */
  addClip(clip: AudioClip): void {
    this._clips.push(clip);
  }

  /**
   * Add TTS segment with word-level timing.
   */
  addTTSSegment(segment: TTSSegment): void {
    this._ttsSegments.push(segment);
    // Create bookmarks for each word
    for (const word of segment.wordTimings) {
      this._scheduler.addBookmark(`tts:${segment.text}:${word.word}`, segment.startTime + word.start);
    }
  }

  /**
   * Get current word being spoken at scheduler clock time.
   */
  getCurrentWordAtTime(t: number): { segment: string; word: string; progress: number } | null {
    for (const segment of this._ttsSegments) {
      const segmentEnd = segment.startTime + Math.max(...segment.wordTimings.map(w => w.end));
      if (t >= segment.startTime && t <= segmentEnd) {
        const localT = t - segment.startTime;
        const currentWord = segment.wordTimings.find(w => localT >= w.start && localT <= w.end);
        if (currentWord) {
          const wordProgress = (localT - currentWord.start) / (currentWord.end - currentWord.start);
          return { segment: segment.text, word: currentWord.word, progress: wordProgress };
        }
      }
    }
    return null;
  }

  /**
   * Load audio buffer from URL.
   */
  async loadAudio(url: string): Promise<AudioBuffer> {
    if (!this._audioContext) {
      throw new Error('AudioContext not available');
    }
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return this._audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Play audio immediately (for testing) or schedule it.
   */
  playNow(url: string, volume = 1): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const buffer = await this.loadAudio(url);
        this._playBuffer(buffer, volume, () => resolve());
      } catch (e) {
        reject(e);
      }
    });
  }

  private _playBuffer(buffer: AudioBuffer, volume: number, onEnded?: () => void): string {
    if (!this._audioContext) {
      throw new Error('AudioContext not available');
    }

    const source = this._audioContext.createBufferSource();
    const gainNode = this._audioContext.createGain();

    source.buffer = buffer;
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(this._audioContext.destination);

    const id = crypto.randomUUID();
    this._activeSources.set(id, source);
    this._gainNodes.set(id, gainNode);

    if (onEnded) {
      source.onended = () => {
        onEnded();
        this._activeSources.delete(id);
        this._gainNodes.delete(id);
      };
    }

    source.start();
    return id;
  }

  /**
   * Sync all audio to scheduler clock time.
   * Called automatically when scheduler.seek() is called.
   */
  private _syncAudioToClock(t: number): void {
    // Stop any currently playing audio that's outside the current time
    for (const [id, source] of this._activeSources) {
      source.stop();
      this._activeSources.delete(id);
      this._gainNodes.delete(id);
    }

    // Restart clips that should be playing at this time
    for (const clip of this._clips) {
      if (t >= clip.startTime && t < clip.startTime + clip.duration) {
        // Would need to implement offset playback for proper seeking
        // For now, we stop and let clips restart from their natural time
      }
    }
  }

  /**
   * Pause all audio playback.
   */
  pause(): void {
    if (this._audioContext?.state === 'running') {
      this._audioContext.suspend();
    }
  }

  /**
   * Resume audio playback.
   */
  resume(): void {
    if (this._audioContext?.state === 'suspended') {
      this._audioContext.resume();
    }
  }

  /**
   * Stop all audio and clear clips.
   */
  reset(): void {
    for (const [id, source] of this._activeSources) {
      try {
        source.stop();
      } catch { /* ignore */ }
    }
    this._activeSources.clear();
    this._gainNodes.clear();
    this._clips = [];
    this._ttsSegments = [];
  }

  /**
   * Check if audio is currently playing.
   */
  get isPlaying(): boolean {
    return this._audioContext?.state === 'running';
  }

  /**
   * Get current audio time (for sync verification).
   */
  get currentTime(): number {
    return this._audioContext?.currentTime ?? 0;
  }
}
