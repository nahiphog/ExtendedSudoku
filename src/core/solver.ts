import { ACTIVE_CELLS, CELL_UNITS, DIGITS, UNITS, describeCell, isBlackCell, positionOf } from './grid.js';
import { applyPlacement, buildCandidates, candidatesFor, cloneCandidates, removeCandidate, type CandidateMap } from './candidates.js';
import type { CandidateElimination, Digit, GridValues, SolveMove, SolveResult, Technique } from './types.js';

const ALL_DIGITS_MASK = 0x1ff;
// A technique is enabled only after it has direct, unique-puzzle regression
// coverage. Pair and quad variants remain gated until their own trustworthy
// Extended Sudoku fixtures are added.
export const ENABLED_LOGICAL_TECHNIQUES = new Set<Technique>([
  'Naked Single', 'Hidden Single', 'Locked Candidates', 'Naked Pair', 'Naked Triple', 'Hidden Triple',
  'Swordfish', 'Jellyfish', 'Empty Rectangle', 'XY-Wing', 'XYZ-Wing', 'W-Wing',
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

export const findNakedSubset = (candidates: CandidateMap, size: 2 | 3 | 4): SolveMove | null => {
  const technique: Technique = size === 2 ? 'Naked Pair' : size === 3 ? 'Naked Triple' : 'Naked Quad';
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
        `A naked ${size === 2 ? 'pair' : size === 3 ? 'triple' : 'quad'} in ${unitLabel(unitIndex)} removes its digits from other cells in that unit.`);
    }
  }
  return null;
};

export const findHiddenSubset = (candidates: CandidateMap, size: 2 | 3 | 4): SolveMove | null => {
  const technique: Technique = size === 2 ? 'Hidden Pair' : size === 3 ? 'Hidden Triple' : 'Hidden Quad';
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
        `A hidden ${size === 2 ? 'pair' : size === 3 ? 'triple' : 'quad'} in ${unitLabel(unitIndex)} removes other candidates from its cells.`);
    }
  }
  return null;
};

const sees = (left: number, right: number): boolean =>
  CELL_UNITS[left].some((unit) => CELL_UNITS[right].includes(unit));
const commonCandidatePeers = (candidates: CandidateMap, sources: readonly number[], digit: Digit): number[] =>
  Array.from(candidates.keys()).filter((cell) => !sources.includes(cell) && candidates.get(cell)?.has(digit)
    && sources.every((source) => sees(cell, source)));
const sameDigits = (left: ReadonlySet<Digit>, right: ReadonlySet<Digit>): boolean =>
  left.size === right.size && Array.from(left).every((digit) => right.has(digit));

export const findXYWing = (candidates: CandidateMap): SolveMove | null => {
  for (const [pivot, pivotDigits] of candidates) {
    if (pivotDigits.size !== 2) continue;
    const wings = Array.from(candidates.entries()).filter(([cell, digits]) => cell !== pivot && sees(cell, pivot) && digits.size === 2);
    for (const [first, firstDigits] of wings) for (const [second, secondDigits] of wings) {
      if (first >= second) continue;
      const sharedFirst = Array.from(pivotDigits).filter((digit) => firstDigits.has(digit));
      const sharedSecond = Array.from(pivotDigits).filter((digit) => secondDigits.has(digit));
      const z = Array.from(firstDigits).find((digit) => secondDigits.has(digit) && !pivotDigits.has(digit));
      if (sharedFirst.length !== 1 || sharedSecond.length !== 1 || sharedFirst[0] === sharedSecond[0] || !z) continue;
      const eliminations = commonCandidatePeers(candidates, [first, second], z).map((cell) => ({ cell, digit: z }));
      if (eliminations.length) return eliminationMove('XY-Wing', eliminations, [pivot, first, second],
        `XY-Wing: the pivot ${describeCell(pivot)} has candidates {${Array.from(pivotDigits).join(', ')}}. ` +
        `Wing ${describeCell(first)} has {${Array.from(firstDigits).join(', ')}} and shares ${sharedFirst[0]} with the pivot; ` +
        `wing ${describeCell(second)} has {${Array.from(secondDigits).join(', ')}} and shares ${sharedSecond[0]}. ` +
        `Both wings contain ${z}. Whichever pivot candidate is true forces ${z} into one wing, so ${z} is removed from every cell that sees both wings.`);
    }
  }
  return null;
};

