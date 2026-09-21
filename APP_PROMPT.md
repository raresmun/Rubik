# Build “Cubul lui Erik”

Build an exceptionally beautiful, working Romanian-language Rubik’s Cube learning app for my primary-school-age son Erik. He already solves a normal 3×3 cube using a beginner method in about one minute. Help him progress toward confident, efficient CFOP solving while keeping learning enjoyable. He must be able to learn and fully solve an interactive 3D cube inside the app on an Android tablet or phone, with an additional mode for practising on his real cube.

Implement the actual application, not just a design or landing page. Prioritise correct teaching, clear speech, accurate interactive cube mechanics, extremely simple interaction, and excellent visual design. The central experience is: watch a demonstration → make the moves himself inside the app → receive helpful feedback → try independently → optionally practise on his physical cube. In-app solving is a required core feature, not a future enhancement or animation-only demo. Do not promise world-class results or pressure him to achieve particular times.

## 1. Platform and architecture

- Build a responsive, installable PWA for Android Chrome, supporting tablet and phone, portrait and landscape. Also support desktop browsers.
- Use React, TypeScript, Vite, and Tailwind, or adapt to the existing project's equivalent stack.
- Use a maintained cube library such as cubing.js for legal cube states, notation, and animation. Check current official APIs and licensing before choosing dependencies; do not invent APIs or create a decorative cube with incorrect moves.
- Verify separately that the selected libraries support interactive move input and solving from the current state. An animation player alone does not satisfy this brief. Implement missing interaction explicitly and use an appropriate verified solver where needed. Bundle required code and solver assets for offline practice; run expensive work away from the main UI thread.
- Save progress locally in IndexedDB. No Supabase, account, subscription, or live AI API is required for the initial version.
- Keep lesson content, cube logic, audio playback, and persistence separate so content and optional cloud sync can be added later.
- Use a web app manifest, service worker, HTTPS deployment instructions, and an explicit download option for offline lesson packs, including their audio and assets.

## 2. A child can understand the interface immediately

- All child-facing text and narration must be natural, simple Romanian with correct diacritics. Use short sentences and explain technical words visually.
- The home screen has one dominant button: „Continuă”. Show three simple destinations: „Învață cu mine”, „Rezolvă singur”, and „Cu cubul meu”. Put the optional timer within practice, and setup, backups, and detailed settings in „Pentru părinți”. Do not hide the playable cube behind several menus.
- Use large touch targets, ideally at least 56 CSS pixels for main controls, readable type, strong contrast, generous spacing, and no hover-only actions.
- Show one teaching idea and one main action at a time. Avoid long paragraphs, dense menus, algorithm walls, and unnecessary scrolling during a lesson.
- Use a friendly, polished visual style that respects his existing ability. Keep decorative motion subtle; do not interrupt teaching with confetti or rewards.
- Label buttons with words and icons. Always make replay, help, and home easy to find. Support muted audio, subtitles, and reduced motion.
- Let a parent quickly choose a starting level and test the voice; let Erik skip concepts he already understands.

### Visual direction: a premium, playful learning app

Make the app feel delightful and carefully designed from the first screen. Establish a consistent design system before implementing the screens, then carry it through navigation, teaching, solving, loading, offline states, and celebrations.

- Use a warm off-white background, deep navy text, a confident blue primary accent, and restrained teal highlights. Let the cube's six distinct colours be the main colourful element; preserve their identity under lighting and selection effects.
- Use a rounded, highly legible typeface supporting Romanian diacritics, a clear type scale, generous whitespace, rounded surfaces, subtle depth, and a consistent icon family. Bundle font assets for offline use or provide good system fallbacks.
- Render a beautiful tactile 3D cube with slightly bevelled cubies, clean separations, soft lighting, and a subtle ground shadow. Keep stickers easy to distinguish. Avoid glare, excessive bloom, transparent faces, or effects that hide the pieces being taught.
- Create a welcoming home screen with a prominent resume card, an attractive cube visual, and a small learning journey. The lesson screen should centre on a spacious cube stage, one short instruction, a speaker/replay control, and one primary next action. Free solve should give the cube maximum space and keep tools in a simple bottom tray.
- On tablets in landscape, place the cube beside a concise coaching panel. On phones and portrait tablets, stack the cube above the instruction and reachable controls. Keep the active lesson usable without vertical scrolling at supported sizes.
- Add refined pressed states, responsive touch feedback, smooth move easing, and brief, optional completion celebrations. Celebrate after an achievement; keep attention on the cube while explaining or practising. Respect reduced motion.
- Aim for smooth cube interaction on a typical Android tablet. Reduce decorative effects before compromising input reliability, text readability, or accurate moves. Measure performance and do not claim a frame rate without testing.
- Give all screens deliberate spacing and visual hierarchy. Avoid a generic dashboard, a wall of cards, tiny controls, decorative charts, and a marketing-page layout.

