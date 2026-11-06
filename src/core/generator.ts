import { ACTIVE_CELLS, emptyGrid } from './grid.js';
import { candidatesFor } from './candidates.js';
import { countSolutionsWithMetrics } from './solver.js';
import type { GridValues } from './types.js';

export const shuffle = <T>(items: readonly T[], random: () => number = Math.random): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

/** Creates a completed, randomized Extended Sudoku solution. */
export const generateCompletedGrid = (random: () => number = Math.random): GridValues => {
  const values = emptyGrid();
  const solve = (): boolean => {
    let bestCell = -1;
    let bestCandidates: number[] = [];
    for (const cell of ACTIVE_CELLS) {
      if (values[cell]) continue;
      const options = candidatesFor(values, cell);
      if (!options.length) return false;
      if (bestCell === -1 || options.length < bestCandidates.length) {
        bestCell = cell;
        bestCandidates = options;
        if (options.length === 1) break;
      }
    }
    if (bestCell === -1) return true;
    for (const digit of shuffle(bestCandidates, random)) {
      values[bestCell] = digit;
      if (solve()) return true;
      values[bestCell] = 0;
    }
    return false;
  };
  if (!solve()) throw new Error('Could not generate a completed Extended Sudoku grid.');
  return values;
};

export interface DiggingMetrics {
  uniquenessChecks: number;
  searchNodes: number;
  branches: number;
  forcedPlacements: number;
}
export interface DiggingOptions { random?: () => number; metrics?: DiggingMetrics; }
const recordCheck = (puzzle: readonly number[], metrics?: DiggingMetrics): boolean => {
  const result = countSolutionsWithMetrics(puzzle, 2);
  if (metrics) {
    metrics.uniquenessChecks += 1;
    metrics.searchNodes += result.metrics.nodes;
    metrics.branches += result.metrics.branches;
    metrics.forcedPlacements += result.metrics.forcedPlacements;
  }
  return result.count === 1;
};
/** Removes individual clues while retaining a unique solution. */
export const digSingleCell = (completed: readonly number[], options: DiggingOptions = {}): GridValues => {
  const puzzle = [...completed];
  for (const cell of shuffle(ACTIVE_CELLS, options.random)) {
    const value = puzzle[cell];
    puzzle[cell] = 0;
    if (!recordCheck(puzzle, options.metrics)) puzzle[cell] = value;
  }
  return puzzle;
};

/** Removes rotationally mirrored clue pairs while retaining a unique solution. */
export const digDualCell = (completed: readonly number[], options: DiggingOptions = {}): GridValues => {
  const puzzle = [...completed];
  const tested = new Set<number>();
  const pairs: Array<readonly [number, number]> = [];
  for (const cell of shuffle(ACTIVE_CELLS, options.random)) {
    if (tested.has(cell)) continue;
    const mirror = 143 - cell;
    tested.add(cell);
    tested.add(mirror);
    pairs.push([cell, mirror]);
  }
  for (const [cell, mirror] of pairs) {
    const value = puzzle[cell];
    const mirrorValue = puzzle[mirror];
    puzzle[cell] = 0;
    puzzle[mirror] = 0;
    if (!recordCheck(puzzle, options.metrics)) {
      puzzle[cell] = value;
      puzzle[mirror] = mirrorValue;
    }
  }
  return puzzle;
};
