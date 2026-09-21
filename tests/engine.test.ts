import { afterEach, describe, expect, it, vi } from 'vitest';
import Cube from 'cubejs';
import {
  applyMoves, CORNER_FACELETS, EDGE_FACELETS, FACES, goalReached, inverse, isSolved,
  lessonContinuation, parseMoves, pieceFacelets, scramble, SOLVED, validateState,
} from '../src/cube/engine';
import { ALGORITHMS, guidedLesson, lessons, lessonCheckpoint, lessonStage, lessonStageCount, lessonStageContinuation, lessonStagePrefix, lessonHighlights } from '../src/content/lessons';

// Published, fixed facelet fixtures from cubejs's upstream specification;
// not obtained by running the algorithm and its inverse in this test.
const FIXTURES = [
  ['U', 'UUUUUUUUUBBBRRRRRRRRRFFFFFFDDDDDDDDDFFFLLLLLLLLLBBBBBB'],
  ["U R F' L'", 'DURRUFRRRBRBDRBDRBFDDDFFDFFBLLBDBLDLFUUFLLFLLULRUBUUBU'],
] as const;

describe('authoritative cube mechanics', () => {
  it.each(FIXTURES)('matches independent fixed facelets for %s', (alg, expected) => {
    expect(applyMoves(SOLVED, alg)).toBe(expected);
    expect(validateState(expected)).toBe(true);
  });
  it('preserves the fixed URFDLB centers and sticker counts through all 18 turns', () => {
    for (const face of FACES) for (const suffix of ['', "'", '2']) {
      const result = applyMoves(SOLVED, face + suffix);
      expect(validateState(result)).toBe(true);
      FACES.forEach((center, index) => expect(result[index * 9 + 4]).toBe(center));
    }
  });
  it.each(FACES)('%s follows quarter-turn group laws', face => {
    expect(applyMoves(SOLVED, `${face} ${face} ${face} ${face}`)).toBe(SOLVED);
    expect(applyMoves(SOLVED, `${face} ${face}`)).toBe(applyMoves(SOLVED, face + '2'));
    expect(applyMoves(SOLVED, `${face} ${face}'`)).toBe(SOLVED);
  });
  it('rejects unsupported or ambiguous notation instead of silently ignoring it', () => {
    for (const move of ['foo', 'r', 'x', 'M', 'R3', 'R2\'', 'R U html']) expect(() => applyMoves(SOLVED, move)).toThrow();
    expect(parseMoves('  R U\nF2  ')).toEqual(['R', 'U', 'F2']);
    expect(applyMoves(SOLVED, '')).toBe(SOLVED);
  });
  it('supports exact move-by-move history, undo and redo', () => {
    const moves = parseMoves("R U F2 L' B D2");
    const history = [SOLVED];
    for (const move of moves) history.push(applyMoves(history.at(-1)!, move));
    for (let i = moves.length - 1; i >= 0; i--) {
      expect(applyMoves(history[i + 1], inverse(moves[i]))).toBe(history[i]);
      expect(applyMoves(history[i], moves[i])).toBe(history[i + 1]);
    }
    expect(JSON.parse(JSON.stringify(history))).toEqual(history);
    expect(isSolved(history.at(-1)!)).toBe(false);
  });
  it('generates legal outer-face scrambles without adjacent turns of the same axis', () => {
    const axis: Record<string, number> = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 };
    for (let trial = 0; trial < 24; trial++) {
      const moves = parseMoves(scramble(20));
      expect(moves).toHaveLength(20);
      for (let i = 1; i < moves.length; i++) expect(axis[moves[i][0]]).not.toBe(axis[moves[i - 1][0]]);
      expect(validateState(applyMoves(SOLVED, moves))).toBe(true);
    }
  });
});

