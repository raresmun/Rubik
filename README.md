# Cubul lui Erik

Romanian 3×3 cube learning PWA for Erik: interactive 3D solving, a verified starter CFOP course, and guided physical-cube practice.

## Run

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Node 22+ is recommended. Production output is `dist/`. No environment variables, account, database server, or live AI service are required.

## Implemented

- **Învață cu mine:** 18 lessons, including optional notation, five F2L situations, cross planning, starter two-look OLL/PLL, lookahead, and a complete nine-stage guided CFOP solve. Demonstrations are separate from practice. Goals inspect cube state and accept alternative solutions.
- **Rezolvă singur:** legal 20-move scrambles, a three-move practice option, touch face turns, large button alternatives, separate camera orbit, undo/redo, verified live-state solver hints in a worker, optional timer, and real solved-state detection.
- **Cu cubul meu:** solved-cube setup, fixed holding orientation, explicit move confirmation, inverse-move undo instructions, and recovery without pretending to observe a physical cube.
- **Romanian narration:** 88 bundled MP3 clips (approximately 12.2 minutes, 5.14 MB), subtitles, replay, mute and slower playback. A detected Romanian device voice is a fallback only. See [audio documentation](docs/AUDIO.md).
- **Local progress:** versioned IndexedDB, exact move history and redo restoration, independent/assisted attempts, separate physical/virtual records, and validated parent-gated JSON backup/import.
- **Offline/PWA:** generated service worker caches code, solver worker, fonts, icons, lessons and audio. Updates wait until explicitly accepted in the parent area. Local progress is never stored in the service-worker cache.
- Responsive layouts with iOS safe areas, touch handling, reduced motion, WebGL fallback, and platform-specific installation instructions.

## Architecture

| Area | Files |
| --- | --- |
| Cube engine and validation | `src/cube/engine.ts` |
| Kociemba solver worker | `src/cube/solver.ts`, `solver.worker.ts` |
| Three.js geometry and interaction | `src/components/CubeScene.tsx`, `src/cube/geometry.ts` |
| Original Romanian curriculum | `src/content/lessons.ts` |
| Audio player and offline clips | `src/lib/audio.ts`, `public/audio/` |
| IndexedDB and backup validation | `src/lib/storage.ts` |
| Interaction transitions | `src/lib/interaction.ts` |
| PWA lifecycle | `src/lib/offline.ts`, `vite.config.ts` |
| Screens and design | `src/App.tsx`, `src/styles.css` |

cubejs 1.3.2 provides cubie mechanics and Kociemba solving. It is a stable older library, not presented as a newly maintained dependency. The renderer is independently checked against its facelet transformations and known fixtures. General solver assistance is explicitly labeled as move assistance, not invented CFOP coaching.

## Installation

- **Android / Chrome:** open the HTTPS application, use **⋮ → Install app / Add to Home screen**.
- **iPhone / iPad / Safari:** open the HTTPS application, use **Share → Add to Home Screen**, enabling **Open as Web App** if shown.
- **Desktop Chrome / Edge:** use the install icon in the address bar, or simply use the browser.
- Open **Pentru părinți → Verifică pachetul offline** while online before travelling. Cache availability is checked against every included audio file and required app resources. Browsers can evict storage; an exported backup is recommended.

Progress is local to each browser/install. It does **not** automatically sync between devices. Installed iOS web apps can have storage separate from Safari. Export/import progress as needed. The parent gate is a simple arithmetic confirmation, not authentication or encryption.

## Vercel

`vercel.json` specifies the Vite build, `dist/` output, SPA navigation rewrites and service-worker headers. Import `raresmun/Rubik` into the authorized Vercel account using the repository root. No secrets are required. Use a public production deployment so the child does not need a Vercel login. Confirm HTTPS, all audio/assets, `/lessons` reload, service-worker registration, and offline launch after deployment.

See [verification report](docs/TESTING.md) for what has actually been tested and what remains unverified. Do not interpret responsive CSS or simulated DOM tests as real Android/iOS device verification.

## Curriculum and assets

[Curriculum and primary sources](docs/CURRICULUM.md) · [Audio generation and attribution](docs/AUDIO.md) · [Original detailed brief](APP_PROMPT.md)

All interface text and lesson explanations are original Romanian copy. No third-party teaching videos or copyrighted instructional illustrations are bundled. Full PLL/OLL catalogs and finger-position illustrations are future course expansions, clearly labeled in the app; ZBLL is outside the starter course.
