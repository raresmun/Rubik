import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { narration, recordedText } from '../src/lib/audio';

class FakeAudio {
  static latest: FakeAudio;
  src = '';
  preload = '';
  playbackRate = 1;
  preservesPitch = true;
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  constructor() { FakeAudio.latest = this; }
}
class FakeUtterance {
  lang = '';
  voice: unknown;
  rate = 1;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}
const synthesis = { getVoices: vi.fn(() => [] as unknown[]), speak: vi.fn(), cancel: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  synthesis.getVoices.mockReturnValue([]);
  vi.stubGlobal('window', { speechSynthesis: synthesis });
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
});
afterEach(() => { narration.stop(); vi.unstubAllGlobals(); });

describe('Romanian narration ownership', () => {
  it('plays bundled speech and replay cancels the preceding voice', async () => {
    const text = recordedText('welcome');
    expect(text).toBeTruthy();
    const first = narration.speak(text!, 'welcome');
    const second = narration.speak(text!, 'welcome', true);
    expect(await first).toBe('cancelled');
    expect(FakeAudio.latest.playbackRate).toBe(0.78);
    expect(FakeAudio.latest.preservesPitch).toBe(true);
    expect(FakeAudio.latest.src).toContain('/audio/welcome-');
    FakeAudio.latest.onended?.();
    expect(await second).toBe('ended');
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it('stop always settles the outstanding promise', async () => {
    const playback = narration.speak(recordedText('welcome')!, 'welcome');
    narration.stop();
    expect(await playback).toBe('cancelled');
    expect(FakeAudio.latest.pause).toHaveBeenCalled();
  });

  it('never uses a stale clip or an English voice for missing Romanian text', async () => {
    synthesis.getVoices.mockReturnValue([{ lang: 'en-US', name: 'English' }]);
    expect(await narration.speak('Un text nou, care nu are înregistrare.', 'welcome')).toBe('unavailable');
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it('allows a detected Romanian fallback and cancels it before another step', async () => {
    const voice = { lang: 'ro-RO', name: 'Romanian' };
    synthesis.getVoices.mockReturnValue([voice]);
    const playback = narration.speak('Un text nou în română.');
    const utterance = synthesis.speak.mock.calls.at(-1)![0] as FakeUtterance;
    expect(utterance.voice).toBe(voice);
    expect(utterance.lang).toBe('ro-RO');
    narration.stop();
    expect(await playback).toBe('cancelled');
    expect(synthesis.cancel).toHaveBeenCalled();
  });
});
