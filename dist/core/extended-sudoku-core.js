/* Generated from TypeScript core modules. */
(function (global) {
const GRID_SIZE = 12;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const BOX_SIZE = 3;
const DIGITS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9]);
/** Top-left, one-based positions of the four black 3×3 boxes. */
const BLACK_BOX_ORIGINS = Object.freeze([
    [1, 10],
    [4, 7],
    [7, 4],
    [10, 1],
]);
const cellAt = (row, column) => row * GRID_SIZE + column;
const positionOf = (cell) => {
    const row = Math.floor(cell / GRID_SIZE);
    const column = cell % GRID_SIZE;
    return { row, column, box: Math.floor(row / BOX_SIZE) * 4 + Math.floor(column / BOX_SIZE) + 1 };
};
const isBlackCell = (cell) => {
    const { row, column } = positionOf(cell);
    return BLACK_BOX_ORIGINS.some(([startRow, startColumn]) => row + 1 >= startRow && row + 1 < startRow + BOX_SIZE &&
        column + 1 >= startColumn && column + 1 < startColumn + BOX_SIZE);
};
const ACTIVE_CELLS = Object.freeze(Array.from({ length: CELL_COUNT }, (_, cell) => cell).filter((cell) => !isBlackCell(cell)));
const buildUnits = () => {
    const units = [];
    for (let row = 0; row < GRID_SIZE; row += 1) {
        units.push(Array.from({ length: GRID_SIZE }, (_, column) => cellAt(row, column)).filter((cell) => !isBlackCell(cell)));
    }
    for (let column = 0; column < GRID_SIZE; column += 1) {
        units.push(Array.from({ length: GRID_SIZE }, (_, row) => cellAt(row, column)).filter((cell) => !isBlackCell(cell)));
    }
    for (let box = 0; box < 16; box += 1) {
        const rowStart = Math.floor(box / 4) * BOX_SIZE;
        const columnStart = (box % 4) * BOX_SIZE;
        const cells = [];
        for (let row = rowStart; row < rowStart + BOX_SIZE; row += 1) {
            for (let column = columnStart; column < columnStart + BOX_SIZE; column += 1) {
                const cell = cellAt(row, column);
                if (!isBlackCell(cell))
                    cells.push(cell);
            }
        }
        if (cells.length)
            units.push(cells);
    }
    return units;
};
const UNITS = Object.freeze(buildUnits().map((unit) => Object.freeze(unit)));
const CELL_UNITS = Object.freeze(Array.from({ length: CELL_COUNT }, () => []).map((unitIndexes, cell) => {
    UNITS.forEach((unit, unitIndex) => { if (unit.includes(cell))
        unitIndexes.push(unitIndex); });
    return Object.freeze(unitIndexes);
}));
const emptyGrid = () => Array(CELL_COUNT).fill(0);
const serializePuzzle = (values) => Array.from({ length: CELL_COUNT }, (_, cell) => {
    const value = isBlackCell(cell) ? 0 : values[cell];
    return value >= 1 && value <= 9 ? String(value) : '.';
}).join('');
/** Parses a 144-character string. Black cells must be represented by periods. */
const parsePuzzle = (input) => {
    const compact = input.replace(/\s/g, '');
    const errors = [];
    const values = emptyGrid();
    if (compact.length !== CELL_COUNT)
        errors.push('A puzzle must contain exactly 144 characters.');
    for (let cell = 0; cell < Math.min(compact.length, CELL_COUNT); cell += 1) {
        const character = compact[cell];
        if (character === '.')
            continue;
        if (!/^[1-9]$/.test(character)) {
            errors.push(`Character ${cell + 1} must be a digit 1–9 or a period.`);
            continue;
        }
        if (isBlackCell(cell)) {
            errors.push(`Character ${cell + 1} is in a black cell and must be a period.`);
            continue;
        }
        values[cell] = Number(character);
    }
    return { values, errors };
};
const describeCell = (cell) => {
    const { row, column, box } = positionOf(cell);
    return `R${row + 1}C${column + 1} (Box ${box})`;
};

const candidatesFor = (values, cell) => {
    if (isBlackCell(cell) || values[cell])
        return [];
    const used = new Set();
    CELL_UNITS[cell].forEach((unitIndex) => {
        UNITS[unitIndex].forEach((peer) => { if (values[peer])
            used.add(values[peer]); });
    });
    return DIGITS.filter((digit) => !used.has(digit));
};
const buildCandidates = (values) => {
    const candidates = new Map();
    ACTIVE_CELLS.forEach((cell) => {
        if (!values[cell])
            candidates.set(cell, new Set(candidatesFor(values, cell)));
    });
    return candidates;
};
const cloneCandidates = (candidates) => new Map(Array.from(candidates, ([cell, digits]) => [cell, new Set(digits)]));
const removeCandidate = (candidates, cell, digit) => {
    const cellCandidates = candidates.get(cell);
    if (!cellCandidates || !cellCandidates.has(digit))
        return false;
    cellCandidates.delete(digit);
    return true;
};
const applyPlacement = (values, candidates, cell, digit) => {
    values[cell] = digit;
    candidates.delete(cell);
    CELL_UNITS[cell].forEach((unitIndex) => {
        UNITS[unitIndex].forEach((peer) => removeCandidate(candidates, peer, digit));
    });
};

