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
assert(aboutScript.includes("aboutButton.className = 'about-button'") && /\.about-button\s*\{[^}]*pointer-events:\s*auto/.test(read('dist/styles.css')), 'the About button must receive the interactive header styling');
const elements = [];
const createElement = (tag) => {
  const element = { tag, style: {}, children: [], handlers: {}, open: false,
    setAttribute() {}, append(...children) { this.children.push(...children); }, prepend(child) { this.children.unshift(child); },
    addEventListener(type, handler) { this.handlers[type] = handler; },
    showModal() { this.open = true; }, close() { this.open = false; } };
  elements.push(element);
  return element;
};
const header = createElement('header');
const nav = createElement('nav');
const body = createElement('body');
vm.runInNewContext(aboutScript, { document: { createElement, body, querySelector: (selector) => selector === '.site-title' ? header : nav } });
const aboutButton = elements.find((element) => element.id === 'about-button');
const aboutDialog = elements.find((element) => element.tag === 'dialog');
const closeButton = elements.find((element) => element.textContent === 'Close');
aboutButton.handlers.click();
assert(aboutDialog.open, 'About must open the rules dialog');
closeButton.handlers.click();
assert(!aboutDialog.open, 'Close must dismiss the About dialog');
aboutButton.handlers.click();
aboutDialog.handlers.click({ target: aboutDialog });
assert(!aboutDialog.open, 'clicking the dialog backdrop must dismiss it');
assert(aboutScript.includes("document.querySelector('.site-title')") && aboutScript.includes('siteTitle ?? document.body'), 'the About button must be placed inside the header');
assert(aboutScript.includes("document.querySelector('.site-nav')") && aboutScript.includes('siteTitle.prepend(siteNav)'), 'the navigation menu must be placed inside the header');
assert(aboutScript.includes("position: 'fixed'") && aboutScript.includes("right: '18px'"), 'the About button must be pinned to the header’s right edge');
const styles = read('dist/styles.css');
assert(styles.includes('inset: 0 0 auto 0; width: auto; max-width: none') && styles.includes('position: absolute; top: 50%; left: 20px'), 'the header must span the viewport with navigation on its left');
const generatePage = read('dist/index.html');
assert(!generatePage.includes('<h1>Generate a puzzle</h1>') && generatePage.includes('class="generate-controls"'), 'the Generate page must use compact inline controls without a redundant heading');
assert(styles.includes('.generate-controls .generate-top { display: inline-flex; flex: 0 0 auto; inline-size: fit-content; width: fit-content !important;') && styles.includes('.difficulty-rating-value'), 'the Generate controls and rating need legible compact styling');

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
assert(customBuildPage.includes('id="custom-grid"') && customBuildPage.includes('id="build-toggle"') && !customBuildPage.includes('id="halt-build"'), 'Custom Build must provide one toggle for the selectable grid and build controls');
assert(customBuildPage.includes('id="minimum-difficulty"') && customBuildPage.includes('<option value="0" selected>0</option>') && customBuildPage.includes('id="maximum-difficulty"') && customBuildPage.includes('<option value="2000" selected>2000</option>'), 'Custom Build must provide its requested difficulty range controls');
assert(customBuildPage.includes('id="build-attempts"'), 'Custom Build must provide a dedicated live attempt counter');
assert(!customBuildPage.includes('<h1>Custom Build</h1>') && customBuildPage.indexOf('id="selected-count"') < customBuildPage.indexOf('id="custom-grid"'), 'Custom Build must show the selection count above its grid without a redundant page title');
const customBuildScript = read('dist/custom-build.js');
assert(customBuildScript.includes('findSolutions(finalGrid, 2)') && customBuildScript.includes("createCopyActions(finalGrid, 'final grid')") && customBuildScript.includes("createCopyActions(solved.solution, 'completed grid')"), 'Custom Build must search for unique puzzles and expose all copy controls');
assert(!customBuildScript.includes("finalHeading.textContent = 'Final grid'") && customBuildScript.includes('createWalkthrough(finalGrid, solved.moves)'), 'Custom Build must show only the walkthrough grid instead of a duplicate final grid');
assert(customBuildScript.includes('cells selected.') && customBuildScript.includes("info.className = 'custom-walkthrough-info'") && customBuildScript.includes('section.append(board, info)'), 'Custom Build must use the requested selection wording and a right-side walkthrough panel');
assert(customBuildScript.includes("heading.textContent = 'Techniques used'") && customBuildScript.includes('createTechniqueTable(moves)') && styles.includes('.custom-technique-summary'), 'Custom Build must show its technique table beside the walkthrough grid');
assert(read('src/app.ts').includes('techniqueDifficulty[left]') && read('src/validator.ts').includes('byTechnique.entries()].sort') && read('src/custom-build.ts').includes('techniqueWeights[left]'), 'all technique tallies must sort rows by ascending difficulty');
assert(customBuildScript.includes("map(({ number }) => number).join(', ')") && customBuildScript.includes("first.textContent = '<<'") && customBuildScript.includes("last.textContent = '>>'") && customBuildScript.includes("classList.add('step-highlight')"), 'Custom Build must list individual technique steps, provide first/last controls, and highlight active cells');
assert(styles.includes('.walkthrough-board { width: min(100%, 740px); }') && styles.includes('.validator-card .walkthrough-board { width: 100%; min-width: 0; }') && styles.includes('.custom-walkthrough-info { grid-row: 2; }'), 'walkthrough grids must remain visible and stack their explanation below on smaller devices');
assert(customBuildScript.includes("running ? 'Halt' : 'Build now'") && customBuildScript.includes('const startedAt = performance.now()') && customBuildScript.includes('${elapsed}s'), 'Custom Build must provide a build/halt toggle and show elapsed build time');
assert(customBuildScript.includes('difficultyRating < minimum || difficultyRating > maximum') && customBuildScript.includes('latest rating ${difficultyRating} is outside ${minimum}–${maximum}'), 'Custom Build must enforce the selected difficulty range');
assert(customBuildScript.includes("attemptCounter.textContent = 'Attempt: 0'") && customBuildScript.includes('attemptCounter.textContent = `Attempt: ${attempts}`'), 'Custom Build must update the attempt counter in real time');
for (const pagePath of ['dist/simulation.html', 'dist/simulation-difficulty.html']) {
  const page = read(pagePath);
  assert(page.includes('id="simulation-toggle"'), `${pagePath} must provide a single simulation toggle`);
  assert(!page.includes('id="run"') && !page.includes('id="halt"'), `${pagePath} must not retain separate Run and Halt buttons`);
  assert((page.match(/class="simulation-option"/g) ?? []).length >= 2, `${pagePath} must separate its options into paragraphs`);
  for (const [value, label] of [['1000', '1,000'], ['10000', '10,000'], ['100000', '100,000'], ['1000000', '1,000,000']]) {
    assert(new RegExp(`<option value="${value}"(?: selected)?>${label}</option>`).test(page), `${pagePath} must format ${value} trial(s) with commas`);
  }
}
const simulationPage = read('dist/simulation.html');
assert(simulationPage.includes('id="clue-histogram"') && simulationPage.includes('<option value="1000000" selected>1,000,000</option>'), 'Simulation must expose a live clue histogram and default to one million trials');
const simulationSource = read('src/simulation.ts');
assert(simulationSource.includes('count === 26') && simulationSource.includes('frequencies[latestClueCount] += 1') && simulationSource.includes('qualifying-bar') && simulationSource.includes('if (!frequency) continue') && simulationSource.includes('tallyLabel = String(frequency)') && simulationSource.includes('updateHistogram(frequencies, clueLimit);') && styles.includes('flex: 0 0 21px') && styles.includes('gap: 12px') && styles.includes('height: 380px') && styles.includes('content: attr(data-clues)') && styles.includes('content: attr(data-tally-label)'), 'Simulation must default to 26 clues and render only observed bars with real-time tally and x-axis labels');
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
