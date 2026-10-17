"use strict";
// @ts-nocheck
const { ACTIVE_CELLS, generateCompletedGrid, digSingleCell, solveWithTechniques } = window.ExtendedSudokuCore;
const trials = document.querySelector('#trials');
const minimum = document.querySelector('#minimum-difficulty');
const run = document.querySelector('#run');
const halt = document.querySelector('#halt');
const simStatus = document.querySelector('#sim-status');
const selected = document.querySelector('#selected');
const weights = {
    'Naked Single': 4,
    'Hidden Single': 6,
    'Locked Candidates': 8,
    'Naked Pair': 10,
    'Hidden Pair': 12,
    'Naked Quad': 18,
    'Hidden Quad': 20,
    'Brute force': 30,
};
let halted = false;
const stringify = (values) => values.map((value) => value || '.').join('');
const clueCount = (values) => ACTIVE_CELLS.filter((cell) => values[cell]).length;
const difficultyRating = (moves) => moves.reduce((total, move) => total + (weights[move.technique] ?? 0), 0);
function copyButton(text) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Copy';
    button.onclick = async () => {
        try {
            await navigator.clipboard.writeText(text);
            button.textContent = 'Copied';
        }
        catch {
            button.textContent = 'Copy failed';
        }
    };
    return button;
}
function renderPuzzle(result, index) {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = `Qualifying result ${index + 1} — difficulty ${result.rating} · ${clueCount(result.puzzle)} given cells`;
    const code = document.createElement('code');
    const text = stringify(result.puzzle);
    code.textContent = text;
    item.append(title, code, copyButton(text));
    return item;
}
function show(results, focus = false) {
    selected.replaceChildren();
    if (!results.length)
        return;
    const list = document.createElement('ol');
    results.forEach((result, index) => list.append(renderPuzzle(result, index)));
    selected.append(list);
    if (focus)
        selected.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
run.onclick = () => {
    halted = false;
    selected.replaceChildren();
    const total = Number(trials.value);
    const minimumRating = Number(minimum.value);
    let done = 0;
    let elapsed = 0;
    const qualifying = [];
    const tick = () => {
        if (halted || done >= total) {
            const state = halted ? 'halted' : 'complete';
            simStatus.textContent = `${done}/${total} trials · average ${(elapsed / Math.max(1, done)).toFixed(1)} ms · ${qualifying.length} qualifying result(s) · ${state} · shared single-cell digging`;
            return;
        }
        const startedAt = performance.now();
        const puzzle = digSingleCell(generateCompletedGrid());
        const solved = solveWithTechniques(puzzle);
        const rating = difficultyRating(solved.moves);
        elapsed += performance.now() - startedAt;
        done += 1;
        const before = qualifying.length;
        if (rating >= minimumRating && qualifying.length < 2)
            qualifying.push({ puzzle, rating });
        simStatus.textContent = `${done}/${total} trials · average ${(elapsed / done).toFixed(1)} ms · ${qualifying.length} qualifying result(s) · shared single-cell digging`;
        if (qualifying.length > before)
            show(qualifying, true);
        if (done < total && !halted)
            setTimeout(tick, 0);
    };
    tick();
};
halt.onclick = () => { halted = true; };
