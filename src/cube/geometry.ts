/** Cubejs facelet convention: U, R, F, D, L, B, each read left-to-right
 * while looking directly at that face. World axes: +x right, +y up, +z front.
 * Camera rotation never changes this coordinate system or the cube state. */
export const FACE_ORDER = ['U', 'R', 'F', 'D', 'L', 'B'] as const;
export type CubeFace = (typeof FACE_ORDER)[number];
export type Vec3 = [number, number, number];

export const FACE_NORMALS: Record<CubeFace, Vec3> = {
  U: [0, 1, 0], R: [1, 0, 0], F: [0, 0, 1],
  D: [0, -1, 0], L: [-1, 0, 0], B: [0, 0, -1],
};

export const FACE_COLORS: Record<CubeFace, string> = {
  U: '#ffd342', R: '#ed4e43', F: '#20b877',
  D: '#f7fafc', L: '#ff923c', B: '#337fef',
};

export const FACE_NAMES: Record<CubeFace, string> = {
  U: 'sus', R: 'dreapta', F: 'față', D: 'jos', L: 'stânga', B: 'spate',
};

export interface StickerPosition {
  index: number;
  face: CubeFace;
  position: Vec3;
  normal: Vec3;
}

export function stickerPosition(index: number): StickerPosition {
  if (!Number.isInteger(index) || index < 0 || index > 53) {
    throw new RangeError('Sticker index must be between 0 and 53.');
  }
  const face = FACE_ORDER[Math.floor(index / 9)];
  const row = Math.floor((index % 9) / 3);
  const col = index % 3;
  const positions: Record<CubeFace, Vec3> = {
    U: [col - 1, 1, row - 1],
    R: [1, 1 - row, 1 - col],
    F: [col - 1, 1 - row, 1],
    D: [col - 1, -1, 1 - row],
    L: [-1, 1 - row, col - 1],
    B: [1 - col, 1 - row, -1],
  };
  return { index, face, position: positions[face], normal: [...FACE_NORMALS[face]] };
}

export const STICKER_POSITIONS = Array.from({ length: 54 }, (_, index) => stickerPosition(index));

export interface FaceTurn {
  face: CubeFace;
  axis: 0 | 1 | 2;
  layer: -1 | 1;
  angle: number;
}

/** A clockwise move is a negative right-handed rotation about the OUTWARD
 * normal, including D/L/B. This is the exact convention used by cubejs. */
export function faceTurn(move: string): FaceTurn | null {
  if (!/^[URFDLB](2|')?$/.test(move)) return null;
  const face = move[0] as CubeFace;
  const normal = FACE_NORMALS[face];
  const axis = normal.findIndex(value => value !== 0) as 0 | 1 | 2;
  const layer = normal[axis] as -1 | 1;
  const turns = move.endsWith('2') ? 2 : move.endsWith("'") ? -1 : 1;
  return { face, axis, layer, angle: -layer * turns * Math.PI / 2 };
}

/** Horizontal gestures deliberately have a fixed, discoverable meaning.
 * Swipe right turns the touched face clockwise as seen directly; left undoes
 * that direction. A vertical gesture never accidentally turns a face. */
export function swipeMove(face: CubeFace, dx: number, dy: number): string | null {
  if (Math.abs(dx) < 18 || Math.abs(dx) < Math.abs(dy) * 1.15) return null;
  return dx > 0 ? face : `${face}'`;
}