Visual quality is an acceptance requirement. Render and inspect the actual implemented home, guided lesson, free-solve, help, and completion screens at phone and tablet sizes. Fix awkward spacing, clipping, unreadable text, obstructed cube faces, and inconsistent styling before delivery. Beautiful static screenshots alone do not satisfy the functional requirements.

## 3. Teach from his current level

Use short, roughly 3–5-minute activities with this learning loop: watch → understand → perform the moves on the in-app cube → try independently → optionally repeat on a physical cube → revisit later.

Provide a coherent path through:
1. Optional notation and cube-holding refresher, including face turns versus whole-cube rotations.
2. Intuitive F2L: find a matching corner and edge, pair them, then insert them. Explain why moves work.
3. Simple cross planning and fewer unnecessary rotations.
4. Two-look OLL and two-look PLL, introduced one case at a time.
5. Gradual full PLL, then full OLL, alongside efficient F2L, finger tricks, and lookahead practice.

Build a substantial, fully working starter course: at least 10 short lessons spanning orientation, several genuinely different intuitive F2L situations, cross practice, and an introduction to two-look last-layer solving. Make each lesson complete with setup, narration, animation, hands-on virtual-cube practice, and independent practice. Include at least one complete guided solve that connects the stages from a supplied scramble to a solved cube. Clearly distinguish later curriculum from implemented lessons; never show fake completion or empty lesson buttons. Keep ZBLL outside the initial course.

Explain gently that a new technique may initially make solves slower. Recommend practice based on difficulty and recent attempts, using simple local rules. Do not mark a case mastered just because he watched it; use successful independent attempts across sessions. Physical-cube success is self-reported.

## 4. Accurate, interactive visual instruction

- Make the cube the main lesson visual. Highlight the relevant pieces and destination slot, and dim irrelevant details where useful. Pair colour with outlines, labels, or other cues.
- Provide „Arată-mi”, „Mai încet”, „Repetă”, „Înapoi un pas”, and „Am reușit!”. Keep advanced controls secondary.
- Animate a single legal move at a time, show its direction clearly, and highlight the matching notation. Introduce notation gradually, alongside plain Romanian explanations.
- Keep a stable teaching viewpoint, show the required front and top centre colours, and explain clockwise turns relative to looking directly at the turned face.
- Keep camera movement separate from actual whole-cube rotations. Provide a simple way back to the teaching view.
- Use one authoritative cube state and lesson-step model for diagrams, arrows, animation, narration, undo, and saved progress. Never let these drift apart.
- For finger tricks, include a clear hand/finger illustration if implemented; a rotating cube alone does not demonstrate finger placement.

### Required mode A: „Învață cu mine” — guided in-app tutorials

Every core lesson must be playable. Show the correct starting case automatically on the virtual cube. Narrate a short explanation in Romanian, highlight the pieces, and demonstrate the relevant move or short sequence. Then return to the exact practice starting state and let Erik perform it himself. Make the transition from watching to doing explicit with „Acum încearcă tu”. Do not count demonstrated moves as his practice attempts.

Observe his actual virtual moves and evaluate the intended goal using cube state. In a one-move exercise, preview the target face and direction, then gently coach an unexpected move. In open practice, accept any legal sequence that achieves the lesson goal; a different valid solution is not an error. If he leaves the supported teaching path, explain the situation and offer undo or a visible reset to the exercise checkpoint. Do not pretend a scripted next move is still appropriate.

