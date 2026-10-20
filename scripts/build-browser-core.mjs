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
  .replace(/\bexport function\b/g, 'function');

const body = sourceFiles
  .map((file) => stripModuleSyntax(readFileSync(resolve(coreDirectory, file), 'utf8')))
  .join('\n');

const api = [
  'ACTIVE_CELLS', 'describeCell', 'isBlackCell', 'positionOf', 'parsePuzzle',
  'applyPlacement', 'buildCandidates', 'removeCandidate',
  'findSolutions', 'solveWithTechniques',
  'generateCompletedGrid', 'digSingleCell', 'digDualCell',
];

writeFileSync(resolve(coreDirectory, 'extended-sudoku-core.js'), `/* Generated from TypeScript core modules. */\n(function (global) {\n${body}\n  global.ExtendedSudokuCore = { ${api.join(', ')} };\n}(typeof window !== 'undefined' ? window : globalThis));\n`);
