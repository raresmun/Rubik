import { describe, expect, it } from 'vitest';
import Cube from 'cubejs';
import { FACE_NORMALS, FACE_ORDER, STICKER_POSITIONS, faceTurn, stickerPosition, swipeMove, type Vec3 } from '../src/cube/geometry';

function rotated(vector: Vec3, axis: number, angle: number): Vec3 {
  const [x, y, z] = vector;
  const c = Math.cos(angle), s = Math.sin(angle);
  const values = axis === 0 ? [x, c * y - s * z, s * y + c * z]
    : axis === 1 ? [c * x + s * z, y, -s * x + c * z]
      : [c * x - s * y, s * x + c * y, z];
  return values.map(value => Math.round(value) || 0) as Vec3;
}

/** Independently project the rendered pieces after a visual turn back to
 * facelets, then compare against cubejs. Catches back/down mirroring and
 * reversed animations that an internally consistent renderer could conceal. */
function visualMove(state: string, move: string) {
  const turn = faceTurn(move)!;
  const next = state.split('');
  for (const sticker of STICKER_POSITIONS) {
    if (sticker.position[turn.axis] !== turn.layer) continue;
    const p = rotated(sticker.position, turn.axis, turn.angle);
    const n = rotated(sticker.normal, turn.axis, turn.angle);
    const target = STICKER_POSITIONS.find(candidate => candidate.position.join() === p.join() && candidate.normal.join() === n.join());
    expect(target).toBeDefined();
    next[target!.index] = state[sticker.index];
  }
  return next.join('');
}

describe('3D facelet geometry', () => {
  it('has 54 unique stickers, correct centres and fixture corner orientation', () => {
    expect(new Set(STICKER_POSITIONS.map(s => `${s.position}/${s.normal}`)).size).toBe(54);
    FACE_ORDER.forEach((face, index) => expect(stickerPosition(index * 9 + 4).position).toEqual(FACE_NORMALS[face]));
    expect(stickerPosition(8).position).toEqual([1, 1, 1]); // U bottom-right is UFR.
    expect(stickerPosition(9).position).toEqual([1, 1, 1]); // R top-left is UFR.
    expect(stickerPosition(20).position).toEqual([1, 1, 1]); // F top-right is UFR.
    expect(stickerPosition(27).position).toEqual([-1, -1, 1]); // D top-left is DFL.
    expect(stickerPosition(45).position).toEqual([1, 1, -1]); // B top-left is URB.
  });

  for (const face of FACE_ORDER) {
    for (const suffix of ['', "'", '2']) {
      const move = face + suffix;
      it(`animates ${move} exactly as cubejs on a nonuniform state`, () => {
        const cube = new Cube();
        cube.move("R U F2 L' D B R2 U' F D2 L B'");
        const state = cube.asString();
        cube.move(move);
        expect(visualMove(state, move)).toBe(cube.asString());
      });
    }
  }

  it('rejects unsupported animation tokens and out-of-bounds sticker indices', () => {
    expect(faceTurn('Rw')).toBeNull();
    expect(faceTurn('x')).toBeNull();
    expect(() => stickerPosition(-1)).toThrow();
    expect(() => stickerPosition(54)).toThrow();
  });

  it('maps deliberate horizontal swipes consistently and ignores tap/vertical noise', () => {
    expect(swipeMove('F', 45, 3)).toBe('F');
    expect(swipeMove('D', -45, 3)).toBe("D'");
    expect(swipeMove('R', 12, 0)).toBeNull();
    expect(swipeMove('U', 30, 70)).toBeNull();
  });
});