describe('state and backup input safety', () => {
  function change(mutator: (stickers: string[]) => void): string { const stickers = [...SOLVED]; mutator(stickers); return stickers.join(''); }
  it('rejects malformed strings, wrong counts, and moved centers', () => {
    expect(validateState(null)).toBe(false);
    expect(validateState(SOLVED.slice(1))).toBe(false);
    expect(validateState('U'.repeat(54))).toBe(false);
    expect(validateState(change(s => { [s[4], s[13]] = [s[13], s[4]]; }))).toBe(false);
  });
  it('rejects an impossible single edge flip', () => {
    expect(validateState(change(s => { [s[5], s[10]] = [s[10], s[5]]; }))).toBe(false);
  });
  it('rejects an impossible single corner twist', () => {
    expect(validateState(change(s => { [s[8], s[9], s[20]] = [s[20], s[8], s[9]]; }))).toBe(false);
  });
  it('rejects parity errors even when colors and all cubies exist', () => {
    expect(validateState(change(s => { [s[10], s[19]] = [s[19], s[10]]; }))).toBe(false);
  });
  it('rejects duplicate cubies and illegal application origins', () => {
    const corrupt = change(s => { [s[0], s[15]] = [s[15], s[0]]; });
    expect(validateState(corrupt)).toBe(false);
    expect(() => applyMoves(corrupt, 'U')).toThrow();
  });
});

