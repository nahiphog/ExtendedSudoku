import { cellAt, parsePuzzle } from '../dist/core/grid.js';
import { applyPlacement, buildCandidates, removeCandidate } from '../dist/core/candidates.js';
import { ENABLED_LOGICAL_TECHNIQUES, findEmptyRectangle, findHiddenSubset, findNakedSubset, findSolutions, findWWing, findXYWing, findXYZWing, isConsistent, solveWithTechniques } from '../dist/core/solver.js';
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
assert(result.walkthroughValid, 'fixture walkthrough should pass internal validation');
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

// Regression: both reported Verify-page strings are valid unique puzzles. The
// second one previously caused an invalid Hidden Pair to eliminate R3C9 = 7.
const verifyFixtures = [
  '..8..5..7.....13..2.6...42.7...5.....7.56.......2..............4.2....1..1....6.9..............6.......23.9.....8...1.54...2.4..56.....6..4..3..',
  '..1..58.....8.4....9....2..6........3............45......1.2....76...............4..4.2...3...8........6..37.....7..4......2..9.3.7....48..5...3',
];
const exercisedTechniques = new Set();
for (const [fixtureIndex, text] of verifyFixtures.entries()) {
  const fixtureParsed = parsePuzzle(text);
  assert(fixtureParsed.errors.length === 0, `verify fixture ${fixtureIndex + 1} should parse`);
  const fixtureSolutions = findSolutions(fixtureParsed.values, 2);
  assert(fixtureSolutions.length === 1, `verify fixture ${fixtureIndex + 1} should be unique`);
  const fixtureResult = solveWithTechniques(fixtureParsed.values, true);
  assert(fixtureResult.solution !== null, `verify fixture ${fixtureIndex + 1} should solve`);
  assert(fixtureResult.walkthroughValid, `verify fixture ${fixtureIndex + 1} walkthrough should be valid`);
  fixtureResult.moves.forEach((move, moveIndex) => {
    if (move.technique !== 'Brute force') exercisedTechniques.add(move.technique);
    if (move.cell !== undefined) assert(move.digit === fixtureResult.solution[move.cell], `fixture ${fixtureIndex + 1}, move ${moveIndex + 1} must place the solved value`);
    for (const elimination of move.eliminations ?? []) {
      assert(elimination.digit !== fixtureResult.solution[elimination.cell], `fixture ${fixtureIndex + 1}, move ${moveIndex + 1} must not eliminate a solved value`);
    }
  });
}
const candidateMap = (entries) => new Map(entries.map(([cell, digits]) => [cell, new Set(digits)]));
const assertEliminates = (move, technique, cell, digit) => {
  assert(move?.technique === technique, `${technique} detector should identify its pattern`);
  assert(move.eliminations?.some((entry) => entry.cell === cell && entry.digit === digit), `${technique} should eliminate the expected candidate`);
  exercisedTechniques.add(technique);
};
assertEliminates(findXYWing(candidateMap([
  [cellAt(0, 0), [1, 2]], [cellAt(0, 3), [1, 3]], [cellAt(3, 0), [2, 3]], [cellAt(3, 3), [3]],
])), 'XY-Wing', cellAt(3, 3), 3);
assertEliminates(findXYZWing(candidateMap([
  [cellAt(0, 0), [1, 2, 3]], [cellAt(0, 1), [1, 3]], [cellAt(1, 0), [2, 3]], [cellAt(1, 1), [3]],
])), 'XYZ-Wing', cellAt(1, 1), 3);
assertEliminates(findNakedSubset(candidateMap([
  [cellAt(0, 0), [1, 2]], [cellAt(0, 1), [2, 3]], [cellAt(0, 2), [1, 3]], [cellAt(0, 3), [1, 4]],
]), 3), 'Naked Triple', cellAt(0, 3), 1);
assertEliminates(findHiddenSubset(candidateMap([
  [cellAt(0, 0), [1, 2, 4]], [cellAt(0, 1), [1, 3, 5]], [cellAt(0, 2), [2, 3, 6]],
]), 3), 'Hidden Triple', cellAt(0, 0), 4);
assertEliminates(findWWing(candidateMap([
  [cellAt(0, 0), [1, 2]], [cellAt(3, 3), [1, 2]], [cellAt(0, 5), [1]], [cellAt(3, 5), [1]], [cellAt(0, 3), [2]],
])), 'W-Wing', cellAt(0, 3), 2);
assert(findWWing(candidateMap([
  [cellAt(0, 3), [3, 6]], [cellAt(2, 0), [3, 6]], [cellAt(0, 2), [1, 6]],
  [cellAt(2, 3), [3]], [cellAt(2, 5), [3]],
])) === null, 'a W-Wing conjugate pair must not reuse a W-Wing endpoint');
assertEliminates(findEmptyRectangle(candidateMap([
  [cellAt(0, 1), [1]], [cellAt(1, 0), [1]], [cellAt(0, 5), [1]], [cellAt(4, 5), [1]], [cellAt(4, 0), [1]],
])), 'Empty Rectangle', cellAt(4, 0), 1);
for (const technique of ENABLED_LOGICAL_TECHNIQUES) {
  assert(exercisedTechniques.has(technique), `${technique} must have direct unique-puzzle regression coverage before being enabled`);
}
for (const technique of ['Hidden Pair', 'Naked Quad', 'Hidden Quad']) {
  assert(!ENABLED_LOGICAL_TECHNIQUES.has(technique), `${technique} must remain gated until it has direct unique-puzzle regression coverage`);
}