const ALL_DIGITS_MASK = 0x1ff;
const digitMask = (digit) => 1 << (digit - 1);
const bitCount = (value) => {
    let count = 0;
    let remaining = value;
    while (remaining) {
        remaining &= remaining - 1;
        count += 1;
    }
    return count;
};
const isConsistent = (values) => {
    if (values.length !== 144)
        return false;
    return UNITS.every((unit) => {
        const seen = new Set();
        return unit.every((cell) => {
            const value = values[cell];
            if (!value)
                return true;
            if (!Number.isInteger(value) || value < 1 || value > 9 || seen.has(value))
                return false;
            seen.add(value);
            return true;
        });
    }) && values.every((value, cell) => !isBlackCell(cell) || value === 0);
};
/** Counts solutions with MRV backtracking, stopping at `limit`. */
const countSolutions = (input, limit = 2) => {
    if (!isConsistent(input))
        return 0;
    const values = [...input];
    const masks = UNITS.map((unit) => unit.reduce((mask, cell) => mask | (values[cell] ? digitMask(values[cell]) : 0), 0));
    let found = 0;
    const search = () => {
        if (found >= limit)
            return;
        let bestCell = -1;
        let bestMask = 0;
        let bestCount = 10;
        for (const cell of ACTIVE_CELLS) {
            if (values[cell])
                continue;
            let used = 0;
            CELL_UNITS[cell].forEach((unitIndex) => { used |= masks[unitIndex]; });
            const options = ALL_DIGITS_MASK & ~used;
            const optionCount = bitCount(options);
            if (!optionCount)
                return;
            if (optionCount < bestCount) {
                bestCell = cell;
                bestMask = options;
                bestCount = optionCount;
                if (optionCount === 1)
                    break;
            }
        }
        if (bestCell === -1) {
            found += 1;
            return;
        }
        for (const digit of DIGITS) {
            const flag = digitMask(digit);
            if (!(bestMask & flag))
                continue;
            values[bestCell] = digit;
            CELL_UNITS[bestCell].forEach((unitIndex) => { masks[unitIndex] |= flag; });
            search();
            values[bestCell] = 0;
            CELL_UNITS[bestCell].forEach((unitIndex) => { masks[unitIndex] &= ~flag; });
            if (found >= limit)
                return;
        }
    };
    search();
    return found;
};
/** Returns one complete solution, or null if none exists. */
const solveOne = (input) => {
    if (!isConsistent(input))
        return null;
    const values = [...input];
    const search = () => {
        let bestCell = -1;
        let choices = [];
        for (const cell of ACTIVE_CELLS) {
            if (values[cell])
                continue;
            const possible = candidatesFor(values, cell);
            if (!possible.length)
                return false;
            if (bestCell === -1 || possible.length < choices.length) {
                bestCell = cell;
                choices = possible;
                if (choices.length === 1)
                    break;
            }
        }
        if (bestCell === -1)
            return true;
        for (const digit of choices) {
            values[bestCell] = digit;
            if (search())
                return true;
            values[bestCell] = 0;
        }
        return false;
    };
    return search() ? values : null;
};
/** Finds up to `limit` concrete solutions for verification and comparison views. */
const findSolutions = (input, limit = 2) => {
    if (!isConsistent(input) || limit < 1)
        return [];
    const values = [...input];
    const results = [];
    const search = () => {
        if (results.length >= limit)
            return;
        let bestCell = -1;
        let choices = [];
        for (const cell of ACTIVE_CELLS) {
            if (values[cell])
                continue;
            const possible = candidatesFor(values, cell);
            if (!possible.length)
                return;
            if (bestCell === -1 || possible.length < choices.length) {
                bestCell = cell;
                choices = possible;
                if (choices.length === 1)
                    break;
            }
        }
        if (bestCell === -1) {
            results.push([...values]);
            return;
        }
        for (const digit of choices) {
            values[bestCell] = digit;
            search();
            values[bestCell] = 0;
            if (results.length >= limit)
                return;
        }
    };
    search();
    return results;
};
const unitLabel = (unitIndex) => {
    if (unitIndex < 12)
        return `row ${unitIndex + 1}`;
    if (unitIndex < 24)
        return `column ${unitIndex - 11}`;
    return `Box ${positionOf(UNITS[unitIndex][0]).box}`;
};
const combinations = (items, size) => {
    if (size === 0)
        return [[]];
    if (items.length < size)
        return [];
    const result = [];
    items.forEach((item, index) => {
        combinations(items.slice(index + 1), size - 1).forEach((tail) => result.push([item, ...tail]));
    });
    return result;
};
const asDigit = (value) => value;
const placementMove = (technique, cell, digit, sourceCells, explanation) => ({
    technique,
    cell,
    digit,
    sourceCells,
    explanation,
});
const eliminationMove = (technique, eliminations, sourceCells, explanation) => ({
    technique,
    eliminations,
    sourceCells,
    explanation,
});
const findNakedSingle = (candidates) => {
    for (const [cell, digits] of candidates) {
        if (digits.size !== 1)
            continue;
        const digit = asDigit(Array.from(digits)[0]);
        return placementMove('Naked Single', cell, digit, [cell], `${describeCell(cell)} has only ${digit} as a candidate.`);
    }
    return null;
};
const findHiddenSingle = (candidates) => {
    for (let unitIndex = 0; unitIndex < UNITS.length; unitIndex += 1) {
        const unit = UNITS[unitIndex];
        for (const digit of DIGITS) {
            const matches = unit.filter((cell) => candidates.get(cell)?.has(digit));
            if (matches.length !== 1)
                continue;
            const cell = matches[0];
            return placementMove('Hidden Single', cell, digit, matches, `${digit} can appear only at ${describeCell(cell)} in ${unitLabel(unitIndex)}.`);
        }
    }
    return null;
};
const findLockedCandidates = (candidates) => {
    // Pointing: all candidates for a digit in a box lie on the same row/column.
    for (let boxUnit = 24; boxUnit < UNITS.length; boxUnit += 1) {
        const box = UNITS[boxUnit];
        for (const digit of DIGITS) {
            const sources = box.filter((cell) => candidates.get(cell)?.has(digit));
            if (sources.length < 2)
                continue;
            const sourceRows = new Set(sources.map((cell) => Math.floor(cell / 12)));
            const sourceColumns = new Set(sources.map((cell) => cell % 12));
            if (sourceRows.size === 1) {
                const row = Array.from(sourceRows)[0];
                const eliminations = UNITS[row].filter((cell) => !box.includes(cell) && candidates.get(cell)?.has(digit))
                    .map((cell) => ({ cell, digit }));
                if (eliminations.length)
                    return eliminationMove('Locked Candidates', eliminations, sources, `${digit} is locked in ${unitLabel(boxUnit)} on row ${row + 1}.`);
            }
            if (sourceColumns.size === 1) {
                const column = Array.from(sourceColumns)[0];
                const eliminations = UNITS[12 + column].filter((cell) => !box.includes(cell) && candidates.get(cell)?.has(digit))
                    .map((cell) => ({ cell, digit }));
                if (eliminations.length)
                    return eliminationMove('Locked Candidates', eliminations, sources, `${digit} is locked in ${unitLabel(boxUnit)} on column ${column + 1}.`);
            }
        }
    }
    // Claiming: all candidates for a digit in a row/column lie in the same box.
    for (let unitIndex = 0; unitIndex < 24; unitIndex += 1) {
        const unit = UNITS[unitIndex];
        for (const digit of DIGITS) {
            const sources = unit.filter((cell) => candidates.get(cell)?.has(digit));
            if (sources.length < 2)
                continue;
            const commonBoxUnits = CELL_UNITS[sources[0]].filter((candidateUnit) => candidateUnit >= 24 &&
                sources.every((cell) => CELL_UNITS[cell].includes(candidateUnit)));
            if (commonBoxUnits.length !== 1)
                continue;
            const boxUnit = commonBoxUnits[0];
            const eliminations = UNITS[boxUnit].filter((cell) => !unit.includes(cell) && candidates.get(cell)?.has(digit))
                .map((cell) => ({ cell, digit }));
            if (eliminations.length)
                return eliminationMove('Locked Candidates', eliminations, sources, `${digit} in ${unitLabel(unitIndex)} is confined to ${unitLabel(boxUnit)}.`);
        }
    }
    return null;
};
const findNakedSubset = (candidates, size) => {
    const technique = size === 2 ? 'Naked Pair' : 'Naked Quad';
    for (let unitIndex = 0; unitIndex < UNITS.length; unitIndex += 1) {
        const unit = UNITS[unitIndex];
        const unsolved = unit.filter((cell) => {
            const digits = candidates.get(cell);
            return digits && digits.size >= 2 && digits.size <= size;
        });
        for (const sourceCells of combinations(unsolved, size)) {
            const digits = new Set();
            sourceCells.forEach((cell) => candidates.get(cell)?.forEach((digit) => digits.add(digit)));
            if (digits.size !== size)
                continue;
            const eliminations = [];
            unit.filter((cell) => !sourceCells.includes(cell)).forEach((cell) => {
                digits.forEach((digit) => {
                    if (candidates.get(cell)?.has(asDigit(digit)))
                        eliminations.push({ cell, digit: asDigit(digit) });
                });
            });
            if (eliminations.length)
                return eliminationMove(technique, eliminations, sourceCells, `${size === 2 ? 'A naked pair' : 'A naked quad'} in ${unitLabel(unitIndex)} removes its digits from other cells in that unit.`);
        }
    }
    return null;
};
const findHiddenSubset = (candidates, size) => {
    const technique = size === 2 ? 'Hidden Pair' : 'Hidden Quad';
    for (let unitIndex = 0; unitIndex < UNITS.length; unitIndex += 1) {
        const unit = UNITS[unitIndex];
        for (const digits of combinations(DIGITS, size)) {
            const sourceCells = unit.filter((cell) => digits.some((digit) => candidates.get(cell)?.has(digit)));
            if (sourceCells.length !== size)
                continue;
            const digitSet = new Set(digits);
            const eliminations = [];
            sourceCells.forEach((cell) => candidates.get(cell)?.forEach((candidate) => {
                if (!digitSet.has(candidate))
                    eliminations.push({ cell, digit: candidate });
            }));
            if (eliminations.length)
                return eliminationMove(technique, eliminations, sourceCells, `${size === 2 ? 'A hidden pair' : 'A hidden quad'} in ${unitLabel(unitIndex)} removes other candidates from its cells.`);
        }
    }
    return null;
};
const nextLogicalMove = (candidates) => findNakedSingle(candidates)
    ?? findHiddenSingle(candidates)
    ?? findLockedCandidates(candidates)
    ?? findNakedSubset(candidates, 2)
    ?? findHiddenSubset(candidates, 2)
    ?? findNakedSubset(candidates, 4)
    ?? findHiddenSubset(candidates, 4);
