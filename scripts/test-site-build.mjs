import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const pages = [
  ['dist/index.html', 'app.js'],
  ['dist/custom-build.html', 'custom-build.js'],
  ['dist/validator.html', 'validator.js'],
  ['dist/simulation.html', 'simulation.js'],
  ['dist/simulation-difficulty.html', 'simulation-difficulty.js'],
];

for (const [pagePath, scriptName] of pages) {
  const page = read(pagePath);
  assert(page.includes('rel="icon" href="./favicon.png"'), `${pagePath} must load the shared browser-tab icon`);
  assert(page.includes('src="./core/extended-sudoku-core.js"'), `${pagePath} must load the local-file-safe solver bundle`);
  assert(page.includes(`src="./${scriptName}"`), `${pagePath} must load ${scriptName}`);
  assert(!page.includes(`type="module" src="./${scriptName}"`), `${pagePath} must not require file:// module imports`);
  const scriptPath = resolve(root, 'dist', scriptName);
  assert(existsSync(scriptPath), `${scriptName} must be emitted by TypeScript`);
  const script = read(`dist/${scriptName}`);
  assert(!/^import /m.test(script), `${scriptName} must be runnable from file:// without imports`);
}

assert(existsSync(resolve(root, 'dist/favicon.png')), 'the shared browser-tab icon must be present');
assert(existsSync(resolve(root, 'dist/about.js')), 'the shared About dialog script must be present');
for (const pagePath of ['dist/index.html', 'dist/custom-build.html', 'dist/techniques.html', 'dist/validator.html', 'dist/simulation.html', 'dist/simulation-difficulty.html']) {
  assert(read(pagePath).includes('rel="icon" href="./favicon.png"'), `${pagePath} must load the shared browser-tab icon`);
  assert(read(pagePath).includes('src="./about.js"'), `${pagePath} must load the shared About dialog`);
}
const aboutScript = read('dist/about.js');
assert(aboutScript.includes("aboutButton.textContent = 'About'") && aboutScript.includes('Rows and columns continue across the empty spaces.'), 'the About dialog must provide the refined rules');
assert(aboutScript.includes("document.querySelector('.site-title')") && aboutScript.includes('siteTitle ?? document.body'), 'the About button must be placed inside the header');
assert(aboutScript.includes("document.querySelector('.site-nav')") && aboutScript.includes('siteTitle.prepend(siteNav)'), 'the navigation menu must be placed inside the header');
const styles = read('dist/styles.css');
assert(styles.includes('left: 0; right: 0; width: 100vw') && styles.includes('position: absolute; top: 50%; left: 20px'), 'the header must span the viewport with navigation on its left');

const generatorSource = read('src/app.ts');
assert(generatorSource.includes("classList.toggle('given-number', Boolean(puzzle[cell]))"), 'the completed grid must mark final-grid givens as black');
assert(generatorSource.includes("classList.toggle('completed-only', !puzzle[cell])"), 'the completed grid must mark non-final values as blue');
assert(generatorSource.includes("finalPuzzle[cell] ? 'given-number' : 'placed-number completed-only'"), 'the final-grid walkthrough must use the shared clue colors');
const validatorSource = read('src/validator.ts');
assert(validatorSource.includes("givens[cell] ? 'given-number' : 'placed-number completed-only'"), 'the verifier must use the shared clue colors');

assert(existsSync(resolve(root, 'dist/simulation-difficulty-worker.js')), 'difficulty simulation must emit its isolated rating worker');
assert(read('dist/simulation-difficulty.js').includes('simulation-difficulty-worker.js'), 'difficulty simulation must use the rating worker');

