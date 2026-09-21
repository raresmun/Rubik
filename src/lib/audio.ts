import audioManifest from '../../public/audio/manifest.json';

export type AudioResult = 'ended' | 'cancelled' | 'unavailable';
export type AudioStatus = { kind: 'recorded' | 'romanian-voice' | 'unavailable'; message: string };
type Clip = { key: string; text: string; src: string; duration: number };
const clips = audioManifest.files as Clip[];
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

export function audioAssets(): string[] { return clips.map(clip => clip.src); }
export function recordedText(key: string): string | undefined { return clips.find(clip => clip.key === key)?.text; }

/** A single player owns both prerecorded and browser audio. No component can overlap it. */
class RomanianNarration {
  private player: HTMLAudioElement | undefined;
  private finish: ((result: AudioResult) => void) | undefined;
  private utterance: SpeechSynthesisUtterance | undefined;
  private generation = 0;
  private failedAssets = new Set<string>();

  private voice(): SpeechSynthesisVoice | undefined {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
    return window.speechSynthesis.getVoices().find(voice => /^ro(?:[-_]|$)/i.test(voice.lang));
  }

  status(): AudioStatus {
    if (clips.length && this.failedAssets.size < clips.length) return { kind: 'recorded', message: 'Voce română inclusă. Funcționează offline după descărcarea aplicației.' };
    if (this.voice()) return { kind: 'romanian-voice', message: 'Voce română a dispozitivului. Disponibilitatea offline depinde de dispozitiv.' };
    return { kind: 'unavailable', message: 'Vocea română nu este disponibilă. Poți urma toate explicațiile scrise.' };
  }

  available(): boolean { return this.status().kind !== 'unavailable'; }

  /** Must be triggered by a user action. Replay calls this only; it never turns the cube. */
  speak(text: string, key?: string, slow = false): Promise<AudioResult> {
    this.stop();
    const generation = this.generation;
    if (typeof window === 'undefined') return Promise.resolve('unavailable');
    const normalized = normalize(text);
    const clip = clips.find(clip => clip.key === key && normalize(clip.text) === normalized)
      ?? clips.find(clip => normalize(clip.text) === normalized);
    return new Promise(resolve => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      let settled = false;
      let fallbackStarted = false;
      const finish = (result: AudioResult) => {
        if (settled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        if (this.finish === finish) this.finish = undefined;
        if (this.player) { this.player.onended = null; this.player.onerror = null; }
        if (this.utterance) { this.utterance.onend = null; this.utterance.onerror = null; }
        resolve(result);
      };
      this.finish = finish;
      const fallback = () => {
        if (generation !== this.generation) return finish('cancelled');
        if (fallbackStarted || settled) return;
        fallbackStarted = true;
        const voice = this.voice();
        if (!voice || typeof SpeechSynthesisUtterance === 'undefined') return finish('unavailable');
        const utterance = new SpeechSynthesisUtterance(text);
        this.utterance = utterance;
        utterance.lang = 'ro-RO';
        utterance.voice = voice;
        utterance.rate = slow ? 0.72 : 0.94;
        utterance.onend = () => finish('ended');
        utterance.onerror = event => finish(event.error === 'canceled' || event.error === 'interrupted' ? 'cancelled' : 'unavailable');
        try { window.speechSynthesis.speak(utterance); } catch { finish('unavailable'); }
      };
      // A failed media request must not leave a lesson awaiting audio indefinitely.
      timeout = setTimeout(() => {
        if (generation !== this.generation) return finish('cancelled');
        this.player?.pause();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        finish('unavailable');
      }, Math.max(20_000, (clip?.duration ?? text.length / 9) * (slow ? 1.5 : 1) * 1000 + 12_000));
      if (!clip || this.failedAssets.has(clip.src)) return fallback();
      try {
        // Reuse the same media element after the first tap, including on Safari.
        this.player ??= new Audio();
        const player = this.player;
        player.preload = 'auto';
        player.src = clip.src;
        player.playbackRate = slow ? 0.78 : 1;
        player.preservesPitch = true;
        player.onended = () => finish('ended');
        player.onerror = () => { this.failedAssets.add(clip.src); fallback(); };
        player.play().catch(error => {
          if (generation !== this.generation) return finish('cancelled');
          // Autoplay refusal is not evidence that the bundled asset is missing.
          if (error instanceof DOMException && error.name === 'NotAllowedError') return finish('unavailable');
          this.failedAssets.add(clip.src);
          fallback();
        });
      } catch { fallback(); }
    });
  }

  stop(): void {
    this.generation += 1;
    if (this.player) {
      this.player.pause();
      this.player.onended = null;
      this.player.onerror = null;
      try { this.player.currentTime = 0; } catch { /* Not loaded yet. */ }
    }
    if (this.utterance) { this.utterance.onend = null; this.utterance.onerror = null; }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    this.finish?.('cancelled');
    this.utterance = undefined;
  }
}

export const narration = new RomanianNarration();
