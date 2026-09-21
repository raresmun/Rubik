import { applyMoves, isSolved, validateState } from './engine';

interface Pending {
  state: string;
  resolve: (moves: string[]) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}
let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, Pending>();
function rejectAll(error: Error) {
  for (const request of pending.values()) { clearTimeout(request.timeout); request.reject(error); }
  pending.clear();
}
function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<{ id: number; state: string; moves?: string[]; error?: string }>) => {
    const result = event.data;
    const request = pending.get(result.id);
    if (!request) return;
    clearTimeout(request.timeout);
    pending.delete(result.id);
    if (result.error) { request.reject(new Error(result.error)); return; }
    try {
      if (result.state !== request.state || !result.moves || !isSolved(applyMoves(request.state, result.moves))) throw new Error('Ajutorul nu se potrivește cu această poziție.');
      request.resolve(result.moves);
    } catch (error) { request.reject(error instanceof Error ? error : new Error('Ajutor invalid.')); }
  };
  worker.onerror = () => {
    rejectAll(new Error('Ajutorul local nu a pornit. Poți continua să rezolvi cubul.'));
    worker?.terminate(); worker = undefined;
  };
  return worker;
}
/** The caller must compare its captured state with the live UI state before using a result. */
export function solveState(state: string): Promise<string[]> {
  if (!validateState(state)) return Promise.reject(new Error('Poziția cubului nu este validă.'));
  if (isSolved(state)) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => {
      // A worker can still be calculating tables on a slow phone; end it cleanly.
      rejectAll(new Error('Calculul a durat prea mult. Încearcă din nou.'));
      worker?.terminate(); worker = undefined;
    }, 45000);
    pending.set(id, { state, resolve, reject, timeout });
    try { getWorker().postMessage({ id, state }); }
    catch (error) { clearTimeout(timeout); pending.delete(id); reject(error); }
  });
}
/** Invalidates results without rebuilding the expensive offline solver tables. */
export function cancelSolverRequests(): void {
  rejectAll(new DOMException('Poziția cubului s-a schimbat.', 'AbortError'));
}
