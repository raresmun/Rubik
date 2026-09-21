import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyMoves, SOLVED } from '../src/cube/engine';
import { beginCubeTransition, historyTransition } from '../src/lib/interaction';
import type { Activity } from '../src/lib/storage';

afterEach(() => { vi.useRealTimers(); });

describe('cube input integration', () => {
  it('blocks rapid repeat clicks before rerender and releases after the transition', () => {
    vi.useFakeTimers();
    const lock = { current: false };
    const busy = vi.fn();
    expect(beginCubeTransition(lock, busy, () => false)).toBe(true);
    expect(beginCubeTransition(lock, busy, () => false)).toBe(false);
    expect(busy.mock.calls).toEqual([[true]]);
    vi.advanceTimersByTime(300);
    expect(lock.current).toBe(false);
    expect(beginCubeTransition(lock, busy, () => false)).toBe(true);
  });

  it('an old animation timeout cannot unlock a newly started demonstration', () => {
    vi.useFakeTimers();
    const lock = { current: false };
    const busy = vi.fn();
    let demonstrating = false;
    beginCubeTransition(lock, busy, () => demonstrating);
    demonstrating = true;
    vi.advanceTimersByTime(300);
    expect(lock.current).toBe(true);
    expect(busy.mock.calls).toEqual([[true]]);
  });

  it('undo/redo reconstruct exact states and preserve the redo tail and assistance', () => {
    const initial = applyMoves(SOLVED, 'R U');
    const a: Activity = { mode: 'free', phase: 'practice', state: applyMoves(initial, "F R'"), initial, moves: ['F', "R'", 'D'], cursor: 2, assisted: true, step: 0, demoIndex: 0, physicalSetupIndex: 0, timerMs: 456, timerRunning: false, timerInterrupted: false };
    const undo = historyTransition(a, -1)!;
    expect(undo.move).toBe('R');
    expect(undo.activity.state).toBe(applyMoves(initial, 'F'));
    expect(undo.activity.moves).toEqual(a.moves);
    const redo = historyTransition(undo.activity, 1)!;
    expect(redo.activity).toEqual(a);
    expect(historyTransition({ ...a, phase: 'watch' }, -1)).toBeNull();
    expect(historyTransition({ ...a, mode: 'physical' }, -1)).toBeNull();
  });
});
