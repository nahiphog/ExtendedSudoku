import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const pages = [
  ['dist/index.html', 'app.js'],
  ['dist/validator.html', 'validator.js'],
];

for (const [pagePath, scriptName] of pages) {
  const page = read(pagePath);
  assert(page.includes(`type="module" src="./${scriptName}"`), `${pagePath} must load ${scriptName} as an ES module`);
  const scriptPath = resolve(root, 'dist', scriptName);
  assert(existsSync(scriptPath), `${scriptName} must be emitted by TypeScript`);
  const script = read(`dist/${scriptName}`);
  for (const specifier of script.matchAll(/from ['"](\.\/[^'"]+)['"]/g)) {
    assert(existsSync(resolve(dirname(scriptPath), specifier[1])), `${scriptName} import ${specifier[1]} must resolve`);
  }
}

console.log('Passed Generate and Verify module preflight.');