describe('complete curriculum and state-based assessment', () => {
  it('contains at least twelve complete, uniquely identified starter activities', () => {
    expect(lessons.length).toBeGreaterThanOrEqual(13);
    expect(new Set(lessons.map(lesson => lesson.id)).size).toBe(lessons.length);
    for (const lesson of lessons) {
      for (const field of ['title', 'subtitle', 'category', 'duration', 'explanation', 'hint', 'notice', 'setup', 'solution'] as const) expect(lesson[field].length).toBeGreaterThan(0);
      expect(lesson.highlight.length).toBeGreaterThan(0);
      expect(lesson.highlight.every(index => index >= 0 && index < 54)).toBe(true);
    }
  });
  it.each(lessons)('$id has a legal reproducible setup, unmet start goal, and verified solution', lesson => {
    const start = applyMoves(SOLVED, lesson.setup);
    expect(validateState(start)).toBe(true);
    expect(goalReached(start, lesson.goal)).toBe(false);
    const end = applyMoves(start, lesson.solution);
    expect(goalReached(end, lesson.goal)).toBe(true);
    expect(end).toBe(SOLVED);
  });
  it('contains genuinely different F2L cases rather than only mirrored insertions', () => {
    const get = (id: string) => Cube.fromString(applyMoves(SOLVED, lessons.find(item => item.id === id)!.setup));
    const ready = get('f2l-pereche');
    expect(ready.cp.indexOf(4)).toBe(1); expect(ready.ep.indexOf(8)).toBe(1); // joined at UFL / UF
    const separated = get('f2l-separate');
    expect(separated.cp.indexOf(4)).toBe(0); expect(separated.ep.indexOf(8)).toBe(3); // UFR / UB
    const trapped = get('f2l-colt-prins');
    expect(trapped.cp[4]).toBe(4); expect(trapped.co[4]).not.toBe(0); // corner twisted in the slot
    const whiteUp = get('f2l-alb-sus');
    expect(whiteUp.cp[0]).toBe(4); expect(whiteUp.co[0]).toBe(0); // white on U
  });
  it('matches the narrated OLL recognition patterns', () => {
    const state = (id: string) => applyMoves(SOLVED, lessons.find(item => item.id === id)!.setup);
    const line = state('oll-linie');
    expect([3, 4, 5].every(index => line[index] === 'U')).toBe(true);
    expect([1, 7].every(index => line[index] !== 'U')).toBe(true);
    const ell = state('oll-l');
    expect([1, 3, 4].every(index => ell[index] === 'U')).toBe(true);
    expect([5, 7].every(index => ell[index] !== 'U')).toBe(true);
    for (const [id, yellowCorner] of [['oll-sune', 6], ['oll-antisune', 2]] as const) {
      const current = state(id);
      expect([0, 2, 6, 8].filter(index => current[index] === 'U')).toEqual([yellowCorner]);
    }
  });
  it('preserves cross and other pairs in every F2L case', () => {
    for (const lesson of lessons.filter(item => item.category === 'F2L')) {
      const state = applyMoves(SOLVED, lesson.setup);
      expect(goalReached(state, 'cross')).toBe(true);
      if (lesson.id !== 'f2l-stanga' && lesson.id !== 'lookahead') {
        expect(goalReached(state, { type: 'pieces', corners: [5, 6, 7], edges: [9, 10, 11] })).toBe(true);
      }
    }
  });
  it('accepts alternative move sequences and allows an unsolved last layer for an F2L goal', () => {
    const lesson = lessons.find(item => item.id === 'f2l-pereche')!;
    const start = applyMoves(SOLVED, lesson.setup);
    const alternative = applyMoves(start, `U U' ${lesson.solution} U2`);
    expect(alternative).not.toBe(SOLVED);
    expect(goalReached(alternative, lesson.goal)).toBe(true);
    expect(goalReached(applyMoves(alternative, 'R'), lesson.goal)).toBe(false);
    const notation = lessons.find(item => item.id === 'notatie')!;
    expect(goalReached(applyMoves(applyMoves(SOLVED, notation.setup), 'R R'), notation.goal)).toBe(true);
  });
  it('does not accept just a white cross shape with wrong side colors', () => {
    expect(goalReached(applyMoves(SOLVED, 'D'), 'cross')).toBe(false);
    expect(goalReached(applyMoves(SOLVED, 'U'), 'cross')).toBe(true);
  });
  it('preserves F2L for every last layer algorithm and orientations for every PLL', () => {
    for (const key of ['ollLine', 'ollL', 'sune', 'antiSune', 'tPerm', 'uaPerm', 'ubPerm'] as const) {
      const state = applyMoves(SOLVED, ALGORITHMS[key]);
      expect(goalReached(state, 'f2l')).toBe(true);
      if (key.endsWith('Perm')) expect(goalReached(state, 'oll')).toBe(true);
    }
  });
  it('uses actual CFOP checkpoints in its full guided solve', () => {
    let state = applyMoves(SOLVED, guidedLesson.setup);
    const achieved: typeof guidedLesson.goal[] = [];
    expect(guidedLesson.steps!.length).toBe(9);
    for (const step of guidedLesson.steps!) {
      expect(goalReached(state, step.goal)).toBe(false);
      state = applyMoves(state, step.moves);
      expect(goalReached(state, step.goal)).toBe(true);
      for (const prior of achieved) expect(goalReached(state, prior)).toBe(true);
      achieved.push(step.goal);
    }
    expect(state).toBe(SOLVED);
  });
  it('tracks highlighted pieces after moves instead of assuming fixed sticker positions', () => {
    const state = applyMoves(SOLVED, 'R U');
    const cube = Cube.fromString(state);
    expect(pieceFacelets(state, [4], [8])).toEqual([...CORNER_FACELETS[cube.cp.indexOf(4)], ...EDGE_FACELETS[cube.ep.indexOf(8)]]);
  });
});

describe('current-state hints', () => {
  it('returns only the remaining verified script from the exact current state', () => {
    const lesson = lessons.find(item => item.id === 'f2l-pereche')!;
    const state = applyMoves(SOLVED, lesson.setup);
    expect(lessonContinuation(state, lesson.setup, lesson.solution)).toEqual(parseMoves(lesson.solution));
    const moved = applyMoves(state, 'R');
    expect(lessonContinuation(moved, lesson.setup, lesson.solution)).toEqual(["U'", "R'"]);
    expect(lessonContinuation(applyMoves(moved, 'F'), lesson.setup, lesson.solution)).toBeNull();
    expect(lessonContinuation(applyMoves(moved, "R'"), lesson.setup, lesson.solution)).toEqual(parseMoves(lesson.solution));
  });
  it('solves and independently verifies changed live positions with the local solver', () => {
    Cube.initSolver();
    for (const algorithm of ["R U R' F2", "R U R' F2 B' L D2", "D2 L' B F2 R U' R'", "F R U R' U' F' U R2 B2 L2 D2"]) {
      const state = applyMoves(SOLVED, algorithm);
      const continuation = parseMoves(Cube.fromString(state).solve());
      expect(isSolved(applyMoves(state, continuation))).toBe(true);
    }
  }, 45000);
});

