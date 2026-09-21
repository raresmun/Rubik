import Cube from 'cubejs/lib/cube';

export type Move = string;
export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export const FACES: Face[] = ['U', 'R', 'F', 'D', 'L', 'B'];
export const SOLVED = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';
export const FACE_NAMES: Record<Face, string> = { U: 'Sus', R: 'Dreapta', F: 'Față', D: 'Jos', L: 'Stânga', B: 'Spate' };
export const FACE_COLOR_NAMES: Record<Face, string> = { U: 'galben', R: 'roșu', F: 'verde', D: 'alb', L: 'portocaliu', B: 'albastru' };
export const FACE_COLORS: Record<Face, string> = { U: '#ffd542', R: '#ef4b4b', F: '#24b78b', D: '#fffaf0', L: '#ff963e', B: '#438aef' };
export type LessonGoal = 'solved' | 'cross' | 'f2l-fr' | 'f2l-fl' | 'f2l-br' | 'f2l-bl' | 'f2l' | 'oll-cross' | 'oll' | 'pll-corners'
  | { type: 'pieces'; corners: number[]; edges: number[] };

// Standard Kociemba / cubejs order. Each array identifies one physical cubie.
export const CORNER_FACELETS = [[8, 9, 20], [6, 18, 38], [0, 36, 47], [2, 45, 11], [29, 26, 15], [27, 44, 24], [33, 53, 42], [35, 17, 51]];
export const EDGE_FACELETS = [[5, 10], [7, 19], [3, 37], [1, 46], [32, 16], [28, 25], [30, 43], [34, 52], [23, 12], [21, 41], [50, 39], [48, 14]];
const crossEdges = [4, 5, 6, 7];
const bottomCorners = [4, 5, 6, 7];
const lowerEdges = [4, 5, 6, 7, 8, 9, 10, 11];

/** Only single outer-face turns are accepted: no ambiguous view rotations. */
export function parseMoves(algorithm: string | string[]): Move[] {
  const tokens = (Array.isArray(algorithm) ? algorithm.join(' ') : algorithm).trim().split(/\s+/).filter(Boolean);
  if (tokens.some(move => !/^[URFDLB](?:2|')?$/.test(move))) throw new Error('Mișcare necunoscută. Folosește U, R, F, D, L sau B.');
  return tokens;
}
function parity(values: number[]): number {
  let n = 0;
  for (let a = 0; a < values.length; a++) for (let b = a + 1; b < values.length; b++) if (values[a] > values[b]) n++;
  return n % 2;
}
function permutation(values: number[], length: number): boolean {
  return values.length === length && new Set(values).size === length && values.every(n => Number.isInteger(n) && n >= 0 && n < length);
}
/** Reject impossible imports before cubejs parses or solves them. */
export function validateState(state: unknown): state is string {
  if (typeof state !== 'string' || !/^[URFDLB]{54}$/.test(state)) return false;
  if (!FACES.every((face, i) => state[9 * i + 4] === face && [...state].filter(sticker => sticker === face).length === 9)) return false;
  try {
    const cube = Cube.fromString(state);
    return cube.asString() === state && permutation(cube.cp, 8) && permutation(cube.ep, 12)
      && cube.co.every(n => Number.isInteger(n) && n >= 0 && n < 3)
      && cube.eo.every(n => n === 0 || n === 1)
      && cube.co.reduce((a, b) => a + b, 0) % 3 === 0
      && cube.eo.reduce<number>((a, b) => a + b, 0) % 2 === 0
      && parity(cube.cp) === parity(cube.ep);
  } catch { return false; }
}
export function applyMoves(state: string, algorithm: string | string[]): string {
  if (!validateState(state)) throw new Error('Poziția cubului nu este validă.');
  const moves = parseMoves(algorithm);
  return moves.length ? Cube.fromString(state).move(moves.join(' ')).asString() : state;
}
export function inverse(algorithm: string): string {
  return Cube.inverse(parseMoves(algorithm).join(' '));
}
export function isSolved(state: string): boolean { return state === SOLVED; }

/** Legal random-move scramble; deliberately not advertised as a WCA random-state scramble. */
export function scramble(length = 20): string {
  const count = Math.max(1, Math.min(100, Math.floor(Number.isFinite(length) ? length : 20)));
  const axis: Record<Face, number> = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 };
  const result: string[] = [];
  let lastAxis = -1;
  for (let i = 0; i < count; i++) {
    const choices = FACES.filter(face => axis[face] !== lastAxis);
    const face = choices[Math.floor(Math.random() * choices.length)];
    result.push(face + ['', "'", '2'][Math.floor(Math.random() * 3)]);
    lastAxis = axis[face];
  }
  return result.join(' ');
}
export function goalReached(state: string, goal: LessonGoal): boolean {
  if (!validateState(state)) return false;
  const cube = Cube.fromString(state);
  const pieces = (corners: number[], edges: number[]) => corners.every(i => cube.cp[i] === i && cube.co[i] === 0) && edges.every(i => cube.ep[i] === i && cube.eo[i] === 0);
  if (typeof goal === 'object') return pieces(goal.corners, goal.edges);
  const f2l = pieces(bottomCorners, lowerEdges);
  const orientedTop = [0, 1, 2, 3].every(i => cube.co[i] === 0 && cube.eo[i] === 0);
  switch (goal) {
    case 'solved': return isSolved(state);
    case 'cross': return pieces([], crossEdges);
    case 'f2l-fr': return pieces([4], [...crossEdges, 8]);
    case 'f2l-fl': return pieces([5], [...crossEdges, 9]);
    case 'f2l-br': return pieces([7], [...crossEdges, 11]);
    case 'f2l-bl': return pieces([6], [...crossEdges, 10]);
    case 'f2l': return f2l;
    case 'oll-cross': return f2l && [0, 1, 2, 3].every(i => cube.eo[i] === 0);
    case 'oll': return f2l && orientedTop;
    case 'pll-corners': return f2l && orientedTop && pieces([0, 1, 2, 3], []);
  }
}
/** Highlight physical pieces in their current locations, including after unexpected moves. */
export function pieceFacelets(state: string, corners: number[] = [], edges: number[] = []): number[] {
  if (!validateState(state)) return [];
  const cube = Cube.fromString(state);
  return [...corners.flatMap(piece => CORNER_FACELETS[cube.cp.indexOf(piece)] ?? []), ...edges.flatMap(piece => EDGE_FACELETS[cube.ep.indexOf(piece)] ?? [])];
}
/** A scripted continuation is safe only if this exact state lies on its verified path. */
export function lessonContinuation(state: string, setup: string, solution: string): Move[] | null {
  if (!validateState(state)) return null;
  let checkpoint = applyMoves(SOLVED, setup);
  const moves = parseMoves(solution);
  for (let i = 0; i <= moves.length; i++) {
    if (checkpoint === state) return moves.slice(i);
    if (i < moves.length) checkpoint = applyMoves(checkpoint, moves[i]);
  }
  return null;
}
export function describeMove(move: Move): string {
  const [valid] = parseMoves(move);
  if (!valid) return '';
  const face = valid[0] as Face;
  const direction = valid.endsWith('2') ? 'o jumătate de tură' : valid.endsWith("'") ? 'un sfert de tură în sens invers acelor de ceasornic' : 'un sfert de tură în sensul acelor de ceasornic';
  return `Rotește fața ${FACE_NAMES[face].toLocaleLowerCase('ro')} ${direction}, privind direct acea față.`;
}
