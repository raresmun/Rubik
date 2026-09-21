# Curriculum and cube correctness

This is a complete **starter course**, written in original Romanian for a child already solving with a beginner method. It includes 18 working activities, including a complete, deliberately prepared CFOP example. It does not claim to cover every last-layer case.

## Implemented activities

| Lesson ID | Learning objective | State-based completion |
| --- | --- | --- |
| `orientare` | Fixed center colors; camera versus face turns (optional) | Whole cube solved |
| `notatie` | Prime and double turns; two quarter turns are valid (optional) | Whole cube solved |
| `f2l-pereche` | Insert a connected corner-edge pair | Entire first two layers correct |
| `f2l-separate` | Join initially separated pieces | Entire first two layers correct |
| `f2l-colt-prins` | Extract a corner twisted in its slot | Entire first two layers correct |
| `f2l-alb-sus` | Handle a white-up corner beside its edge | Entire first two layers correct |
| `f2l-stanga` | Transfer insertion to the left slot | Entire first two layers correct |
| `cruce-priveste` | Plan a last cross edge before turning | Four white edges, including side colors, correct |
| `cruce-plan` | Plan a three-move cross | Four white edges, including side colors, correct |
| `oll-linie` | Orient top edges from the horizontal line | F2L preserved and top edges oriented |
| `oll-l` | Orient top edges from the back-left L | F2L preserved and top edges oriented |
| `oll-sune` | Recognize and orient Sune corners | F2L preserved and whole top oriented |
| `oll-antisune` | Distinguish the opposite corner-twist case | F2L preserved and whole top oriented |
| `pll-colturi` | Place top corners using T | F2L and orientation preserved; top corners correctly placed |
| `pll-ua` | Cycle three top edges | Whole cube solved |
| `pll-ub` | Distinguish the reverse edge cycle | Whole cube solved |
| `lookahead` | Notice the second pair while inserting the first | Entire first two layers correct |
| `rezolvare-ghidata` | Connect all four CFOP stages | Nine cumulative checkpoints, then whole cube solved |

The guided solve has a real cross, four individual F2L slots, edge orientation, corner orientation, corner permutation, and edge permutation. Its reproducible setup is the inverse of the complete verified solution. This intentionally selected teaching scramble is not a random competition scramble. Each checkpoint is tested to be unmet before its moves and met afterward, while preserving all earlier checkpoints at the end of the stage.

## Teaching contract

- Fixed reference: yellow U, red R, green F, white D, orange L, blue B. Hold **yellow up, white down, green front, red right**. A clockwise turn is judged looking directly at the turned face, including bottom/back faces.
- Content uses only the 18 outer-face turns. Camera orbit never changes facelet state, notation, or physical holding instructions. Wide/slice/whole-cube notation is intentionally outside these starter exercises.
- Every activity has narration/subtitles, explanation, a reproducible setup, a verified demonstration, a recognition hint, encouragement, piece highlights, and a state predicate. Audio uses the exact content strings.
- All F2L activities preserve the cross; the first four F2L cases have the other three pairs already solved. Their end predicates require all first two layers so destroying an already solved pair cannot count as success.
- Assessment checks resulting pieces and orientations, not the typed algorithm. An extra U turn after an F2L solution is valid. A different move sequence reaching the same goal is valid. A demonstration is an assisted viewing event, not an independent successful attempt.
- A goal-valid alternative can leave a different next case in the full guided solve. Later scripted moves are safe only when the exact live state matches the verified route. The UI must either continue from a verified current route, offer an explicit return to the example checkpoint, or label generic solver help honestly. It must never apply stale next-stage instructions silently.
- Physical work is self-reported. Undo on a physical cube requires performing the inverse move. A virtual reset never changes the child's real cube. If the real position is unknown, solve using the familiar beginner method and perform the reproducible setup again.
- New F2L techniques may initially slow a solve. The short lessons prioritize recognition and understanding. Lookahead is a slow observation drill; it does not prescribe speed or promise a time target.

## Implemented versus future curriculum