describe('solver message isolation', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });
  class FakeWorker {
    static last: FakeWorker;
    onmessage?: (event: { data: unknown }) => void;
    onerror?: () => void;
    requests: { id: number; state: string }[] = [];
    constructor() { FakeWorker.last = this; }
    postMessage(data: { id: number; state: string }) { this.requests.push(data); }
    terminate() { /* no-op */ }
    reply(data: unknown) { this.onmessage?.({ data }); }
  }
  it('cancels obsolete promises and ignores late answers', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const { solveState, cancelSolverRequests } = await import('../src/cube/solver');
    const first = solveState(applyMoves(SOLVED, 'R'));
    const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    const [oldRequest] = FakeWorker.last.requests;
    cancelSolverRequests();
    await rejected;
    const second = solveState(applyMoves(SOLVED, 'U'));
    FakeWorker.last.reply({ ...oldRequest, moves: ["R'"] });
    const currentRequest = FakeWorker.last.requests[1];
    FakeWorker.last.reply({ ...currentRequest, moves: ["U'"] });
    expect(await second).toEqual(["U'"]);
  });
  it('rejects even a valid solution when it belongs to a different requested state', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const { solveState } = await import('../src/cube/solver');
    const result = solveState(applyMoves(SOLVED, 'R'));
    const rejected = expect(result).rejects.toThrow('Ajutorul nu se potrivește');
    const request = FakeWorker.last.requests[0];
    FakeWorker.last.reply({ ...request, state: applyMoves(SOLVED, 'U'), moves: ["U'"] });
    await rejected;
  });
});


