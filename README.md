# Cubul lui Erik

A Romanian-language Rubik’s Cube learning app for Android phones and tablets.

## Project status

This repository currently contains the product brief and implementation prompt. The app has not been implemented yet.

## Planned experience

- **Învață cu mine:** spoken Romanian tutorials with accurate 3D demonstrations, hands-on practice, and feedback.
- **Rezolvă singur:** solve a complete interactive cube with touch controls, undo, and hints based on the current cube state.
- **Cu cubul meu:** follow lessons with a physical cube, with explicit setup and recovery guidance.
- A polished, child-friendly interface designed for both phone and tablet.
- Automatic local progress saving, resumable solves, and downloadable offline lessons and audio.

## Implementation brief

Read [APP_PROMPT.md](./APP_PROMPT.md) for the complete requirements, curriculum, visual direction, architecture, and acceptance checks.

To begin with a coding assistant:

> Read APP_PROMPT.md and implement the application described there. Follow its requirements for interactive solving, Romanian instruction, visual quality, offline support, and verification. Report any missing assets or capabilities honestly.

## Proposed stack

React, TypeScript, Vite, Tailwind, a verified cube-state/rendering library, and IndexedDB in an installable PWA. Confirm library APIs and suitability during implementation.

Supabase is not required for the initial version. Progress is stored on each device, with backup/import for manual transfer; automatic cross-device sync can be added later.