Offer layered help: „Un indiciu” highlights what to notice; „Arată următoarea mișcare” previews the next action; „Arată-mi” demonstrates the current step. Keep demonstrations distinct from the child's attempt. If a demonstration needs to change state, show that transition clearly and provide a retry from the checkpoint. Reduce guidance gradually and distinguish assisted attempts from independent successes.

### Required mode B: „Rezolvă singur” — solve a whole cube inside the app

- Provide a fully playable 3×3 cube. „Amestecă” creates a legal scramble; Erik can then solve the entire cube through manual moves. Include easier practice states with fewer moves as a separate, clearly labelled option.
- Allow intuitive face turns by dragging on the cube. Provide an equally usable alternative: tap a face and use large clockwise/counterclockwise turn buttons, with an optional half-turn control. Do not require reading notation or precise gestures to play.
- Distinguish turning a layer from looking around the cube. Provide an explicit „Privește cubul” view mode or an equally unambiguous interaction, with „Revino la vedere” to restore the reference view. Display a short, visual first-use gesture tutorial.
- Keep input reliable during animations: use a controlled move queue or briefly block input visibly; never lose, duplicate, or apply moves in the wrong order. Handle cancelled touches and prevent unwanted page scrolling only in the appropriate interaction area.
- Provide „Ajutor”, „Înapoi”, redo, reset to the current scramble, and a new scramble. Confirm actions that discard an unfinished attempt. Record the scramble and move history so undo, replay, and resume are exact.
- Compute hints from the actual live cube state and current orientation, including after arbitrary legal moves, undo, and reload. Invalidate an old hint whenever the state changes. Every proposed continuation must be verified as applicable.
- Prefer understandable CFOP stage goals and small explanations: what to find, what to preserve, and what to do next. A raw shortest-solution algorithm is not an educational explanation. If using a generic solver as fallback, present it explicitly as move assistance rather than claiming it teaches CFOP; never invent a teaching explanation for an unverified move.
- Work locally without an AI chat service. Avoid long, unexplained solution dumps. Speak and animate one hint at a time, and return control to him.
- Detect completion from the actual cube state, regardless of viewing orientation. Mark a solve complete only when all pieces are solved. Celebrate briefly, show „Ai reușit!”, and offer „Mai încearcă” or the next lesson.
- Save an unfinished solve automatically and restore it with its move history. Keep virtual solve times separate from real-cube times, since touchscreen speed and hand-solving speed are different activities.

### Required mode C: „Cu cubul meu” — transfer the skill to his real cube

Use the same explanations and demonstrations with explicit physical-cube setup and self-confirmation as described below. Switching from virtual practice should offer a setup flow, not assume his physical cube matches the on-screen state. The app must remain fully useful without a physical cube, while encouraging real-cube practice for finger technique and speed.

## 5. Make practising with a real cube work

This is essential: the app cannot see his real cube. Do not pretend to detect physical moves or automatically verify a real solve. No camera scanning or smart-cube dependency in the initial version.

Each exercise must offer a reproducible setup from a solved cube, demonstrated one move at a time. Show „Ține cubul ca în imagine” and confirm the orientation before starting. For algorithm drills, a verified inverse algorithm may create the case. Every setup must match the displayed starting state exactly.

Include a prominent „Cubul meu arată altfel” recovery option. Help him check orientation, replay the last move, or restart. Going back must demonstrate the inverse move he needs to make physically; resetting the virtual cube alone cannot reset his real cube. If his actual state is unknown, offer to solve it using his familiar method and set up the exercise again. Never prescribe imaginary corrective moves.

When resuming physical-cube mode, restore the demonstration state and ask whether his physical cube still matches before continuing. Offer setup/restart when it does not. In virtual modes, use the recorded cube state to verify his moves and results automatically; do not ask him to self-confirm information the app can already evaluate.

## 6. Romanian speech that teaches