This release introduces two-look OLL and PLL through specific cases; it does **not** include all algorithms necessary to handle every possible last-layer position using only the taught cases. The child can continue using the familiar beginner method for unlearned cases or use the app's explicitly labeled generic move assistance.

T, Ua, and Ub are also real cases in full PLL. Later expansion should add the remaining two-look cases first, then gradually the remaining full PLL and full OLL cases with their own recognition lessons, verified setups, audio and independent practice. No empty lessons or fake mastery should represent that future work. Finger-trick illustrations are not implemented by a rotating cube. ZBLL is outside the initial course.

## Engine and solver implementation

`src/cube/engine.ts` wraps **cubejs 1.3.2**, an MIT-licensed cubie model. The authoritative saved state is a 54-character URFDLB facelet string. The main-thread engine imports only the cubie model. The complete two-phase solver runs in a bundled module worker so table calculation does not block touch input.

`validateState` checks length, characters, fixed centers, exactly nine stickers of each color, facelet round-trip, unique physical cubies, corner twist sum, edge flip sum, and matching corner/edge parity. Invalid imports cannot reach the solver.

`lessonContinuation` walks the verified demonstration route and returns a suffix only for an exact state match. `solveState` accepts an explicit snapshot, validates the returned continuation against that same snapshot, and publishes only a verified solution. Request IDs isolate concurrent answers; canceling rejects obsolete promises and ignores late worker results. The UI also compares the snapshot with its live state before displaying or applying a hint. The generic Kociemba solver is **move assistance**, not a CFOP teaching explanation or a shortest-solution guarantee.

Scrambles are legal random sequences with no consecutive turns on the same axis. They are not described as WCA random-state scrambles. Whole-cube solved detection uses actual canonical state, independent of camera angle.

## Verification

`tests/engine.test.ts` covers published fixed facelet fixtures, move laws, serialization, history/undo/redo, all exercise setups and end states, real F2L case differences, narrated OLL patterns, preserved pieces, alternative valid solutions, impossible imported cubes, every guided checkpoint, changed-state solver results and stale-worker isolation. These complement renderer geometry, persistence and browser tests.

The fixed facelet fixtures are from the upstream cubejs test specification. Their expected strings are stored literally rather than obtained from the runtime operation being tested. Round-trip tests alone would not establish move convention correctness.

## Primary references

Verified during implementation. These sources informed the sequence and technical checks; the Romanian lesson wording and app diagrams are original. No third-party videos or illustrations are copied into the app.

- [CubeSkills: F2L](https://www.cubeskills.com/tutorials/f2l) — transition from beginner solving to pairing a corner and edge; designed for roughly one-minute beginner solvers.
- [CubeSkills: 4 Look Last Layer](https://www.cubeskills.com/tutorials/4-look-last-layer) — two-look OLL and two-look PLL as intermediate learning.
- [CubeSkills: Intermediate Cross and F2L](https://www.cubeskills.com/tutorials/intermediate-cross-and-f2l) — slower practice, planning, pair efficiency and lookahead.
- [CubeSkills: 2 Look Last Layer](https://www.cubeskills.com/tutorials/2-look-last-layer) — gradual learning of full OLL/PLL after the earlier stages.
- [J Perm: CFOP](https://jperm.net/3x3/cfop) — stage goals and the distinction between edge/corner orientation and permutation; initial slowdown with new F2L is normal.
- [J Perm: Move Notation](https://jperm.net/3x3/moves) — clockwise viewed directly at the face, prime, half turn, camera versus actual cube rotation.
- [J Perm: Two-look OLL](https://jperm.net/algs/2look/oll) and [Two-look PLL](https://jperm.net/algs/2look/pll) — case reference/training resources.
- [cubejs official repository and API](https://github.com/ldez/cubejs) — `fromString`, `asString`, `move`, `inverse`, `initSolver`, `solve`, URFDLB ordering and MIT license.
- [cubejs test specifications](https://github.com/ldez/cubejs/blob/master/spec/cube.spec.coffee) — static facelet fixtures.
