import { applyMoves, inverse } from '../cube/engine';
import type { Activity } from './storage';

type Lock = { current: boolean };
const transitions = new WeakMap<Lock, symbol>();

/** Block repeat input synchronously, before React has rendered disabled buttons. */
export function beginCubeTransition(lock: Lock, setBusy: (value: boolean) => void, isDemonstrating: () => boolean): boolean {
  if (lock.current) return false;
  const token = Symbol('cube-transition');
  transitions.set(lock, token);
  lock.current = true;
  setBusy(true);
  setTimeout(() => {
    // An old move's timer must never unlock a newer move or a demonstration.
    if (transitions.get(lock) !== token || isDemonstrating()) return;
    transitions.delete(lock);
    lock.current = false;
    setBusy(false);
  }, 300);
  return true;
}

/** Rebuild from the authoritative checkpoint; the redo tail remains untouched. */
export function historyTransition(activity: Activity, delta: number): { activity: Activity; move: string } | null {
  if (activity.mode === 'physical' || !['practice', 'independent'].includes(activity.phase) || ![-1, 1].includes(delta)) return null;
  const cursor = activity.cursor + delta;
  if (cursor < 0 || cursor > activity.moves.length) return null;
  const move = delta < 0 ? inverse(activity.moves[activity.cursor - 1]) : activity.moves[activity.cursor];
  return { move, activity: { ...activity, cursor, state: applyMoves(activity.initial, activity.moves.slice(0, cursor)) } };
}