- Provide warm, clear Romanian narration for every core lesson step, with matching visible text. Speak explanations, not just notation letters.
- Prefer recorded or pre-generated Romanian audio bundled into downloadable lesson packs. No live AI calls should be needed to play lessons.
- Browser speech synthesis may be a fallback only after detecting an available Romanian voice. Do not assume every Android device has one or that it works offline. Never silently substitute English.
- Include a parent voice test. If audio assets or a Romanian voice are missing, show an honest status and keep visual/text teaching usable; do not claim audio is complete.
- Start sound after the user's first tap. Synchronise speech with the highlighted pieces and move playback through explicit lesson steps. Wait for „Am făcut” during guided physical practice; do not advance on a timer.
- In guided virtual practice, wait for his actual on-screen move or the lesson's goal state, then give feedback. When he changes the cube, cancel any narration that no longer matches its state. Use approved short Romanian audio clips for recurring move prompts and hint templates so common interactive feedback also works offline.
- Replay repeats the explanation without accidentally applying the move twice. Cancel old audio when changing steps. Prevent overlapping voices and provide mute and slower playback.
- Use precise examples such as „Uite colțul și muchia. Le unim, apoi le punem aici.” Accompany directional instructions with arrows and a clear viewpoint.
- If generating audio requires unavailable tools or credentials, complete the audio integration and scripts, report exactly what remains, and never embed private API keys in the frontend.

## 7. Remember his place automatically

Autosave the active mode, lesson, step, reproducible cube state, current scramble, virtual move/undo history, learned cases, assisted and independent attempts, review schedule, separate virtual/physical timer history, and preferences after meaningful actions. Persist completed move transitions consistently so an interruption during animation cannot corrupt the saved cube. After closing and reopening on the same browser/device, „Continuă” must restore his place.

Use a versioned IndexedDB schema with safe migrations and request persistent storage where supported. Handle storage refusal or failure without crashing. Explain in the parent area that clearing browser data can remove local progress and that phone/tablet do not automatically share it.

Provide validated JSON export/import for backup and manual device transfer, with confirmation before replacing existing progress. Preserve learning progress during app updates. Offline packs should show actual download/availability status, not promise that uncached content works offline.

Design a clean storage interface for optional future parent-controlled Supabase sync, but do not implement cloud accounts or require backend setup now.

## 8. Encouraging practice and a simple timer

Offer „Exersează 5 minute”, a gentle progress path, and small rewards for practice and understanding. No ads, public leaderboards, social features, punitive streaks, or mandatory countdowns.

The optional timer must be easy to start/stop with large touch controls and let a parent correct accidental results. Show recent times and personal bests without making speed the only measure of improvement. Keep timing out of first exposure to new cases. Persist timer/session state and define interruption behaviour explicitly: pause learning/practice activity when backgrounded; mark a timed solve interrupted if it cannot fairly continue, and do not count it as an unassisted personal best.

## 9. Verify before calling it finished

Check current primary sources such as CubeSkills and J Perm for teaching accuracy; write original Romanian explanations and respect media licences. Store source references with the lesson content in developer/parent documentation.

Test the concrete failure risks: every exercise setup and solution produces the intended state and preserves required solved pieces; inverse moves undo correctly; resume restores the exact lesson position and unfinished virtual solve; replay never repeats a turn unintentionally; narration and animation remain aligned; backup/import works; cached lessons work offline; missing Romanian voices have a usable fallback; and phone/tablet controls do not overlap or require precision tapping.

Additionally verify the required virtual-solve experience: manually complete a whole scrambled cube using touch or the large turn controls; distinguish camera gestures from face turns; test rapid and cancelled inputs; check undo/redo and restart; verify hints from changed states and different orientations; accept alternative valid solutions; prevent demonstrations from inflating mastery; and detect a genuinely solved state rather than relying on a button press or a fixed move count. Include known cube-state fixtures so a faulty renderer and faulty validator cannot simply agree with each other. Inspect real rendered screens for the visual requirements above.

Deliver the runnable app with all three modes, a fully playable virtual cube, complete starter lessons, actual audio assets where available, installation instructions, screenshots of the implemented phone and tablet experience, and a concise report of what was verified and any remaining limitations. Clearly distinguish real-device testing from browser emulation. Make sensible implementation decisions and finish the working experience without stopping at a plan or mockup.