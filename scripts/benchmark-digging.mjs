import { countSolutions } from '../dist/core/solver.js';
import { digDualCell, digSingleCell, generateCompletedGrid } from '../dist/core/generator.js';

const seededRandom = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 0x1_0000_0000;
};
const countClues = (grid) => grid.filter(Boolean).length;
const runs = Number(process.argv[2] ?? 5);
for (const [name, dig] of [['single-cell', digSingleCell], ['dual-cell', digDualCell]]) {
  const totals = { milliseconds: 0, clues: 0, uniquenessChecks: 0, searchNodes: 0, branches: 0, forcedPlacements: 0 };
  for (let index = 0; index < runs; index += 1) {
    const metrics = { uniquenessChecks: 0, searchNodes: 0, branches: 0, forcedPlacements: 0 };
    const started = performance.now();
    const completed = generateCompletedGrid(seededRandom(1000 + index));
    const puzzle = dig(completed, { random: seededRandom(2000 + index), metrics });
    totals.milliseconds += performance.now() - started;
    totals.clues += countClues(puzzle);
    for (const key of Object.keys(metrics)) totals[key] += metrics[key];
    if (countSolutions(puzzle, 2) !== 1) throw new Error(`${name} run ${index + 1} was not unique`);
  }
  console.log(`${name}: ${runs} deterministic runs; avg ${ (totals.milliseconds / runs).toFixed(1) } ms; ` +
    `avg ${ (totals.clues / runs).toFixed(1) } clues; ${totals.uniquenessChecks} uniqueness checks; ` +
    `${totals.searchNodes} nodes; ${totals.branches} branches; ${totals.forcedPlacements} forced placements.`);
}
