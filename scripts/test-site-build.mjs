import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const pages = [
  ['dist/index.html', 'app.js'],
  ['dist/validator.html', 'validator.js'],
  ['dist/simulation.html', 'simulation.js'],
  ['dist/simulation-difficulty.html', 'simulation-difficulty.js'],
];

for (const [pagePath, scriptName] of pages) {
  const page = read(pagePath);
  assert(page.includes('src="./core/extended-sudoku-core.js"'), `${pagePath} must load the local-file-safe solver bundle`);
  assert(page.includes(`src="./${scriptName}"`), `${pagePath} must load ${scriptName}`);
  assert(!page.includes(`type="module" src="./${scriptName}"`), `${pagePath} must not require file:// module imports`);
  const scriptPath = resolve(root, 'dist', scriptName);
  assert(existsSync(scriptPath), `${scriptName} must be emitted by TypeScript`);
  const script = read(`dist/${scriptName}`);
  assert(!/^import /m.test(script), `${scriptName} must be runnable from file:// without imports`);
}

assert(existsSync(resolve(root, 'dist/simulation-difficulty-worker.js')), 'difficulty simulation must emit its isolated rating worker');
assert(read('dist/simulation-difficulty.js').includes('simulation-difficulty-worker.js'), 'difficulty simulation must use the rating worker');

const difficultyPage = read('dist/simulation-difficulty.html');
assert(difficultyPage.includes('Display grids with difficulty ratings at least'), 'difficulty simulation must expose its rating threshold');
for (const rating of ['300', '400', '500', '600', '700', '800', '1000', '1500']) {
  assert(difficultyPage.includes(`<option>${rating}</option>`), `difficulty simulation must offer ${rating}`);
}
for (const pagePath of ['dist/index.html', 'dist/techniques.html', 'dist/validator.html', 'dist/simulation.html', 'dist/simulation-difficulty.html']) {
  assert(read(pagePath).includes('simulation-difficulty.html'), `${pagePath} must link to Simulation difficulty`);
}

assert(existsSync(resolve(root, 'dist/core/extended-sudoku-core.js')), 'the shared browser solver bundle must be emitted');
const browserContext = { window: {} };
vm.runInNewContext(read('dist/core/extended-sudoku-core.js'), browserContext);
for (const functionName of ['solveWithTechniques', 'buildCandidates', 'findSolutions', 'generateCompletedGrid', 'digSingleCell']) {
  assert(typeof browserContext.window.ExtendedSudokuCore?.[functionName] === 'function', `browser bundle must expose ${functionName}`);
}

console.log('Passed Generate and Verify module preflight.');
