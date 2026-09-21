declare module 'cubejs' {
  export interface CubeState { center: number[]; cp: number[]; co: number[]; ep: number[]; eo: number[] }
  export default class Cube {
    constructor(state?: Cube | CubeState);
    center: number[]; cp: number[]; co: number[]; ep: number[]; eo: number[];
    static fromString(state: string): Cube;
    static inverse(algorithm: string): string;
    static initSolver(): void;
    static random(): Cube;
    move(algorithm: string): Cube;
    asString(): string;
    toJSON(): CubeState;
    isSolved(): boolean;
    solve(maxDepth?: number): string;
  }
}
declare module 'cubejs/lib/cube' { export { default } from 'cubejs'; }
