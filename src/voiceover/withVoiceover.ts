import type { Scheduler } from '../scheduler/Scheduler';

export interface VoiceoverClip {
  audio_path: string;
  bookmarks: Record<string, number>;
  duration: number;
  text_clean: string;
  offset: number;
  endTime: number;
}

export async function withVoiceover(
  scheduler: Scheduler,
  scripts: string[],
  { serviceUrl = 'http://localhost:8000' }: { serviceUrl?: string } = {}
): Promise<VoiceoverClip[]> {

  // Capture originals ONCE before any patching
  const origPlay       = scheduler.play.bind(scheduler);
  const origPause      = scheduler.pause.bind(scheduler);
  const origSeek       = scheduler.seek.bind(scheduler);
  const origReset      = scheduler.reset.bind(scheduler);
  const origFrameReady = scheduler.onFrameReady?.bind(scheduler);

  const clips: VoiceoverClip[] = [];
  const allAudios: Array<{ audio: HTMLAudioElement; offset: number; endTime: number }> = [];
  let offset = 0;

  for (const text of scripts) {
    const vo = await fetch(`${serviceUrl}/voiceover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).then(r => r.json());

    for (const [name, t] of Object.entries(vo.bookmarks as Record<string, number>)) {
      scheduler.addBookmark(name, t + offset);
    }

    const clipOffset = offset;
    const endTime    = clipOffset + vo.duration;
    const audio      = new Audio(`${serviceUrl}${vo.audio_path}`);

    allAudios.push({ audio, offset: clipOffset, endTime });
    clips.push({
      audio_path: vo.audio_path,
      bookmarks:  vo.bookmarks,
      duration:   vo.duration,
      text_clean: vo.text_clean,
      offset:     clipOffset,
      endTime,
    });

    offset = endTime;
  }

  // Patch scheduler ONCE after all clips are collected
  scheduler.play = () => {
    origPlay();
  };

  scheduler.pause = () => {
    for (const { audio } of allAudios) audio.pause();
    origPause();
  };

  scheduler.seek = (t: number) => {
    for (const { audio, offset, endTime } of allAudios) {
      if (t >= offset && t < endTime) {
        audio.currentTime = t - offset;
      } else {
        audio.pause();
        audio.currentTime = 0;
      }
    }
    origSeek(t);
  };

  scheduler.reset = () => {
    for (const { audio } of allAudios) {
      audio.pause();
      audio.currentTime = 0;
    }
    scheduler.play       = origPlay;
    scheduler.pause      = origPause;
    scheduler.seek       = origSeek;
    scheduler.reset      = origReset;
    scheduler.onFrameReady = origFrameReady ?? undefined;
    origReset();
  };

  // Clock-based audio sync on every frame
  scheduler.onFrameReady = () => {
    origFrameReady?.();
    for (const { audio, offset, endTime } of allAudios) {
      const t = scheduler.clock;
      if (t >= offset && t < endTime) {
        const target = t - offset;
        if (Math.abs(audio.currentTime - target) > 0.15) audio.currentTime = target;
        if (audio.paused && scheduler.isPlaying) audio.play().catch(() => {});
      } else {
        if (!audio.paused) audio.pause();
      }
    }
  };

  return clips;
}
