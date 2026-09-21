import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { beforeEach, describe, expect, it } from 'vitest';
import { applyMoves, SOLVED } from '../src/cube/engine';
import { getLesson, lessonCheckpoint, lessonStage, lessonStageCount } from '../src/content/lessons';
import { defaultData, loadData, parseBackup, saveData, serializeBackup, validateData, type Activity } from '../src/lib/storage';

const active = (): Activity => ({
  mode: 'free', phase: 'practice', initial: applyMoves(SOLVED, 'R U'),
  state: applyMoves(SOLVED, "R U F R'"), moves: ['F', "R'", 'D'], cursor: 2,
  assisted: true, step: 0, demoIndex: 0, physicalSetupIndex: 0,
  timerMs: 3141.2, timerRunning: false, timerInterrupted: true, startedAt: 1700000000000,
});

beforeEach(async () => { await saveData(defaultData()); });

describe('exact saved progress and backups', () => {
  it('restores the exact state, undo cursor, redo tail, timer and separate records', async () => {
    const data = defaultData();
    data.active = active();
    data.attempts = [{ lessonId: 'f2l-pereche', at: 123456, assisted: false, physical: false, sessionId: 'session-a' }];
    data.solves = [{ at: 123456, durationMs: 50000, physical: true, assisted: false, interrupted: false }];
    await saveData(data);
    expect(await loadData()).toEqual(data);
    expect(parseBackup(serializeBackup(data))).toEqual(data);
  });

  it('snapshots writes before awaiting and preserves newest write order', async () => {
    const data = defaultData();
    data.lastScreen = 'lessons';
    const first = saveData(data);
    data.lastScreen = 'practice';
    const second = saveData(data);
    data.lastScreen = 'mutated-but-not-saved';
    await Promise.all([first, second]);
    expect((await loadData()).lastScreen).toBe('practice');
  });

  it('does not mix physical and virtual attempts', () => {
    const data = defaultData();
    data.attempts = [false, true].map(physical => ({ lessonId: 'f2l-pereche', at: 123456, physical, assisted: false, sessionId: physical ? 'physical' : 'virtual' }));
    expect(parseBackup(serializeBackup(data)).attempts.map(a => a.physical)).toEqual([false, true]);
  });

  it('rejects malformed, oversized and future-schema backups before writing', async () => {
    expect(() => parseBackup('{ broken')).toThrow(/JSON/);
    expect(() => parseBackup('a'.repeat(5_000_001))).toThrow(/prea mare/);
    expect(() => parseBackup(JSON.stringify({ app: 'cubul-lui-erik', version: 20, data: defaultData() }))).toThrow();
    expect(() => validateData({ ...defaultData(), version: 2 })).toThrow(/versiune/);
    expect(await loadData()).toEqual(defaultData());
  });

  it('rejects invalid states, impossible histories, hostile fields and nonfinite clocks', () => {
    const data = { ...defaultData(), active: active() };
    expect(() => validateData({ ...data, active: { ...data.active, state: 'R'.repeat(54) } })).toThrow(/posibil/);
    expect(() => validateData({ ...data, active: { ...data.active, cursor: 5 } })).toThrow(/istoricul/);
    expect(() => validateData({ ...data, active: { ...data.active, state: SOLVED } })).toThrow(/mișcările/);
    expect(() => validateData({ ...data, active: { ...data.active, moves: ['eval()'] } })).toThrow(/mișcări/);
    expect(() => validateData({ ...data, active: { ...data.active, timerMs: Infinity } })).toThrow(/cronometru/);
    expect(() => validateData({ ...defaultData(), preferences: { muted: 'false', slow: false, timer: false } })).toThrow(/preferințe/);
  });

  it('strips unknown imported object fields', () => {
    const parsed = JSON.parse(serializeBackup(defaultData()));
    parsed.data.extra = { executable: 'not-copied' };
    parsed.data.preferences.unknown = true;
    const imported = parseBackup(JSON.stringify(parsed));
    expect(imported).toEqual(defaultData());
    expect(Object.getPrototypeOf(imported)).toBe(Object.prototype);
  });

  it('preserves corrupt stored data for recovery instead of silently replacing it', async () => {
    const db = await openDB('cubul-lui-erik', 1);
    const corrupted = { version: 7, valuableLegacyProgress: true };
    await db.put('progress', corrupted, 'current');
    await expect(loadData()).rejects.toThrow(/versiune/);
    expect(await db.get('progress', 'current')).toEqual(corrupted);
    db.close();
  });

  it('restores physical setup progress without claiming to validate a real cube', async () => {
    const data = defaultData();
    const lesson = getLesson('f2l-pereche')!;
    data.active = { ...active(), mode: 'physical', lessonId: lesson.id, phase: 'physical-setup', initial: applyMoves(SOLVED, lesson.setup), state: applyMoves(SOLVED, lesson.setup.split(' ').slice(0, 2)), moves: [], cursor: 0, physicalSetupIndex: 2 };
    await saveData(data);
    expect((await loadData()).active).toEqual(data.active);
  });

  it('rejects unknown lesson IDs and phases before lesson rendering can run', () => {
    expect(() => validateData({ ...defaultData(), active: { ...active(), phase: 'not-a-phase' } })).toThrow(/etapă necunoscută/);
    expect(() => validateData({ ...defaultData(), active: { ...active(), phase: 'watch' } })).toThrow(/etapă necunoscută/);
    expect(() => validateData({ ...defaultData(), active: { ...active(), mode: 'learn', lessonId: 'missing-lesson' } })).toThrow(/lecția salvată/);
  });

  it('checks stage and demonstration bounds against the actual current lesson stage', () => {
    const lesson = getLesson('rezolvare-ghidata')!;
    const step = 1;
    const stageMoves = lessonStage(lesson, step).moves.split(' ');
    const current: Activity = { ...active(), mode: 'learn', lessonId: lesson.id, phase: 'watch', initial: applyMoves(SOLVED, lesson.setup), state: applyMoves(lessonCheckpoint(lesson, step), stageMoves.slice(0, 1)), moves: [], cursor: 0, step, demoIndex: 1 };
    const data = { ...defaultData(), active: current };
    expect(validateData(data).active).toEqual(current);
    expect(() => validateData({ ...data, active: { ...current, step: lessonStageCount(lesson) } })).toThrow(/numărul etapei/);
    expect(() => validateData({ ...data, active: { ...current, demoIndex: stageMoves.length + 1 } })).toThrow(/demonstrația depășește/);
    expect(() => validateData({ ...data, active: { ...current, state: current.initial } })).toThrow(/demonstrația salvată/);
  });

  it('validates physical setup and exercise positions even across the resume prompt', () => {
    const lesson = getLesson('f2l-pereche')!;
    const setup = lesson.setup.split(' '), solution = lesson.solution.split(' ');
    const initial = applyMoves(SOLVED, setup);
    const current: Activity = { ...active(), mode: 'physical', lessonId: lesson.id, phase: 'physical-resume', initial, state: applyMoves(SOLVED, setup.slice(0, 1)), moves: [], cursor: 0, physicalSetupIndex: 1, demoIndex: 0 };
    const wrap = (a: Activity) => ({ ...defaultData(), active: a });
    expect(validateData(wrap(current)).active).toEqual(current);
    const duringExercise = { ...current, physicalSetupIndex: setup.length, demoIndex: 1, state: applyMoves(initial, solution[0]) };
    expect(validateData(wrap(duringExercise)).active).toEqual(duringExercise);
    expect(() => validateData(wrap({ ...current, state: SOLVED }))).toThrow(/pașii confirmați/);
    expect(() => validateData(wrap({ ...current, demoIndex: 1 }))).toThrow(/numai după pregătire/);
    expect(() => validateData(wrap({ ...current, physicalSetupIndex: setup.length + 1 }))).toThrow(/pregătirea cubului depășește/);
    expect(() => validateData(wrap({ ...duringExercise, demoIndex: solution.length + 1 }))).toThrow(/demonstrația fizică depășește/);
    expect(() => validateData(wrap({ ...current, phase: 'physical-do' }))).toThrow(/pregătirea fizică nu este completă/);
  });
});