const fallbackFixture = solveWithTechniques(parsePuzzle(verifyFixtures[1]).values, true);
assert(!fallbackFixture.moves.some((move) => move.technique === 'Brute force'),
  'the advanced-technique fixture should now solve without brute force');
const emptyRectangleStep = fallbackFixture.moves.findIndex((move) => move.technique === 'Empty Rectangle');
assert(emptyRectangleStep >= 0, 'the advanced-technique fixture should exercise Empty Rectangle');
const nextMove = fallbackFixture.moves[emptyRectangleStep + 1];
assert(nextMove.technique === 'Naked Single' && nextMove.cell === cellAt(9, 7) && nextMove.digit === 2,
  'the Empty Rectangle must yield R10C8 = 2 as the following Naked Single');

// Regression for the false W-Wing where one endpoint was also treated as a
// conjugate-pair cell.  The walkthrough must now complete safely.
const wWingRegression = '8....2......9..5.7.......54.9...2...5..4.6....8..6............792.....1..8.....257............3..9....8.4..1...1...7.52.......2.3..9......9....3';
const wWingRegressionResult = solveWithTechniques(parsePuzzle(wWingRegression).values, true);
assert(wWingRegressionResult.solution !== null, 'W-Wing regression puzzle should solve');
assert(wWingRegressionResult.walkthroughValid, 'W-Wing regression walkthrough must complete without an invalid deduction');

// A Naked Triple must be considered before the advanced wing patterns. This
// puzzle previously displayed an unnecessary XYZ-Wing at the corresponding
// point in its walkthrough.
const triplePriorityFixture = '.63..1......4.......8......2.7........2......7.....8........9.1362........4...2.9.1.65.....1...7.......6..9.....9....46.....189.............6...';
const triplePriorityResult = solveWithTechniques(parsePuzzle(triplePriorityFixture).values, true);
assert(triplePriorityResult.walkthroughValid, 'Naked Triple priority fixture walkthrough should be valid');
const firstNakedTriple = triplePriorityResult.moves.findIndex((move) => move.technique === 'Naked Triple');
const firstAdvancedPattern = triplePriorityResult.moves.findIndex((move) =>
  ['Empty Rectangle', 'XY-Wing', 'XYZ-Wing', 'W-Wing'].includes(move.technique));
assert(firstNakedTriple >= 0, 'Naked Triple priority fixture should exercise Naked Triple');
assert(firstAdvancedPattern < 0 || firstNakedTriple < firstAdvancedPattern,
  'Naked Triple must be selected before an available advanced pattern');

const blackCellInput = `${fixture.slice(0, 9)}1${fixture.slice(10)}`;
assert(parsePuzzle(blackCellInput).errors.length > 0, 'a digit in a black cell must be rejected');

const generated = generateCompletedGrid();
assert(isConsistent(generated), 'a generated completed grid must be consistent');
const dug = digSingleCell(generated);
assert(findSolutions(dug, 2).length === 1, 'single-cell digging must retain one solution');

console.log(`Passed ${result.moves.length} validated walkthrough moves and ${verifyFixtures.length} Verify-page regressions.`);
