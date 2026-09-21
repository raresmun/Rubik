# Verification report

## Passed in this implementation session

- **113 automated tests across 6 files.**
- **57 engine/curriculum tests:** known facelet fixtures, inverse and half turns, legal/illegal state validation, all 18 lesson setups and goals, all nine guided CFOP stage checkpoints, alternative solutions, actual local solver output, stale worker isolation, and highlights that follow the intended physical pieces.
- **21 geometry tests:** all rendered face-turn permutations match the cube engine on scrambled states, including clockwise/inverse/half-turn direction and gesture interpretation.
- **11 persistence tests:** IndexedDB snapshots, backup round trip, valid cubie parity/orientation, history consistency, unknown modes/phases/lessons, stage bounds, and exact demo/physical resume state.
- **4 audio tests:** single-player cancellation, exact recorded-text lookup, Romanian-only fallback, and replay ownership.
- **3 interaction tests:** synchronous move locking, old animation timers, and authoritative undo/redo history.
- **17 React DOM integration tests:** independent R R alternative to R2; demonstration/replay cannot create achievements; free solve completion; undo/redo; guided-stage demonstration and explicit reset; alternate valid cross followed by live-state hints; stale async hints; physical acknowledgements/recovery; reload/redo resume; parent import confirmation and malformed backup rejection; cancellation when switching modes during a demo; direct nested-route reload; browser Back/Forward; and late-start, paused, resumed, and uninterrupted timer classification.
- TypeScript production build.
- All 88 MP3 streams decoded successfully; 12.2 minutes of generated Romanian narration, approximately 5.14 MB.
- Production artifact inspection confirms every narration clip, solver worker, renderer, fonts, manifest and application assets is included in the precache manifest.

The React integration tests mock the canvas renderer, audio playback, offline registration and storage I/O. Engine/content and backup validation remain real. They do **not** establish visual quality, browser offline behavior, autoplay behavior or device compatibility.

## Still requires production/browser/device verification

The session's cloud browser rejected the local HTTP preview. Local-file preview is prohibited by its security policy; no workaround was used. Therefore screenshots and a real rendered visual review have **not** yet been completed.

The Vercel plugin connection was confirmed during the session. Its connected guidance exposes inspection workflows; publishing was attempted through the Vercel website. The secure login flow reached Google sign-in and still requires an authenticated Vercel browser session. This report does not claim a successful production deployment.

Remaining checks after a public HTTPS deployment:

1. Verify root and `/lessons` reload, all JavaScript/font/audio/icon responses, manifest, and service worker.
2. Inspect home, lesson, free solve, help, completion and parent screens at phone/tablet portrait/landscape sizes. Capture actual screenshots.
3. Run a full solve with touch gestures and buttons; rapidly tap and cancel a drag; orbit the cube and check hints/undo.
4. Test Romanian playback after first tap in Safari and Chrome, mute/replay/slow controls, and background interruption.
5. Verify first download, offline launch, recorded audio and local worker hints without network access.
6. On actual iPhone/iPad Safari and Android Chrome, install to home screen and check safe areas, browser toolbar changes, touch scrolling and persistent storage. Browser simulation must be reported separately from actual devices.
7. Verify export/import using each device's actual file/download picker.

## Known product boundaries

- General hints use a verified Kociemba solver. They are explicitly presented as move assistance, not claimed to explain CFOP.
- Physical practice is self-reported, including physical guided-solve records. The app has no camera/smart-cube detection.
- Full OLL/PLL catalogs and illustrated finger technique are future curriculum, not clickable empty lessons.
- No automatic cross-device sync. Browser storage can be evicted; export/import is available behind a simple parent arithmetic gate.
- Generated Romanian narration is bundled, but no actual-device listening review has been claimed.