export const findXYZWing = (candidates: CandidateMap): SolveMove | null => {
  for (const [pivot, pivotDigits] of candidates) {
    if (pivotDigits.size !== 3) continue;
    const wings = Array.from(candidates.entries()).filter(([cell, digits]) => cell !== pivot && sees(cell, pivot) && digits.size === 2);
    for (const [first, firstDigits] of wings) for (const [second, secondDigits] of wings) {
      if (first >= second) continue;
      const shared = Array.from(firstDigits).filter((digit) => secondDigits.has(digit) && pivotDigits.has(digit));
      const union = new Set([...firstDigits, ...secondDigits]);
      if (shared.length !== 1 || union.size !== 3 || !sameDigits(union as Set<Digit>, pivotDigits)) continue;
      const z = shared[0];
      const eliminations = commonCandidatePeers(candidates, [pivot, first, second], z).map((cell) => ({ cell, digit: z }));
      if (eliminations.length) return eliminationMove('XYZ-Wing', eliminations, [pivot, first, second],
        `XYZ-Wing: pivot ${describeCell(pivot)} has {${Array.from(pivotDigits).join(', ')}}, while its two peer wings ` +
        `${describeCell(first)} {${Array.from(firstDigits).join(', ')}} and ${describeCell(second)} {${Array.from(secondDigits).join(', ')}} ` +
        `together use exactly those same three candidates. The wings share ${z}; therefore a cell that sees the pivot and both wings cannot also contain ${z}, which is eliminated from those common peers.`);
    }
  }
  return null;
};

export const findWWing = (candidates: CandidateMap): SolveMove | null => {
  const bivalue = Array.from(candidates.entries()).filter(([, digits]) => digits.size === 2);
  for (const [first, firstDigits] of bivalue) for (const [second, secondDigits] of bivalue) {
    if (first >= second || sees(first, second) || !sameDigits(firstDigits, secondDigits)) continue;
    for (const strongDigit of firstDigits) {
      const other = Array.from(firstDigits).find((digit) => digit !== strongDigit)!;
      for (let unitIndex = 0; unitIndex < UNITS.length; unitIndex += 1) {
        const unit = UNITS[unitIndex];
        const link = unit.filter((cell) => candidates.get(cell)?.has(strongDigit));
        // A W-Wing's conjugate pair is a separate strong link.  An endpoint
        // cannot double as one of that link's cells: doing so incorrectly
        // turns an ordinary bivalue relationship into a W-Wing.
        if (link.length !== 2 || link.includes(first) || link.includes(second)) continue;
        const connects = (sees(link[0], first) && sees(link[1], second)) || (sees(link[1], first) && sees(link[0], second));
        if (!connects) continue;
        const eliminations = commonCandidatePeers(candidates, [first, second], other).map((cell) => ({ cell, digit: other }));
        if (eliminations.length) return eliminationMove('W-Wing', eliminations, [first, second, ...link],
          `W-Wing: ${describeCell(first)} and ${describeCell(second)} are non-seeing cells with the identical pair ` +
          `{${Array.from(firstDigits).join(', ')}}. In ${unitLabel(unitIndex)}, ${strongDigit} forms the conjugate pair ` +
          `${describeCell(link[0])} / ${describeCell(link[1])}, with one link cell seeing each wing. Because ${strongDigit} must occupy one of those two link cells, ` +
          `the alternative candidate ${other} cannot remain in any cell that sees both W-Wing endpoints.`);
      }
    }
  }
  return null;
};

/** Finds a standard row- or column-based fish, ignoring the black cells. */
export const findBasicFish = (candidates: CandidateMap, size: 3 | 4): SolveMove | null => {
  const technique: Technique = size === 3 ? 'Swordfish' : 'Jellyfish';
  const lineIndexes = Array.from({ length: 12 }, (_, index) => index);
  for (const digit of DIGITS) for (const rowBased of [true, false]) {
    // Build 12-bit masks first, then combine masks. This keeps fish scanning
    // inexpensive even though it is evaluated alongside every other strategy.
    const lineMasks = lineIndexes.map((line) => UNITS[rowBased ? line : 12 + line].reduce((mask, cell) =>
      !isBlackCell(cell) && candidates.get(cell)?.has(digit) ? mask | (1 << (rowBased ? cell % 12 : Math.floor(cell / 12))) : mask, 0));
    const eligibleLines = lineIndexes.filter((line) => {
      const count = bitCount(lineMasks[line]);
      return count >= 2 && count <= size;
    });
    for (const baseLines of combinations(eligibleLines, size)) {
      const coverMask = baseLines.reduce((mask, line) => mask | lineMasks[line], 0);
      // A basic fish has two to `size` candidates in every base line, all
      // restricted to exactly `size` cover lines. Black cells do not appear
      // because candidate maps contain active cells only.
      if (bitCount(coverMask) !== size) continue;
      const coverLines = lineIndexes.filter((line) => coverMask & (1 << line));
      const sourceCells = baseLines.flatMap((line) => UNITS[rowBased ? line : 12 + line]
        .filter((cell) => !isBlackCell(cell) && candidates.get(cell)?.has(digit)));
      const eliminations: CandidateElimination[] = [];
      for (const coverLine of coverLines) for (const otherLine of lineIndexes) {
        if (baseLines.includes(otherLine)) continue;
        const cell = rowBased ? otherLine * 12 + coverLine : coverLine * 12 + otherLine;
        if (!isBlackCell(cell) && candidates.get(cell)?.has(digit)) eliminations.push({ cell, digit });
      }
      if (!eliminations.length) continue;
      const baseName = rowBased ? 'rows' : 'columns';
      const coverName = rowBased ? 'columns' : 'rows';
      return eliminationMove(technique, eliminations, sourceCells,
        `A ${technique} on ${digit} in ${baseName} ${baseLines.map((line) => line + 1).join(', ')} confines it to ${coverName} ${coverLines.map((line) => line + 1).join(', ')}.`);
    }
  }
  return null;
};

