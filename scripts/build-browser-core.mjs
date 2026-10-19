import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const coreDirectory = resolve(root, 'dist', 'core');
const sourceFiles = ['grid.js', 'candidates.js', 'solver.js', 'generator.js'];

const stripModuleSyntax = (source) => source
  .replace(/^import .*?;\r?\n/gm, '')
  .replace(/^export \{\};\r?\n/gm, '')
  .replace(/\bexport const\b/g, 'const')
  .replace(/\bexport let\b/g, 'let')
  .replace(/\bexport function\b/g, 'function');

const body = sourceFiles
  .map((file) => stripModuleSyntax(readFileSync(resolve(coreDirectory, file), 'utf8')))
  .join('\n');

const api = [
  'ACTIVE_CELLS', 'gridFormat', 'GRID_FORMATS', 'setGridFormat', 'describeCell', 'isBlackCell', 'positionOf', 'parsePuzzle',
  'applyPlacement', 'buildCandidates', 'removeCandidate',
  'findSolutions', 'solveWithTechniques',
  'generateCompletedGrid', 'digSingleCell', 'digDualCell',
];

const liveBindings = ['ACTIVE_CELLS', 'gridFormat'];
const staticBindings = api.filter((name) => !liveBindings.includes(name));
const liveProperties = liveBindings.map((name) => `${name}: { get: () => ${name} }`).join(', ');

writeFileSync(resolve(coreDirectory, 'extended-sudoku-core.js'), `/* Generated from TypeScript core modules. */\n(function (global) {\n${body}\n  const api = { ${staticBindings.join(', ')} };\n  Object.defineProperties(api, { ${liveProperties} });\n  global.ExtendedSudokuCore = api;\n}(typeof window !== 'undefined' ? window : globalThis));\n`);
