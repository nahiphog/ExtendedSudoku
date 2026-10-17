import { ACTIVE_CELLS, emptyGrid } from './grid.js';
import { candidatesFor } from './candidates.js';
import { countSolutions } from './solver.js';
export const shuffle = (items) => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
};
/** Creates a completed, randomized Extended Sudoku solution. */
export const generateCompletedGrid = () => {
    const values = emptyGrid();
    const solve = () => {
        let bestCell = -1;
        let bestCandidates = [];
        for (const cell of ACTIVE_CELLS) {
            if (values[cell])
                continue;
            const options = candidatesFor(values, cell);
            if (!options.length)
                return false;
            if (bestCell === -1 || options.length < bestCandidates.length) {
                bestCell = cell;
                bestCandidates = options;
                if (options.length === 1)
                    break;
            }
        }
        if (bestCell === -1)
            return true;
        for (const digit of shuffle(bestCandidates)) {
            values[bestCell] = digit;
            if (solve())
                return true;
            values[bestCell] = 0;
        }
        return false;
    };
    if (!solve())
        throw new Error('Could not generate a completed Extended Sudoku grid.');
    return values;
};
/** Removes individual clues while retaining a unique solution. */
export const digSingleCell = (completed) => {
    const puzzle = [...completed];
    for (const cell of shuffle(ACTIVE_CELLS)) {
        const value = puzzle[cell];
        puzzle[cell] = 0;
        if (countSolutions(puzzle, 2) !== 1)
            puzzle[cell] = value;
    }
    return puzzle;
};
/** Removes rotationally mirrored clue pairs while retaining a unique solution. */
export const digDualCell = (completed) => {
    const puzzle = [...completed];
    const tested = new Set();
    const pairs = [];
    for (const cell of shuffle(ACTIVE_CELLS)) {
        if (tested.has(cell))
            continue;
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
        if (countSolutions(puzzle, 2) !== 1) {
            puzzle[cell] = value;
            puzzle[mirror] = mirrorValue;
        }
    }
    return puzzle;
};