export const findEmptyRectangle = (candidates: CandidateMap): SolveMove | null => {
  for (let boxIndex = 24; boxIndex < UNITS.length; boxIndex += 1) for (const digit of DIGITS) {
    const box = UNITS[boxIndex]; const inBox = box.filter((cell) => candidates.get(cell)?.has(digit));
    if (inBox.length < 2) continue;
    const rows = new Set(inBox.map((cell) => Math.floor(cell / 12))); const columns = new Set(inBox.map((cell) => cell % 12));
    for (const row of rows) for (const column of columns) {
      if (!inBox.every((cell) => Math.floor(cell / 12) === row || cell % 12 === column)) continue;
      if (!inBox.some((cell) => Math.floor(cell / 12) === row && cell % 12 !== column) || !inBox.some((cell) => cell % 12 === column && Math.floor(cell / 12) !== row)) continue;
      for (let otherColumn = 0; otherColumn < 12; otherColumn += 1) {
        const link = UNITS[12 + otherColumn].filter((cell) => candidates.get(cell)?.has(digit));
        if (link.length !== 2) continue;
        const near = link.find((cell) => Math.floor(cell / 12) === row); const far = link.find((cell) => Math.floor(cell / 12) !== row);
        if (near === undefined || far === undefined || box.includes(near)) continue;
        const target = Math.floor(far / 12) * 12 + column;
        if (!box.includes(target) && candidates.get(target)?.has(digit)) return eliminationMove('Empty Rectangle', [{ cell: target, digit }], [...inBox, ...link],
          `An Empty Rectangle in ${unitLabel(boxIndex)} and a conjugate pair remove ${digit} from ${describeCell(target)}.`);
      }
    }
  }
  return null;
};

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

type LogicalTechniqueDefinition = {
  technique: Technique;
  difficulty: number;
  find: (candidates: CandidateMap) => SolveMove | null;
};

/** SudokUI / HoDoKu scores used to prefer the simplest available deduction. */
export const LOGICAL_TECHNIQUE_SCORES: Readonly<Partial<Record<Technique, number>>> = Object.freeze({
  'Naked Single': 4,
  'Hidden Single': 14,
  'Locked Candidates': 50,
  'Naked Pair': 60,
  'Hidden Pair': 70,
  'Naked Triple': 80,
  'Hidden Triple': 100,
  'Naked Quad': 120,
  'Empty Rectangle': 120,
  'Hidden Quad': 150,
  'Swordfish': 150,
  'W-Wing': 150,
  'Jellyfish': 160,
  'XY-Wing': 160,
  'XYZ-Wing': 180,
});

