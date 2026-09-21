# Verification report

## Passed in this implementation session

- **114 automated tests across 6 files.**
- **57 engine/curriculum tests:** known facelet fixtures, inverse and half turns, legal/illegal state validation, all 18 lesson setups and goals, all nine guided CFOP stage checkpoints, alternative solutions, actual local solver output, stale worker isolation, and highlights that follow the intended physical pieces.
- **21 geometry tests:** all rendered face-turn permutations match the cube engine on scrambled states, including clockwise/inverse/half-turn direction and gesture interpretation.
- **11 persistence tests:** IndexedDB snapshots, backup round trip, valid cubie parity/orientation, history consistency, unknown modes/phases/lessons, stage bounds, and exact demo/physical resume state.
- **4 audio tests:** single-player cancellation, exact recorded-text lookup, Romanian-only fallback, and replay ownership.
- **3 interaction tests:** synchronous move locking, old animation timers, and authoritative undo/redo history.
- **18 React DOM integration tests:** independent R R alternative to R2; demonstration/replay cannot create achievements; free solve completion; undo/redo; guided-stage demonstration and explicit reset; alternate valid cross followed by live-state hints; stale async hints; physical acknowledgements/recovery; reload/redo resume; parent import confirmation and malformed backup rejection; cancellation when switching modes during a demo; direct nested-route reload; browser Back/Forward; late-start, paused, resumed, and uninterrupted timer classification; and a native backup download link that refreshes to the latest data and releases obsolete Blob URLs.
- TypeScript production build.
- All 88 MP3 streams decoded successfully; 12.2 minutes of generated Romanian narration, approximately 5.14 MB.
- Production artifact inspection confirms every narration clip, solver worker, renderer, fonts, manifest and application assets is included in the precache manifest.

The React integration tests mock the canvas renderer, audio playback, offline registration and storage I/O. Engine/content and backup validation remain real. They do **not** establish visual quality, browser offline behavior, autoplay behavior or device compatibility.

## Verified on public production

Public URL: **https://rubik-taupe.vercel.app/**. The user imported the repository into Vercel; subsequent commits were pushed to `main` and deployed automatically. Vercel reported successful deployments and GitHub CI passed. The public application was opened in a browser without a GitHub or Vercel login.

- HTTP 200 for `/`, `/lessons`, `/physical`, `/practice`, `/progress`, `/parents`, manifest and service worker. All **114 distinct resources in the deployed precache manifest** were fetched successfully, including every one of the 88 narration clips. The current production manifest, rather than stale local build files, was used for the resource list.
- Actual browser reload of `/practice` preserved the exact 54-facelet state and redo availability after undo. `/lessons` also reloaded successfully and displayed the full curriculum.
- Narrated F2L demonstration completed, kept learner moves at zero, and required an explicit practice reset. Reset restored the exact original state.
- An unexpected move produced current-state solver assistance, clearly distinguished from CFOP explanation. Following it completed the lesson and recorded **Cu ajutor**.
- A pointer swipe changed the displayed cube; undo restored the exact state. View-mode dragging preserved cube state. The three-move free-solve exercise completed with **Prin practică**, and completion survived reload.
- Physical mode waited for **Am făcut** before changing its model. Recovery explained real-cube orientation, inverse moves and the limits of a virtual reset.
- The parent area reported a fully cached offline package. An available update waited for explicit acceptance, reloaded successfully and retained progress.
- Actual JSON backup downloads were found in the browser's synchronized download directory, parsed successfully, and imported through the native file chooser. Import required confirmation and restored the completed lesson and progress. The browser's download-event observer timed out even though files downloaded; file existence/content and successful import provided the evidence instead.
- Desktop and CSS viewports of 390×844, 768×1024 and 1024×768 were visually reviewed. Refinements improved the no-WebGL cube, mobile caption clearance, landscape control reach and native Safari-friendly download interaction. See [screenshots](SCREENSHOTS.md).

## Browser and device limits

These are **Chrome cloud-browser checks and CSS viewport simulation**, not actual Android, iPhone or iPad tests. The test browser disables WebGL. Screenshots therefore show the precise interactive **CSS3D fallback**; its moves update immediately. The primary Three.js renderer's face transformations are covered by geometry tests, but its actual GPU appearance and layer animations were not visually tested here. Expected WebGL-context failures and browser-extension logging were observed; no other app runtime failure was found in the exercised flows.

Offline resource caching was verified in the real browser. **A network-disconnected launch was not tested** because the provided browser controls did not expose a network-offline switch. No claim is made that a cache check alone establishes airplane-mode behavior.

Still to verify on real devices:

1. iPhone/iPad Safari and Android Chrome home-screen installation, safe areas, changing browser toolbars, portrait/landscape and touch cancellation/multi-touch.
2. Recorded Romanian audio listening quality, first-tap autoplay, mute/replay/slow playback and interruptions on both platforms.
3. Installed-app launch, narration and worker hints in airplane mode, storage persistence/eviction, and OS file-picker backup/import.
4. The primary WebGL renderer and layer animations with actual device GPU/browser combinations.

## Known product boundaries

- General hints use a verified Kociemba solver. They are explicitly presented as move assistance, not claimed to explain CFOP.
- Physical practice is self-reported, including physical guided-solve records. The app has no camera/smart-cube detection.
- Full OLL/PLL catalogs and illustrated finger technique are future curriculum, not clickable empty lessons.
- No automatic cross-device sync. Browser storage can be evicted; export/import is available behind a simple parent arithmetic gate.
- Generated Romanian narration is bundled, but no actual-device listening review has been claimed.