describe('stage-based demonstration and explicit checkpoint restore', () => {
  it('adapts ordinary lessons to a single stage without changing their narration', () => {
    const lesson = lessons.find(item => item.id === 'f2l-pereche')!;
    expect(lessonStageCount(lesson)).toBe(1);
    expect(lessonStage(lesson)).toEqual({ title: lesson.title, text: lesson.explanation, moves: lesson.solution, goal: lesson.goal });
    expect(lessonCheckpoint(lesson, 0)).toBe(applyMoves(SOLVED, lesson.setup));
    expect(lessonCheckpoint(lesson, 1)).toBe(SOLVED);
    expect(lessonStagePrefix(lesson, 0)).toEqual([]);
  });
  it('returns matching current-stage narration, goal, and exact checkpoint at every guided stage', () => {
    expect(lessonStageCount(guidedLesson)).toBe(9);
    let state = applyMoves(SOLVED, guidedLesson.setup);
    for (let step = 0; step < lessonStageCount(guidedLesson); step++) {
      const stage = lessonStage(guidedLesson, step);
      expect(stage).toEqual(guidedLesson.steps![step]);
      expect(lessonCheckpoint(guidedLesson, step)).toBe(state);
      expect(goalReached(state, stage.goal)).toBe(false);
      state = applyMoves(state, stage.moves);
      expect(goalReached(state, stage.goal)).toBe(true);
    }
    expect(lessonCheckpoint(guidedLesson, 9)).toBe(SOLVED);
  });
  it('keeps restored history exactly reproducible from the original activity initial state', () => {
    const initial = lessonCheckpoint(guidedLesson, 0);
    for (let step = 0; step <= 9; step++) {
      const moves = lessonStagePrefix(guidedLesson, step);
      const state = lessonCheckpoint(guidedLesson, step);
      expect(applyMoves(initial, moves)).toBe(state);
      expect(applyMoves(state, inverse(moves.join(' ')))).toBe(initial);
    }
  });
  it('returns only a stage-local suffix and never leaks the next stage into this demonstration', () => {
    const step = 2;
    const stage = lessonStage(guidedLesson, step);
    const moves = parseMoves(stage.moves);
    let state = lessonCheckpoint(guidedLesson, step);
    for (let index = 0; index <= moves.length; index++) {
      expect(lessonStageContinuation(guidedLesson, step, state)).toEqual(moves.slice(index));
      if (index < moves.length) state = applyMoves(state, moves[index]);
    }
    expect(lessonStageContinuation(guidedLesson, step, lessonCheckpoint(guidedLesson, step + 2))).toBeNull();
  });
  it('accepts an alternative cross but refuses stale F2L moves until an explicit restore', () => {
    const canonicalNext = lessonCheckpoint(guidedLesson, 1);
    const alternative = applyMoves(canonicalNext, 'U');
    expect(goalReached(alternative, lessonStage(guidedLesson, 0).goal)).toBe(true);
    expect(alternative).not.toBe(canonicalNext);
    expect(lessonStageContinuation(guidedLesson, 1, alternative)).toBeNull();
    // Calling the checkpoint helper is pure: the alternative remains untouched.
    const restored = lessonCheckpoint(guidedLesson, 1);
    expect(alternative).toBe(applyMoves(canonicalNext, 'U'));
    expect(lessonStageContinuation(guidedLesson, 1, restored)).toEqual(parseMoves(lessonStage(guidedLesson, 1).moves));
  });
  it('rejects invalid stages instead of silently returning the whole lesson solution', () => {
    for (const step of [-1, 0.5, NaN, 10]) {
      expect(() => lessonCheckpoint(guidedLesson, step)).toThrow(RangeError);
      expect(() => lessonStage(guidedLesson, step)).toThrow(RangeError);
    }
    expect(() => lessonStage(guidedLesson, 9)).toThrow(RangeError);
    expect(lessonStageContinuation(guidedLesson, 0, 'corrupt')).toBeNull();
  });
});


describe('dynamic lesson piece highlights', () => {
  it('retains the original setup highlights for every authored lesson', () => {
    for (const lesson of lessons) {
      expect(lesson.focus).toBeDefined();
      expect(lessonHighlights(lesson, applyMoves(SOLVED, lesson.setup))).toEqual(lesson.highlight);
    }
  });
  it('follows the intended white-green-red corner and green-red edge through unexpected moves and undo', () => {
    const lesson = lessons.find(item => item.id === 'f2l-pereche')!;
    const initial = applyMoves(SOLVED, lesson.setup);
    const changed = applyMoves(initial, "F U2 L R'");
    const highlights = lessonHighlights(lesson, changed);
    expect(highlights).toHaveLength(5);
    expect(highlights).not.toEqual(lesson.highlight);
    // Color identities, not only position lookups, establish that the SAME two
    // physical pieces remain selected after the unexpected turns.
    expect(highlights.slice(0, 3).map(index => changed[index]).sort()).toEqual(['D', 'F', 'R']);
    expect(highlights.slice(3).map(index => changed[index]).sort()).toEqual(['F', 'R']);
    const undone = applyMoves(changed, inverse("F U2 L R'"));
    expect(lessonHighlights(lesson, undone)).toEqual(lesson.highlight);
    expect(lessonHighlights(lesson, 'invalid')).toEqual([]);
  });
  it('supports explicit manual stage highlights when no cubie focus is supplied', () => {
    const manual = { ...guidedLesson, focus: undefined, highlight: [8, 9, 20] };
    const highlights = lessonHighlights(manual, SOLVED);
    expect(highlights).toEqual([8, 9, 20]);
    highlights.push(1);
    expect(manual.highlight).toEqual([8, 9, 20]);
  });
});
