import { ACTIVE_CELLS, emptyGrid } from './grid.js';
import { candidatesFor } from './candidates.js';
import { countSolutions } from './solver.js';
import type { GridValues } from './types.js';

export const shuffle = <T>(items: readonly T[]): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
};

/** Creates a completed, randomized Extended Sudoku solution. */
export const generateCompletedGrid = (): GridValues => {
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
    for (const digit of shuffle(bestCandidates)) {
      values[bestCell] = digit;
      if (solve()) return true;
      values[bestCell] = 0;
    }
    return false;
  };
  if (!solve()) throw new Error('Could not generate a completed Extended Sudoku grid.');
  return values;
};

/** Removes individual clues while retaining a unique solution. */
export const digSingleCell = (completed: readonly number[]): GridValues => {
  const puzzle = [...completed];
  for (const cell of shuffle(ACTIVE_CELLS)) {
    const value = puzzle[cell];
    puzzle[cell] = 0;
    if (countSolutions(puzzle, 2) !== 1) puzzle[cell] = value;
  }
  return puzzle;
};
