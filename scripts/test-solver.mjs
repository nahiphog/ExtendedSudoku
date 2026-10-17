import { parsePuzzle } from '../dist/core/grid.js';
import { applyPlacement, buildCandidates, removeCandidate } from '../dist/core/candidates.js';
import { findSolutions, isConsistent, solveWithTechniques } from '../dist/core/solver.js';
import { digSingleCell, generateCompletedGrid } from '../dist/core/generator.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

// A generated Extended Sudoku puzzle previously reported by the UI.  Its first
// logical move is R5C1 = 1, which guards against regressions in candidate state.
const fixture = '4.2...981...8.....3.........2..5.....7.8..........5.46...7.92.3.5..............6.2.73.8...59.1..........3.5.....8..3.........3.....2...294...5.3';
const parsed = parsePuzzle(fixture);
assert(parsed.errors.length === 0, `fixture should parse: ${parsed.errors.join(' ')}`);

const solutions = findSolutions(parsed.values, 2);
assert(solutions.length === 1, 'fixture should have exactly one solution');

const result = solveWithTechniques(parsed.values, true);
assert(result.solution !== null, 'solver should produce a solution');
assert(result.usedBruteForce === false, 'fixture should solve with logical techniques only');
assert(result.moves.length > 0, 'solver should record moves');
assert(result.moves[0].technique === 'Naked Single', 'first move should be a Naked Single');
assert(result.moves[0].cell === 48 && result.moves[0].digit === 1, 'first move should place 1 in R5C1');

// Replay every reported move and require it to be legal before it is recorded.
const replay = [...parsed.values];
const candidates = buildCandidates(replay);
for (const [index, move] of result.moves.entries()) {
  if (move.cell !== undefined) {
    assert(move.digit !== undefined, `move ${index + 1} has a cell without a digit`);
    assert(replay[move.cell] === 0, `move ${index + 1} overwrites an existing value`);
    assert(candidates.get(move.cell)?.has(move.digit), `move ${index + 1} places an unavailable candidate`);
    applyPlacement(replay, candidates, move.cell, move.digit);
  }
  for (const elimination of move.eliminations ?? []) {
    assert(candidates.get(elimination.cell)?.has(elimination.digit), `move ${index + 1} eliminates a missing candidate`);
    removeCandidate(candidates, elimination.cell, elimination.digit);
  }
}
assert(isConsistent(replay), 'replayed walkthrough must remain consistent');
assert(replay.every((digit, cell) => digit === result.solution[cell]), 'replayed moves must produce the reported solution');

const blackCellInput = `${fixture.slice(0, 9)}1${fixture.slice(10)}`;
assert(parsePuzzle(blackCellInput).errors.length > 0, 'a digit in a black cell must be rejected');

const generated = generateCompletedGrid();
assert(isConsistent(generated), 'a generated completed grid must be consistent');
const dug = digSingleCell(generated);
assert(findSolutions(dug, 2).length === 1, 'single-cell digging must retain one solution');

console.log(`Passed ${result.moves.length} validated walkthrough moves.`);
