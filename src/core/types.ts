/** Shared domain types for the Extended Sudoku variant. */

export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type GridValues = number[];

export type Technique =
  | 'Snyder Notation'
  | 'Naked Single'
  | 'Hidden Single'
  | 'Locked Candidates'
  | 'Naked Pair'
  | 'Hidden Pair'
  | 'Naked Quad'
  | 'Hidden Quad'
  | 'Brute force';

export interface CandidateElimination {
  cell: number;
  digit: Digit;
}

export interface SolveMove {
  technique: Technique;
  /** A one-based, user-facing description of the action. */
  explanation: string;
  /** Cell receiving a digit, when this move places one. */
  cell?: number;
  digit?: Digit;
  /** Candidate notes removed by the move. */
  eliminations?: CandidateElimination[];
  /** Cells that justify this move and should be highlighted in the UI. */
  sourceCells: number[];
}

export interface SolveResult {
  solution: GridValues | null;
  solutionCount: number;
  moves: SolveMove[];
  usedBruteForce: boolean;
  /** False only when a proposed walkthrough step fails internal validation. */
  walkthroughValid: boolean;
  walkthroughError?: string;
}

export interface ParsedPuzzle {
  values: GridValues;
  errors: string[];
}
