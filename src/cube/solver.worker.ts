import Cube from 'cubejs';
import { applyMoves, isSolved, parseMoves, validateState } from './engine';

let ready = false;
self.onmessage = (event: MessageEvent<{ id: number; state: string }>) => {
  const { id, state } = event.data;
  try {
    if (!validateState(state)) throw new Error('Poziția cubului nu este validă.');
    if (!ready) { Cube.initSolver(); ready = true; }
    const moves = isSolved(state) ? [] : parseMoves(Cube.fromString(state).solve());
    // Never publish an unverified continuation, even if the library returns one.
    if (!isSolved(applyMoves(state, moves))) throw new Error('Soluția nu a trecut verificarea.');
    self.postMessage({ id, state, moves });
  } catch (error) {
    self.postMessage({ id, state, error: error instanceof Error ? error.message : 'Nu am găsit un ajutor verificat.' });
  }
};
