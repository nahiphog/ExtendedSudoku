import { ACTIVE_CELLS, CELL_UNITS, DIGITS, UNITS, isBlackCell } from './grid.js';
import type { Digit, GridValues } from './types.js';

export type CandidateMap = Map<number, Set<Digit>>;

export const candidatesFor = (values: readonly number[], cell: number): Digit[] => {
  if (isBlackCell(cell) || values[cell]) return [];
  const used = new Set<number>();
  CELL_UNITS[cell].forEach((unitIndex) => {
    UNITS[unitIndex].forEach((peer) => { if (values[peer]) used.add(values[peer]); });
  });
  return DIGITS.filter((digit) => !used.has(digit));
};

export const buildCandidates = (values: readonly number[]): CandidateMap => {
  const candidates: CandidateMap = new Map();
  ACTIVE_CELLS.forEach((cell) => {
    if (!values[cell]) candidates.set(cell, new Set(candidatesFor(values, cell)));
  });
  return candidates;
};

export const cloneCandidates = (candidates: CandidateMap): CandidateMap =>
  new Map(Array.from(candidates, ([cell, digits]) => [cell, new Set(digits)]));

export const removeCandidate = (candidates: CandidateMap, cell: number, digit: Digit): boolean => {
  const cellCandidates = candidates.get(cell);
  if (!cellCandidates || !cellCandidates.has(digit)) return false;
  cellCandidates.delete(digit);
  return true;
};

export const applyPlacement = (values: GridValues, candidates: CandidateMap, cell: number, digit: Digit): void => {
  values[cell] = digit;
  candidates.delete(cell);
  CELL_UNITS[cell].forEach((unitIndex) => {
    UNITS[unitIndex].forEach((peer) => removeCandidate(candidates, peer, digit));
  });
};
