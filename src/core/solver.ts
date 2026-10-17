import { ACTIVE_CELLS, CELL_UNITS, DIGITS, UNITS, describeCell, isBlackCell, positionOf } from './grid.js';
import { applyPlacement, buildCandidates, candidatesFor, removeCandidate, type CandidateMap } from './candidates.js';
import type { CandidateElimination, Digit, GridValues, SolveMove, SolveResult, Technique } from './types.js';

const ALL_DIGITS_MASK = 0x1ff;
// A technique is enabled only after it has direct, unique-puzzle regression
// coverage. Hidden Pair and the quad rules remain implemented but gated until
// their own trustworthy Extended Sudoku fixtures are added.
export const ENABLED_LOGICAL_TECHNIQUES = new Set<Technique>([
  'Naked Single', 'Hidden Single', 'Locked Candidates', 'Naked Pair',
]);
const digitMask = (digit: number): number => 1 << (digit - 1);
const bitCount = (value: number): number => {
  let count = 0;
  let remaining = value;
  while (remaining) { remaining &= remaining - 1; count += 1; }
  return count;
};

export const isConsistent = (values: readonly number[]): boolean => {
  if (values.length !== 144) return false;
  return UNITS.every((unit) => {
    const seen = new Set<number>();
    return unit.every((cell) => {
      const value = values[cell];
      if (!value) return true;
      if (!Number.isInteger(value) || value < 1 || value > 9 || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }) && values.every((value, cell) => !isBlackCell(cell) || value === 0);
};

/** Counts solutions with MRV backtracking, stopping at `limit`. */
export const countSolutions = (input: readonly number[], limit = 2): number => {
  if (!isConsistent(input)) return 0;
  const values = [...input];
  const masks = UNITS.map((unit) => unit.reduce((mask, cell) => mask | (values[cell] ? digitMask(values[cell]) : 0), 0));
  let found = 0;

  const search = (): void => {
    if (found >= limit) return;
    let bestCell = -1;
    let bestMask = 0;
    let bestCount = 10;
    for (const cell of ACTIVE_CELLS) {
      if (values[cell]) continue;
      let used = 0;
      CELL_UNITS[cell].forEach((unitIndex) => { used |= masks[unitIndex]; });
      const options = ALL_DIGITS_MASK & ~used;
      const optionCount = bitCount(options);
      if (!optionCount) return;
      if (optionCount < bestCount) {
        bestCell = cell;
        bestMask = options;
        bestCount = optionCount;
        if (optionCount === 1) break;
      }
    }
    if (bestCell === -1) { found += 1; return; }
    for (const digit of DIGITS) {
      const flag = digitMask(digit);
      if (!(bestMask & flag)) continue;
      values[bestCell] = digit;
      CELL_UNITS[bestCell].forEach((unitIndex) => { masks[unitIndex] |= flag; });
      search();
      values[bestCell] = 0;
      CELL_UNITS[bestCell].forEach((unitIndex) => { masks[unitIndex] &= ~flag; });
      if (found >= limit) return;
    }
  };

  search();
  return found;
};

/** Returns one complete solution, or null if none exists. */
export const solveOne = (input: readonly number[]): GridValues | null => {
  if (!isConsistent(input)) return null;
  const values = [...input];
  const search = (): boolean => {
    let bestCell = -1;
    let choices: Digit[] = [];
    for (const cell of ACTIVE_CELLS) {
      if (values[cell]) continue;
      const possible = candidatesFor(values, cell);
      if (!possible.length) return false;
      if (bestCell === -1 || possible.length < choices.length) {
        bestCell = cell;
        choices = possible;
        if (choices.length === 1) break;
      }
    }
    if (bestCell === -1) return true;
    for (const digit of choices) {
      values[bestCell] = digit;
      if (search()) return true;
      values[bestCell] = 0;
    }
    return false;
  };
  return search() ? values : null;
};

/** Finds up to `limit` concrete solutions for verification and comparison views. */
export const findSolutions = (input: readonly number[], limit = 2): GridValues[] => {
  if (!isConsistent(input) || limit < 1) return [];
  const values = [...input];
  const results: GridValues[] = [];
  const search = (): void => {
    if (results.length >= limit) return;
    let bestCell = -1;
    let choices: Digit[] = [];
    for (const cell of ACTIVE_CELLS) {
      if (values[cell]) continue;
      const possible = candidatesFor(values, cell);
      if (!possible.length) return;
      if (bestCell === -1 || possible.length < choices.length) {
        bestCell = cell;
        choices = possible;
        if (choices.length === 1) break;
      }
    }
    if (bestCell === -1) { results.push([...values]); return; }
    for (const digit of choices) {
      values[bestCell] = digit;
      search();
      values[bestCell] = 0;
      if (results.length >= limit) return;
    }
  };
  search();
  return results;
};

const unitLabel = (unitIndex: number): string => {
  if (unitIndex < 12) return `row ${unitIndex + 1}`;
  if (unitIndex < 24) return `column ${unitIndex - 11}`;
  return `Box ${positionOf(UNITS[unitIndex][0]).box}`;
};

const combinations = <T>(items: readonly T[], size: number): T[][] => {
  if (size === 0) return [[]];
  if (items.length < size) return [];
  const result: T[][] = [];
  items.forEach((item, index) => {
    combinations(items.slice(index + 1), size - 1).forEach((tail) => result.push([item, ...tail]));
  });
  return result;
};

const asDigit = (value: number): Digit => value as Digit;
const placementMove = (technique: Technique, cell: number, digit: Digit, sourceCells: number[], explanation: string): SolveMove => ({
  technique,
  cell,
  digit,
  sourceCells,
  explanation,
});

const eliminationMove = (technique: Technique, eliminations: CandidateElimination[], sourceCells: number[], explanation: string): SolveMove => ({
  technique,
  eliminations,
  sourceCells,
  explanation,
});

const findNakedSingle = (candidates: CandidateMap): SolveMove | null => {
  for (const [cell, digits] of candidates) {
    if (digits.size !== 1) continue;
    const digit = asDigit(Array.from(digits)[0]);
    return placementMove('Naked Single', cell, digit, [cell], `${describeCell(cell)} has only ${digit} as a candidate.`);
  }
  return null;
};

const findHiddenSingle = (candidates: CandidateMap): SolveMove | null => {
  for (let unitIndex = 0; unitIndex < UNITS.length; unitIndex += 1) {
    const unit = UNITS[unitIndex];
    for (const digit of DIGITS) {
      const matches = unit.filter((cell) => candidates.get(cell)?.has(digit));
      if (matches.length !== 1) continue;
      const cell = matches[0];
      return placementMove('Hidden Single', cell, digit, matches, `${digit} can appear only at ${describeCell(cell)} in ${unitLabel(unitIndex)}.`);
    }
  }
  return null;
};

const findLockedCandidates = (candidates: CandidateMap): SolveMove | null => {
  // Pointing: all candidates for a digit in a box lie on the same row/column.
  for (let boxUnit = 24; boxUnit < UNITS.length; boxUnit += 1) {
    const box = UNITS[boxUnit];
    for (const digit of DIGITS) {
      const sources = box.filter((cell) => candidates.get(cell)?.has(digit));
      if (sources.length < 2) continue;
      const sourceRows = new Set(sources.map((cell) => Math.floor(cell / 12)));
      const sourceColumns = new Set(sources.map((cell) => cell % 12));
      if (sourceRows.size === 1) {
        const row = Array.from(sourceRows)[0];
        const eliminations = UNITS[row].filter((cell) => !box.includes(cell) && candidates.get(cell)?.has(digit))
          .map((cell) => ({ cell, digit }));
        if (eliminations.length) return eliminationMove('Locked Candidates', eliminations, sources,
          `${digit} is locked in ${unitLabel(boxUnit)} on row ${row + 1}.`);
      }
      if (sourceColumns.size === 1) {
        const column = Array.from(sourceColumns)[0];
        const eliminations = UNITS[12 + column].filter((cell) => !box.includes(cell) && candidates.get(cell)?.has(digit))
          .map((cell) => ({ cell, digit }));
        if (eliminations.length) return eliminationMove('Locked Candidates', eliminations, sources,
          `${digit} is locked in ${unitLabel(boxUnit)} on column ${column + 1}.`);
      }
    }
  }

  // Claiming: all candidates for a digit in a row/column lie in the same box.
  for (let unitIndex = 0; unitIndex < 24; unitIndex += 1) {
    const unit = UNITS[unitIndex];
    for (const digit of DIGITS) {
      const sources = unit.filter((cell) => candidates.get(cell)?.has(digit));
      if (sources.length < 2) continue;
      const commonBoxUnits = CELL_UNITS[sources[0]].filter((candidateUnit) => candidateUnit >= 24 &&
        sources.every((cell) => CELL_UNITS[cell].includes(candidateUnit)));
      if (commonBoxUnits.length !== 1) continue;
      const boxUnit = commonBoxUnits[0];
      const eliminations = UNITS[boxUnit].filter((cell) => !unit.includes(cell) && candidates.get(cell)?.has(digit))
        .map((cell) => ({ cell, digit }));
      if (eliminations.length) return eliminationMove('Locked Candidates', eliminations, sources,
        `${digit} in ${unitLabel(unitIndex)} is confined to ${unitLabel(boxUnit)}.`);
    }
  }
  return null;
};

const findNakedSubset = (candidates: CandidateMap, size: 2 | 4): SolveMove | null => {
  const technique: Technique = size === 2 ? 'Naked Pair' : 'Naked Quad';
  for (let unitIndex = 0; unitIndex < UNITS.length; unitIndex += 1) {
    const unit = UNITS[unitIndex];
    const unsolved = unit.filter((cell) => {
      const digits = candidates.get(cell);
      return digits && digits.size >= 2 && digits.size <= size;
    });
    for (const sourceCells of combinations(unsolved, size)) {
      const digits = new Set<number>();
      sourceCells.forEach((cell) => candidates.get(cell)?.forEach((digit) => digits.add(digit)));
      if (digits.size !== size) continue;
      const eliminations: CandidateElimination[] = [];
      unit.filter((cell) => !sourceCells.includes(cell)).forEach((cell) => {
        digits.forEach((digit) => {
          if (candidates.get(cell)?.has(asDigit(digit))) eliminations.push({ cell, digit: asDigit(digit) });
        });
      });
      if (eliminations.length) return eliminationMove(technique, eliminations, sourceCells,
        `${size === 2 ? 'A naked pair' : 'A naked quad'} in ${unitLabel(unitIndex)} removes its digits from other cells in that unit.`);
    }
  }
  return null;
};

const findHiddenSubset = (candidates: CandidateMap, size: 2 | 4): SolveMove | null => {
  const technique: Technique = size === 2 ? 'Hidden Pair' : 'Hidden Quad';
  for (let unitIndex = 0; unitIndex < UNITS.length; unitIndex += 1) {
    const unit = UNITS[unitIndex];
    for (const digits of combinations(DIGITS, size)) {
      // Each digit must actually occur. Without this check a missing digit can
      // masquerade as part of a hidden subset and remove a valid candidate.
      const locations = digits.map((digit) => unit.filter((cell) => candidates.get(cell)?.has(digit)));
      if (locations.some((cells) => cells.length === 0)) continue;
      const sourceCells = Array.from(new Set(locations.flat()));
      if (sourceCells.length !== size) continue;
      const digitSet = new Set<number>(digits);
      const eliminations: CandidateElimination[] = [];
      sourceCells.forEach((cell) => candidates.get(cell)?.forEach((candidate) => {
        if (!digitSet.has(candidate)) eliminations.push({ cell, digit: candidate });
      }));
      if (eliminations.length) return eliminationMove(technique, eliminations, sourceCells,
        `${size === 2 ? 'A hidden pair' : 'A hidden quad'} in ${unitLabel(unitIndex)} removes other candidates from its cells.`);
    }
  }
  return null;
};

const nextLogicalMove = (candidates: CandidateMap): SolveMove | null =>
  (ENABLED_LOGICAL_TECHNIQUES.has('Naked Single') ? findNakedSingle(candidates) : null)
  ?? (ENABLED_LOGICAL_TECHNIQUES.has('Hidden Single') ? findHiddenSingle(candidates) : null)
  ?? (ENABLED_LOGICAL_TECHNIQUES.has('Locked Candidates') ? findLockedCandidates(candidates) : null)
  ?? (ENABLED_LOGICAL_TECHNIQUES.has('Naked Pair') ? findNakedSubset(candidates, 2) : null)
  ?? (ENABLED_LOGICAL_TECHNIQUES.has('Hidden Pair') ? findHiddenSubset(candidates, 2) : null)
  ?? (ENABLED_LOGICAL_TECHNIQUES.has('Naked Quad') ? findNakedSubset(candidates, 4) : null)
  ?? (ENABLED_LOGICAL_TECHNIQUES.has('Hidden Quad') ? findHiddenSubset(candidates, 4) : null);

const applyMove = (values: GridValues, candidates: CandidateMap, move: SolveMove): void => {
  if (move.cell !== undefined && move.digit !== undefined) {
    applyPlacement(values, candidates, move.cell, move.digit);
  }
  move.eliminations?.forEach(({ cell, digit }) => removeCandidate(candidates, cell, digit));
};

const candidateStateIsViable = (values: readonly number[], candidates: CandidateMap): boolean => {
  for (const cell of ACTIVE_CELLS) {
    if (!values[cell] && !(candidates.get(cell)?.size)) return false;
  }
  return UNITS.every((unit) => {
    const placed = new Set(unit.map((cell) => values[cell]).filter(Boolean));
    return DIGITS.every((digit) => placed.has(digit)
      || unit.some((cell) => !values[cell] && candidates.get(cell)?.has(digit)));
  });
};

const moveMatchesSolution = (move: SolveMove, candidates: CandidateMap, solution: readonly number[]): string | null => {
  if (move.cell !== undefined && move.digit !== undefined) {
    if (!candidates.get(move.cell)?.has(move.digit)) return `${move.technique} places an unavailable candidate at ${describeCell(move.cell)}.`;
    if (solution[move.cell] !== move.digit) return `${move.technique} conflicts with the solved value at ${describeCell(move.cell)}.`;
  }
  for (const { cell, digit } of move.eliminations ?? []) {
    if (!candidates.get(cell)?.has(digit)) return `${move.technique} removes an unavailable candidate at ${describeCell(cell)}.`;
    if (solution[cell] === digit) return `${move.technique} removes the solved value at ${describeCell(cell)}.`;
  }
  return null;
};

/**
 * Applies supported human-style techniques until they are exhausted.  Only then,
 * when allowed, it records remaining placements as a clearly-labelled brute-force
 * fallback.  Each recorded placement is made into the displayed state first.
 */
export const solveWithTechniques = (input: readonly number[], allowBruteForce = true): SolveResult => {
  if (!isConsistent(input)) return { solution: null, solutionCount: 0, moves: [], usedBruteForce: false, walkthroughValid: false, walkthroughError: 'The givens are inconsistent.' };
  const solution = solveOne(input);
  if (!solution) return { solution: null, solutionCount: 0, moves: [], usedBruteForce: false, walkthroughValid: false, walkthroughError: 'The puzzle has no solution.' };
  const values = [...input];
  const candidates = buildCandidates(values);
  const moves: SolveMove[] = [];
  let move = nextLogicalMove(candidates);
  while (move) {
    const moveError = moveMatchesSolution(move, candidates, solution);
    if (moveError) return {
      solution, solutionCount: countSolutions(input), moves, usedBruteForce: false,
      walkthroughValid: false, walkthroughError: moveError,
    };
    applyMove(values, candidates, move);
    if (!candidateStateIsViable(values, candidates)) return {
      solution, solutionCount: countSolutions(input), moves, usedBruteForce: false,
      walkthroughValid: false, walkthroughError: `${move.technique} leaves an impossible candidate state.`,
    };
    moves.push(move);
    move = nextLogicalMove(candidates);
  }

  if (ACTIVE_CELLS.every((cell) => values[cell])) {
    return { solution: values, solutionCount: 1, moves, usedBruteForce: false, walkthroughValid: true };
  }
  if (!allowBruteForce) return { solution, solutionCount: countSolutions(input), moves, usedBruteForce: false, walkthroughValid: true };

  for (const cell of ACTIVE_CELLS) {
    if (values[cell]) continue;
    const digit = asDigit(solution[cell]);
    const available = candidates.get(cell);
    if (!available?.has(digit)) return {
      solution, solutionCount: countSolutions(input), moves, usedBruteForce: false,
      walkthroughValid: false, walkthroughError: `The fallback value was missing from the recorded candidate state at ${describeCell(cell)}.`,
    };
    const fallback = placementMove('Brute force', cell, digit, [cell],
      `Trial and error places ${digit} at ${describeCell(cell)} after logical techniques are exhausted.`);
    applyMove(values, candidates, fallback);
    moves.push(fallback);
    if (!candidateStateIsViable(values, candidates)) return {
      solution, solutionCount: countSolutions(input), moves, usedBruteForce: false,
      walkthroughValid: false, walkthroughError: `Brute force leaves an impossible candidate state at ${describeCell(cell)}.`,
    };
  }
  return { solution: values, solutionCount: countSolutions(input), moves, usedBruteForce: true, walkthroughValid: true };
};