// The order is only a deterministic tie-breaker. Unlike the old `??` chain,
// every enabled technique is evaluated before the lowest-score move is chosen.
const LOGICAL_TECHNIQUES: readonly LogicalTechniqueDefinition[] = [
  { technique: 'Naked Single', difficulty: 4, find: findNakedSingle },
  { technique: 'Hidden Single', difficulty: 14, find: findHiddenSingle },
  { technique: 'Locked Candidates', difficulty: 50, find: findLockedCandidates },
  { technique: 'Naked Pair', difficulty: 60, find: (candidates) => findNakedSubset(candidates, 2) },
  { technique: 'Hidden Pair', difficulty: 70, find: (candidates) => findHiddenSubset(candidates, 2) },
  { technique: 'Naked Triple', difficulty: 80, find: (candidates) => findNakedSubset(candidates, 3) },
  { technique: 'Hidden Triple', difficulty: 100, find: (candidates) => findHiddenSubset(candidates, 3) },
  { technique: 'Naked Quad', difficulty: 120, find: (candidates) => findNakedSubset(candidates, 4) },
  { technique: 'Empty Rectangle', difficulty: 120, find: findEmptyRectangle },
  { technique: 'Hidden Quad', difficulty: 150, find: (candidates) => findHiddenSubset(candidates, 4) },
  { technique: 'Swordfish', difficulty: 150, find: (candidates) => findBasicFish(candidates, 3) },
  { technique: 'W-Wing', difficulty: 150, find: findWWing },
  { technique: 'Jellyfish', difficulty: 160, find: (candidates) => findBasicFish(candidates, 4) },
  { technique: 'XY-Wing', difficulty: 160, find: findXYWing },
  { technique: 'XYZ-Wing', difficulty: 180, find: findXYZWing },
];

const moveLeavesViableState = (values: readonly number[], candidates: CandidateMap, move: SolveMove): boolean => {
  const simulatedValues = [...values];
  const simulatedCandidates = cloneCandidates(candidates);
  applyMove(simulatedValues, simulatedCandidates, move);
  return candidateStateIsViable(simulatedValues, simulatedCandidates);
};

const nextLogicalMove = (values: readonly number[], candidates: CandidateMap, solution: readonly number[]): SolveMove | null => {
  let selected: { move: SolveMove; difficulty: number } | null = null;
  for (const definition of LOGICAL_TECHNIQUES) {
    if (!ENABLED_LOGICAL_TECHNIQUES.has(definition.technique)) continue;
    const move = definition.find(candidates);
    // A rejected proposal must not abort the walkthrough or hide another,
    // valid technique that is available from the same candidate state.
    if (!move || moveMatchesSolution(move, candidates, solution) || !moveLeavesViableState(values, candidates, move)) continue;
    if (!selected || definition.difficulty < selected.difficulty) selected = { move, difficulty: definition.difficulty };
  }
  return selected?.move ?? null;
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

  const recordMove = (move: SolveMove): string | null => {
    const moveError = moveMatchesSolution(move, candidates, solution);
    if (moveError) return moveError;
    applyMove(values, candidates, move);
    if (!candidateStateIsViable(values, candidates)) return `${move.technique} leaves an impossible candidate state.`;
    moves.push(move);
    return null;
  };
  const exhaustLogicalMoves = (): string | null => {
    let move = nextLogicalMove(values, candidates, solution);
    while (move) {
      const error = recordMove(move);
      if (error) return error;
      move = nextLogicalMove(values, candidates, solution);
    }
    return null;
  };
  const invalidResult = (walkthroughError: string): SolveResult => ({
    solution, solutionCount: countSolutions(input), moves, usedBruteForce: false,
    walkthroughValid: false, walkthroughError,
  });

  const initialError = exhaustLogicalMoves();
  if (initialError) return invalidResult(initialError);

  if (ACTIVE_CELLS.every((cell) => values[cell])) {
    return { solution: values, solutionCount: 1, moves, usedBruteForce: false, walkthroughValid: true };
  }
  if (!allowBruteForce) return { solution, solutionCount: countSolutions(input), moves, usedBruteForce: false, walkthroughValid: true };

  // A fallback placement is an assumption. After every assumption, exhaust the
  // logical repertoire again; downstream deductions must not be labelled brute
  // force merely because they follow an earlier guess.
  while (!ACTIVE_CELLS.every((cell) => values[cell])) {
    const cell = ACTIVE_CELLS.filter((candidate) => !values[candidate])
      .sort((left, right) => (candidates.get(left)?.size ?? 10) - (candidates.get(right)?.size ?? 10))[0];
    const digit = asDigit(solution[cell]);
    const available = candidates.get(cell);
    if (!available?.has(digit)) return invalidResult(`The fallback value was missing from the recorded candidate state at ${describeCell(cell)}.`);
    const fallback = placementMove('Brute force', cell, digit, [cell],
      `Trial and error places ${digit} at ${describeCell(cell)} after logical techniques are exhausted.`);
    const fallbackError = recordMove(fallback);
    if (fallbackError) return invalidResult(fallbackError);
    const logicalError = exhaustLogicalMoves();
    if (logicalError) return invalidResult(logicalError);
  }
  return { solution: values, solutionCount: countSolutions(input), moves, usedBruteForce: true, walkthroughValid: true };
};
