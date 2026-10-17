"use strict";
// @ts-nocheck
const input = document.querySelector('#puzzle-input'), button = document.querySelector('#check-puzzle'), validatorStatus = document.querySelector('#validator-status'), solutions = document.querySelector('#solutions');
const black = i => { const r = Math.floor(i / 12) + 1, c = i % 12 + 1; return [[1, 10], [4, 7], [7, 4], [10, 1]].some(([a, b]) => r >= a && r < a + 3 && c >= b && c < b + 3); };
const candidates = (v, i) => { const r = Math.floor(i / 12), c = i % 12, br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3, u = new Set(); for (let n = 0; n < 12; n++) {
    u.add(v[r * 12 + n]);
    u.add(v[n * 12 + c]);
} for (let y = 0; y < 3; y++)
    for (let x = 0; x < 3; x++)
        u.add(v[(br + y) * 12 + bc + x]); return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => !u.has(d)); };
function find(v, limit = 2) { const out = []; const go = () => { if (out.length >= limit)
    return; let best = -1, opts; for (let i = 0; i < 144; i++)
    if (!black(i) && !v[i]) {
        const c = candidates(v, i);
        if (!c.length)
            return;
        if (best < 0 || c.length < opts.length) {
            best = i;
            opts = c;
        }
    } if (best < 0) {
    out.push([...v]);
    return;
} for (const d of opts) {
    v[best] = d;
    go();
    v[best] = 0;
} }; go(); return out; }
function draw(values, other, givens) { const grid = document.createElement('div'); grid.className = 'grid final-grid validator-grid'; for (let i = 0; i < 144; i++) {
    const r = Math.floor(i / 12) + 1, c = i % 12 + 1, t = document.createElement('div');
    t.className = `cell${black(i) ? ' grey' : ''}${c % 3 === 0 ? ' v-divider' : ''}${r % 3 === 0 ? ' h-divider' : ''}${other && values[i] !== other[i] && !black(i) ? ' differs' : ''}${!black(i) && !givens[i] ? ' completed-solution' : ''}`;
    if (!black(i))
        t.textContent = values[i];
    grid.append(t);
} return grid; }
button.addEventListener('click', () => { const text = input.value.trim(); solutions.replaceChildren(); if (!/^[1-9.]{144}$/.test(text)) {
    validatorStatus.textContent = 'Enter exactly 144 characters using digits 1–9 and dots.';
    return;
} const values = [...text].map(x => x === '.' ? 0 : +x), givens = [...values], found = find(values); if (!found.length) {
    validatorStatus.textContent = 'This puzzle has no solution.';
    return;
} if (found.length === 1) {
    validatorStatus.textContent = 'This puzzle has a unique solution.';
    solutions.append(draw(found[0], null, givens));
    return;
} validatorStatus.textContent = 'This puzzle is not unique. Two solutions are shown; differing cells are orange.'; solutions.append(draw(found[0], found[1], givens), draw(found[1], found[0], givens)); });