const difficultyPage = read('dist/simulation-difficulty.html');
assert(difficultyPage.includes('Display grids with difficulty ratings at least'), 'difficulty simulation must expose its rating threshold');
assert(difficultyPage.includes('Display grids with difficulty ratings at most'), 'difficulty simulation must expose its upper rating threshold');
assert(difficultyPage.includes('id="digging-mode"') && difficultyPage.includes('value="dual"'), 'difficulty simulation must offer both digging modes');
for (const rating of ['300', '400', '500', '600', '700', '800', '1000', '1500']) {
  assert(difficultyPage.includes(`<option>${rating}</option>`), `difficulty simulation must offer ${rating}`);
}
for (const [value, label] of [['500', '500'], ['10000', '10,000'], ['20000', '20,000'], ['100000', '100,000']]) {
  assert(new RegExp(`<option(?: value="${value}")?(?: selected)?>${label}</option>`).test(difficultyPage), `difficulty simulation must offer upper limit ${label}`);
}
for (const pagePath of ['dist/index.html', 'dist/custom-build.html', 'dist/techniques.html', 'dist/validator.html', 'dist/simulation.html', 'dist/simulation-difficulty.html']) {
  const page = read(pagePath);
  assert(page.includes('simulation-difficulty.html'), `${pagePath} must link to Simulation difficulty`);
  assert(page.includes('custom-build.html'), `${pagePath} must link to Custom Build`);
  assert((page.match(/Extended Sudoku Maker/g) ?? []).length === 1, `${pagePath} must show the site title only in its header`);
}
const customBuildPage = read('dist/custom-build.html');
assert(customBuildPage.includes('id="custom-grid"') && customBuildPage.includes('id="build-now"') && customBuildPage.includes('id="halt-build"'), 'Custom Build must provide the selectable grid and build controls');
const customBuildScript = read('dist/custom-build.js');
assert(customBuildScript.includes('findSolutions(finalGrid, 2)') && customBuildScript.includes("createCopyActions(finalGrid, 'final grid')") && customBuildScript.includes("createCopyActions(solved.solution, 'completed grid')"), 'Custom Build must search for unique puzzles and expose all copy controls');
for (const pagePath of ['dist/simulation.html', 'dist/simulation-difficulty.html']) {
  const page = read(pagePath);
  assert(page.includes('id="simulation-toggle"'), `${pagePath} must provide a single simulation toggle`);
  assert(!page.includes('id="run"') && !page.includes('id="halt"'), `${pagePath} must not retain separate Run and Halt buttons`);
  assert((page.match(/class="simulation-option"/g) ?? []).length >= 2, `${pagePath} must separate its options into paragraphs`);
  for (const [value, label] of [['1000', '1,000'], ['10000', '10,000'], ['100000', '100,000'], ['1000000', '1,000,000']]) {
    assert(new RegExp(`<option value="${value}"(?: selected)?>${label}</option>`).test(page), `${pagePath} must format ${value} trial(s) with commas`);
  }
}
const validatorPage = read('dist/validator.html');
assert(validatorPage.includes('class="actions validator-actions"'), 'Verify controls must share one action row');
const validatorScript = read('dist/validator.js');
assert(validatorScript.includes("createGridCopyActions(givens, 'final grid')") && validatorScript.includes("createGridCopyActions(solved.solution, 'completed grid')") && validatorScript.includes('copyGridImage'),
  'Verify results must support final-grid and completed-grid string and image copying');
assert(validatorScript.indexOf("createGridCopyActions(givens, 'final grid')") < validatorScript.indexOf("createGridCopyActions(solved.solution, 'completed grid')"),
  'Verify final-grid copy controls must precede completed-grid copy controls');
const techniquesPage = read('dist/techniques.html');
assert(techniquesPage.includes('<td>Empty Rectangle</td><td>120</td><td>Active</td>'), 'technique ratings must show Empty Rectangle as active with SudokUI difficulty 120');
assert(techniquesPage.includes('<td>Naked Triple</td><td>80</td><td>Active</td>'), 'technique ratings must show Naked Triple as active with SudokUI difficulty 80');
assert(techniquesPage.includes('<td>Hidden Triple</td><td>100</td><td>Active</td>'), 'technique ratings must show Hidden Triple as active with SudokUI difficulty 100');
assert(techniquesPage.includes('<td>Hidden Pair</td><td>70</td><td>Active</td>'), 'technique ratings must show Hidden Pair as active with SudokUI difficulty 70');
assert(techniquesPage.includes('<td>Naked Quad</td><td>120</td><td>Active</td>'), 'technique ratings must show Naked Quad as active with SudokUI difficulty 120');
assert(techniquesPage.includes('<td>Hidden Quad</td><td>150</td><td>Active</td>'), 'technique ratings must show Hidden Quad as active with SudokUI difficulty 150');
assert(techniquesPage.includes('<td>Swordfish</td><td>150</td><td>Active</td>'), 'technique ratings must show Swordfish as active with SudokUI difficulty 150');
assert(techniquesPage.includes('<td>Jellyfish</td><td>160</td><td>Active</td>'), 'technique ratings must show Jellyfish as active with SudokUI difficulty 160');

assert(existsSync(resolve(root, 'dist/core/extended-sudoku-core.js')), 'the shared browser solver bundle must be emitted');
const browserContext = { window: {} };
vm.runInNewContext(read('dist/core/extended-sudoku-core.js'), browserContext);
for (const functionName of ['solveWithTechniques', 'buildCandidates', 'findSolutions', 'generateCompletedGrid', 'digSingleCell', 'digDualCell']) {
  assert(typeof browserContext.window.ExtendedSudokuCore?.[functionName] === 'function', `browser bundle must expose ${functionName}`);
}

console.log('Passed Generate and Verify module preflight.');
