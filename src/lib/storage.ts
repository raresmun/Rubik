import { openDB, type IDBPDatabase } from 'idb';
import { applyMoves, parseMoves, SOLVED, validateState } from '../cube/engine';
import { getLesson, lessonCheckpoint, lessonStage, lessonStageCount } from '../content/lessons';

export type Activity = {
  mode: 'learn' | 'free' | 'physical';
  lessonId?: string;
  phase: string;
  state: string;
  initial: string;
  moves: string[];
  cursor: number;
  assisted: boolean;
  step: number;
  demoIndex: number;
  physicalSetupIndex: number;
  timerMs: number;
  timerRunning: boolean;
  timerInterrupted: boolean;
  startedAt?: number;
};

export type AppData = {
  version: 1;
  active: Activity | null;
  attempts: Array<{ lessonId: string; at: number; assisted: boolean; physical: boolean; sessionId: string }>;
  solves: Array<{ at: number; durationMs: number; physical: boolean; assisted: boolean; interrupted: boolean }>;
  preferences: { muted: boolean; slow: boolean; timer: boolean };
  lastScreen: string;
};

const DATABASE = 'cubul-lui-erik';
const STORE = 'progress';
const KEY = 'current';
const MAX_BACKUP_BYTES = 5_000_000;
const PHASES = {
  free: ['practice', 'complete'],
  learn: ['intro', 'watch', 'demo-paused', 'demo-done', 'practice', 'independent', 'stage-done', 'complete'],
  physical: ['physical-orient', 'physical-setup', 'physical-do', 'physical-resume', 'complete'],
} satisfies Record<Activity['mode'], string[]>;
let connection: Promise<IDBPDatabase> | undefined;
let writes: Promise<void> = Promise.resolve();

export function defaultData(): AppData {
  return { version: 1, active: null, attempts: [], solves: [], preferences: { muted: false, slow: false, timer: false }, lastScreen: 'home' };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function text(value: unknown, max = 160): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}