const applyMove = (values, candidates, move) => {
    if (move.cell !== undefined && move.digit !== undefined) {
        applyPlacement(values, candidates, move.cell, move.digit);
    }
    move.eliminations?.forEach(({ cell, digit }) => removeCandidate(candidates, cell, digit));
};
/**
 * Applies supported human-style techniques until they are exhausted.  Only then,
 * when allowed, it records remaining placements as a clearly-labelled brute-force
 * fallback.  Each recorded placement is made into the displayed state first.
 */
const solveWithTechniques = (input, allowBruteForce = true) => {
    if (!isConsistent(input))
        return { solution: null, solutionCount: 0, moves: [], usedBruteForce: false };
    const values = [...input];
    const candidates = buildCandidates(values);
    const moves = [];
    let move = nextLogicalMove(candidates);
    while (move) {
        applyMove(values, candidates, move);
        moves.push(move);
        move = nextLogicalMove(candidates);
    }
    if (ACTIVE_CELLS.every((cell) => values[cell])) {
        return { solution: values, solutionCount: 1, moves, usedBruteForce: false };
    }
    const solution = solveOne(values);
    if (!solution)
        return { solution: null, solutionCount: 0, moves, usedBruteForce: false };
    if (!allowBruteForce)
        return { solution, solutionCount: countSolutions(input), moves, usedBruteForce: false };
    ACTIVE_CELLS.forEach((cell) => {
        if (values[cell])
            return;
        const digit = asDigit(solution[cell]);
        const available = candidates.get(cell);
        if (!available?.has(digit))
            throw new Error(`Invalid fallback placement at ${describeCell(cell)}.`);
        const fallback = placementMove('Brute force', cell, digit, [cell], `Trial and error places ${digit} at ${describeCell(cell)} after logical techniques are exhausted.`);
        applyMove(values, candidates, fallback);
        moves.push(fallback);
    });
    return { solution: values, solutionCount: countSolutions(input), moves, usedBruteForce: true };
};

const shuffle = (items) => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
};
/** Creates a completed, randomized Extended Sudoku solution. */
const generateCompletedGrid = () => {
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
const digSingleCell = (completed) => {
    const puzzle = [...completed];
    for (const cell of shuffle(ACTIVE_CELLS)) {
        const value = puzzle[cell];
        puzzle[cell] = 0;
        if (countSolutions(puzzle, 2) !== 1)
            puzzle[cell] = value;
    }
    return puzzle;
};

  global.ExtendedSudokuCore = { ACTIVE_CELLS, describeCell, isBlackCell, positionOf, parsePuzzle, applyPlacement, buildCandidates, removeCandidate, findSolutions, solveWithTechniques, generateCompletedGrid, digSingleCell };
}(window));
