# Romanian narration

The app ships real, pre-generated Romanian MP3 speech. It does not call a speech API at runtime, require a key, or upload anything spoken by the child. The matching subtitle text and asset metadata are stored in `public/audio/manifest.json`. All recordings use the Piper `ro_RO-mihai-medium` Romanian voice, generated locally at a slightly deliberate pace. This is synthetic speech, not a human voice recording.

Every starter lesson explanation, lesson hint and notice, all nine guided-solve step explanations, and all eighteen outer-face move instructions have a clip. Shared welcome, voice test, success, physical setup/recovery, and encouragement clips are also provided. The app's service worker caches the files for offline use; successful download/cache verification is required before promising offline availability.

## Playback contract

- `narration.speak(text, key?, slow?)` returns a promise: `ended`, `cancelled`, or `unavailable`.
- It matches exact normalized subtitle text, never a stale key with different text.
- The first playback must start from a user gesture. One reused HTML audio element avoids overlapping recordings and supports subsequent Safari playback. Reduced speed preserves pitch.
- `narration.stop()` cancels both recorded playback and browser synthesis and resolves pending playback promises. Call it whenever the current cube/step/mode changes or mute is selected.
- A lesson demonstration must wait for a narration promise before its corresponding animation, and must cancel the demonstration when the result is `cancelled`. Unavailable audio leaves all written teaching usable.
- Replay invokes audio only. It must never invoke a cube move.
- Browser speech is a fallback only if `speechSynthesis.getVoices()` actually contains a Romanian `ro`/`ro-RO` voice. English is never substituted. Browser voice availability and offline support vary by device.
- Audio has no microphone permission or recording feature.

## Regenerate recordings

Generation dependencies are not frontend dependencies. Use Linux with libseccomp, Python `piper-tts==1.8.0`, and FFmpeg on the generation machine. The generator denies all socket/connect/send system calls before importing ONNX Runtime, verifies that socket creation fails, and also disables ONNX telemetry. No network access is possible during synthesis. Download the ONNX model and matching JSON into a directory outside the repository:

- [Romanian model and configuration](https://huggingface.co/rhasspy/piper-voices/tree/main/ro/ro_RO/mihai/medium)
- [Voice model card](https://huggingface.co/rhasspy/piper-voices/blob/main/ro/ro_RO/mihai/medium/MODEL_CARD)
- [Piper project](https://github.com/OHF-Voice/piper1-gpl)

```sh
python3 -m venv .audio-venv
.audio-venv/bin/pip install piper-tts==1.8.0
PIPER_PYTHON=.audio-venv/bin/python node scripts/generate-audio.mjs --model /path/to/ro_RO-mihai-medium.onnx
```

The Node script loads the actual lesson and move description sources through Vite, exporting exact Romanian subtitle scripts. ONNX Runtime telemetry is explicitly disabled before model creation. Python loads the model once, generates speech, encodes mono MP3 at 56 kbps, verifies duration with ffprobe, and writes a manifest. Filenames contain text hashes so wording changes cannot silently reuse old recordings. Existing matching clips can be reused. `--force` regenerates all clips. Do not commit `.audio-venv`, ONNX weights, temporary WAV files, or credentials.

## Attribution and limits

The voice model card identifies the Romanian training dataset as CC0 and credits [OHF Voice datasets](https://github.com/OHF-Voice/voice-datasets). Piper is a generation-time tool; its executable and the voice weights are not bundled in the app. Audio assets were synthesized from original Romanian app text. The source model is medium quality: names, letter notation and inflection should receive native-speaker listening review before claiming studio-level narration. All 88 MP3 files (5.14 MB) pass full FFmpeg decoding. Automated unit checks cover single-player cancellation, recorded replay, exact subtitle matching, and Romanian-only fallback. Actual iPhone/iPad/Android speaker output still needs real-device listening review.