function number(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
}
function integer(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number {
  return number(value, max) && Number.isInteger(value);
}
function flag(value: unknown): value is boolean { return typeof value === 'boolean'; }
function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Copia nu este validă: ${message}`);
}

/** Validate and reconstruct known fields. Never spread imported objects into state. */
export function validateData(value: unknown): AppData {
  ensure(record(value), 'lipsește progresul.');
  ensure(value.version === 1, 'versiune necunoscută. Actualizează aplicația înainte de import.');
  ensure(record(value.preferences), 'lipsesc preferințele.');
  const p = value.preferences;
  ensure(flag(p.muted) && flag(p.slow) && flag(p.timer), 'preferințe incorecte.');
  ensure(text(value.lastScreen), 'ecran necunoscut.');
  ensure(Array.isArray(value.attempts) && value.attempts.length <= 20_000, 'istoric de lecții prea mare.');
  ensure(Array.isArray(value.solves) && value.solves.length <= 20_000, 'istoric de rezolvări prea mare.');
  const attempts = value.attempts.map((attempt: unknown) => {
    ensure(record(attempt), 'încercare incorectă.');
    ensure(text(attempt.lessonId) && integer(attempt.at) && flag(attempt.assisted) && flag(attempt.physical) && text(attempt.sessionId), 'încercare incompletă.');
    return { lessonId: attempt.lessonId, at: attempt.at, assisted: attempt.assisted, physical: attempt.physical, sessionId: attempt.sessionId };
  });
  const solves = value.solves.map((solve: unknown) => {
    ensure(record(solve), 'rezolvare incorectă.');
    ensure(integer(solve.at) && number(solve.durationMs) && flag(solve.physical) && flag(solve.assisted) && flag(solve.interrupted), 'rezolvare incompletă.');
    return { at: solve.at, durationMs: solve.durationMs, physical: solve.physical, assisted: solve.assisted, interrupted: solve.interrupted };
  });
  let active: Activity | null = null;
  if (value.active !== null) {
    const a = value.active;
    ensure(record(a), 'activitate incompletă.');
    ensure(a.mode === 'learn' || a.mode === 'free' || a.mode === 'physical', 'mod necunoscut.');
    ensure(a.lessonId === undefined || text(a.lessonId), 'lecție incorectă.');
    ensure(a.mode === 'free' || text(a.lessonId), 'lipsește lecția.');
    ensure(text(a.phase) && PHASES[a.mode].includes(a.phase), 'etapă necunoscută pentru acest mod.');
    ensure(typeof a.state === 'string' && validateState(a.state), 'cubul salvat nu este posibil.');
    ensure(typeof a.initial === 'string' && validateState(a.initial), 'poziția inițială nu este posibilă.');
    ensure(Array.isArray(a.moves) && a.moves.length <= 20_000 && a.moves.every(m => typeof m === 'string' && /^[URFDLB](2|')?$/.test(m)), 'mișcări incorecte.');
    ensure(integer(a.cursor, a.moves.length), 'istoricul nu se potrivește.');
    ensure(flag(a.assisted) && integer(a.step, 1000) && integer(a.demoIndex, 1000) && integer(a.physicalSetupIndex, 1000), 'etape incomplete.');
    ensure(number(a.timerMs) && flag(a.timerRunning) && flag(a.timerInterrupted), 'cronometru incorect.');
    ensure(a.startedAt === undefined || integer(a.startedAt), 'dată incorectă.');
    if (a.mode === 'free') {
      ensure(a.lessonId === undefined && a.step === 0 && a.demoIndex === 0 && a.physicalSetupIndex === 0, 'activitatea liberă conține etape de lecție.');
    } else {
      const lesson = getLesson(a.lessonId as string);
      ensure(lesson, 'lecția salvată nu există în această versiune a cursului.');
      ensure(a.step < lessonStageCount(lesson), 'numărul etapei depășește lecția.');
      if(a.phase === 'stage-done') ensure(!!lesson.steps && a.step < lessonStageCount(lesson)-1, 'nu există o etapă următoare.');
      const setup = parseMoves(lesson.setup);
      const prepared = applyMoves(SOLVED, setup);
      ensure(a.initial === prepared, 'poziția inițială nu se potrivește cu lecția.');
      ensure(a.physicalSetupIndex <= setup.length, 'pregătirea cubului depășește lecția.');
      if (a.mode === 'learn') {
        const moves = parseMoves(lessonStage(lesson, a.step).moves);
        ensure(a.demoIndex <= moves.length, 'demonstrația depășește etapa curentă.');
        ensure(a.physicalSetupIndex === 0, 'lecția pe ecran conține o pregătire fizică.');
        if (['watch', 'demo-paused', 'demo-done'].includes(a.phase)) {
          ensure(a.state === applyMoves(lessonCheckpoint(lesson, a.step), moves.slice(0, a.demoIndex)), 'cubul nu se potrivește cu demonstrația salvată.');
        }
      } else {
        const solution = parseMoves(lesson.solution);
        ensure(a.demoIndex <= solution.length, 'demonstrația fizică depășește lecția.');
        ensure(a.moves.length === 0 && a.cursor === 0, 'practica fizică nu poate conține mișcări virtuale.');
        if (a.phase === 'physical-orient') {
          ensure(a.physicalSetupIndex === 0 && a.demoIndex === 0, 'orientarea trebuie să înceapă de la cubul rezolvat.');
        }
        if (a.phase === 'physical-setup' || a.physicalSetupIndex < setup.length) {
          ensure(a.demoIndex === 0, 'exercițiul fizic începe numai după pregătire.');
        }
        if (a.phase === 'physical-do' || a.phase === 'complete') {
          ensure(a.physicalSetupIndex === setup.length, 'pregătirea fizică nu este completă.');
        }
        if (a.phase === 'complete') ensure(a.demoIndex === solution.length, 'exercițiul fizic nu este complet.');
        // This validates only the saved on-screen model. The real cube remains self-reported.
        const expected = applyMoves(applyMoves(SOLVED, setup.slice(0, a.physicalSetupIndex)), solution.slice(0, a.demoIndex));
        ensure(a.state === expected, 'modelul fizic nu se potrivește cu pașii confirmați.');
      }
    }
    if (a.mode === 'free' || (a.mode === 'learn' && ['practice', 'independent', 'complete', 'stage-done'].includes(a.phase))) {
      ensure(applyMoves(a.initial, a.moves.slice(0, a.cursor)) === a.state, 'cubul nu se potrivește cu mișcările salvate.');
    }
    active = {
      mode: a.mode, ...(a.lessonId ? { lessonId: a.lessonId } : {}), phase: a.phase,
      state: a.state, initial: a.initial, moves: [...a.moves], cursor: a.cursor,
      assisted: a.assisted, step: a.step, demoIndex: a.demoIndex, physicalSetupIndex: a.physicalSetupIndex,
      timerMs: a.timerMs, timerRunning: a.timerRunning, timerInterrupted: a.timerInterrupted,
      ...(a.startedAt === undefined ? {} : { startedAt: a.startedAt }),
    };
  }
  return { version: 1, active, attempts, solves, preferences: { muted: p.muted, slow: p.slow, timer: p.timer }, lastScreen: value.lastScreen };
}

async function database(): Promise<IDBPDatabase> {
  if (!globalThis.indexedDB) throw new Error('Browserul nu permite salvarea locală. Progresul acestei sesiuni nu se păstrează.');
  if (!connection) {
    const opening = openDB(DATABASE, 1, {
      upgrade(db) {
        // Future migrations must add stores/fields without deleting prior progress.
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      },
      blocking() { connection?.then(db => db.close()).catch(() => {}); connection = undefined; },
      terminated() { connection = undefined; },
    });
    connection = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Salvarea locală este blocată. Închide celelalte file ale aplicației și încearcă din nou.')), 5000);
      opening.then(db => { clearTimeout(timeout); resolve(db); }, error => { clearTimeout(timeout); reject(error); });
    });
    connection.catch(() => { connection = undefined; });
  }
  return connection;
}

export async function loadData(): Promise<AppData> {
  try {
    await writes;
    const db = await database();
    const value: unknown = await db.get(STORE, KEY);
    return value === undefined ? defaultData() : validateData(value);
  } catch (error) {
    if (error instanceof Error && /Copia|Browserul|Salvarea/.test(error.message)) throw error;
    throw new Error('Nu am putut citi progresul local. Datele vechi nu au fost șterse.');
  }
}

/** Calls serialize in order; each captures a snapshot before awaiting IndexedDB. */
export function saveData(data: AppData): Promise<void> {
  const snapshot = JSON.parse(JSON.stringify(data)) as AppData;
  const operation = writes.catch(() => {}).then(async () => {
    try {
      const db = await database();
      const tx = db.transaction(STORE, 'readwrite');
      await tx.store.put(snapshot, KEY);
      await tx.done;
    } catch {
      throw new Error('Progresul nu s-a putut salva. Verifică spațiul disponibil și exportă o copie din Pentru părinți.');
    }
  });
  writes = operation.catch(() => {});
  return operation;
}

export function serializeBackup(data: AppData): string {
  return JSON.stringify({ app: 'cubul-lui-erik', version: 1, exportedAt: new Date().toISOString(), data: validateData(data) }, null, 2);
}

export function parseBackup(source: string): AppData {
  ensure(typeof source === 'string' && source.length <= MAX_BACKUP_BYTES, 'fișierul este prea mare.');
  let envelope: unknown;
  try { envelope = JSON.parse(source); } catch { throw new Error('Copia nu este validă: fișierul nu conține JSON.'); }
  ensure(record(envelope) && envelope.app === 'cubul-lui-erik' && envelope.version === 1, 'alege o copie exportată din Cubul lui Erik.');
  return validateData(envelope.data);
}

/** Call from the parent area's explicit button, not during first render. */
export async function requestPersistentStorage(): Promise<boolean> {
  try { return (await globalThis.navigator?.storage?.persist?.()) ?? false; } catch { return false; }
}
