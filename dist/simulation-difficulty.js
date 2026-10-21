"use strict";
// @ts-nocheck
const { ACTIVE_CELLS, generateCompletedGrid, digSingleCell, digDualCell } = window.ExtendedSudokuCore;
const trials = document.querySelector('#trials');
const minimum = document.querySelector('#minimum-difficulty');
const maximum = document.querySelector('#maximum-difficulty');
const diggingMode = document.querySelector('#digging-mode');
const toggle = document.querySelector('#simulation-toggle');
const simStatus = document.querySelector('#sim-status');
const selected = document.querySelector('#selected');
const weights = {
    'Naked Single': 4,
    'Hidden Single': 14,
    'Locked Candidates': 50,
    'Naked Pair': 60,
    'Naked Triple': 80,
    'Hidden Pair': 70,
    'Hidden Triple': 100,
    'Naked Quad': 120,
    'Hidden Quad': 150,
    'Empty Rectangle': 120, 'Swordfish': 150, 'Jellyfish': 160, 'XY-Wing': 160, 'XYZ-Wing': 180, 'W-Wing': 150,
    'Brute force': 10000,
};
let halted = false;
let running = false;
let activeWorker = null;
let settleActiveWorker = null;
let runId = 0;
const ratingTimeoutMs = 2000;
const diggingLabel = () => diggingMode.value === 'dual' ? 'dual-cell' : 'single-cell';
const setRunning = (value) => {
    running = value;
    toggle.textContent = value ? 'Halt simulation' : `Run ${diggingLabel()} simulation`;
    toggle.setAttribute('aria-pressed', String(value));
};
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
function renderPuzzle(result, index, kind) {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = kind === 'unknown'
        ? `Difficulty unknown ${index + 1} — rating did not finish within ${ratingTimeoutMs / 1000} seconds · ${clueCount(result.puzzle)} given cells`
        : `Qualifying result ${index + 1} — difficulty ${result.rating} · ${clueCount(result.puzzle)} given cells`;
    const code = document.createElement('code');
    const text = stringify(result.puzzle);
    code.textContent = text;
    item.append(title, code, copyButton(text));
    return item;
}
function show(results, unknown, focus = false) {
    selected.replaceChildren();
    if (results.length) {
        const heading = document.createElement('h2');
        heading.textContent = 'Qualifying grids';
        const list = document.createElement('ol');
        results.forEach((result, index) => list.append(renderPuzzle(result, index, 'qualifying')));
        selected.append(heading, list);
    }
    if (unknown.length) {
        const heading = document.createElement('h2');
        heading.textContent = 'Grids with unknown difficulty';
        const notice = document.createElement('p');
        notice.textContent = 'The solver was stopped for these grids so the simulation could continue.';
        const list = document.createElement('ol');
        unknown.forEach((result, index) => list.append(renderPuzzle(result, index, 'unknown')));
        selected.append(heading, notice, list);
    }
    if (focus)
        selected.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function calculateDifficulty(puzzle) {
    return new Promise((resolve) => {
        const worker = new Worker('./simulation-difficulty-worker.js?v=default-grid-2');
        let settled = false;
        const finish = (result) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            worker.terminate();
            if (activeWorker === worker) {
                activeWorker = null;
                settleActiveWorker = null;
            }
            resolve(result);
        };
        const timer = setTimeout(() => finish({ unknown: true }), ratingTimeoutMs);
        activeWorker = worker;
        settleActiveWorker = finish;
        worker.onmessage = ({ data }) => data?.error
            ? finish({ unknown: true })
            : finish({ rating: difficultyRating(data.moves ?? []) });
        worker.onerror = () => finish({ unknown: true });
        worker.postMessage({ puzzle, version: window.ExtendedSudokuCore.GRID_VERSION });
    });
}
const startSimulation = () => {
    runId += 1;
    const thisRun = runId;
    activeWorker?.terminate();
    settleActiveWorker?.({ cancelled: true });
    halted = false;
    setRunning(true);
    selected.replaceChildren();
    const total = Number(trials.value);
    const minimumRating = Number(minimum.value);
    const maximumRating = Number(maximum.value);
    const dig = diggingMode.value === 'dual' ? digDualCell : digSingleCell;
    const activeDiggingLabel = diggingLabel();
    if (minimumRating > maximumRating) {
        setRunning(false);
        simStatus.textContent = 'Choose an upper limit that is at least the lower difficulty limit.';
        return;
    }
    let done = 0;
    let elapsed = 0;
    const qualifying = [];
    const unknown = [];
    const tick = async () => {
        if (thisRun !== runId)
            return;
        if (halted || done >= total) {
            const state = halted ? 'halted' : 'complete';
            simStatus.textContent = `${done}/${total} trials · average ${(elapsed / Math.max(1, done)).toFixed(1)} ms · ${qualifying.length} qualifying result(s) · ${unknown.length} unknown rating(s) · ${state} · shared ${activeDiggingLabel} digging`;
            setRunning(false);
            return;
        }
        const startedAt = performance.now();
        const puzzle = dig(generateCompletedGrid());
        const result = await calculateDifficulty(puzzle);
        if (thisRun !== runId || halted || result.cancelled)
            return;
        elapsed += performance.now() - startedAt;
        done += 1;
        const before = qualifying.length;
        if (result.unknown)
            unknown.push({ puzzle });
        else if (result.rating >= minimumRating && result.rating <= maximumRating && qualifying.length < 2)
            qualifying.push({ puzzle, rating: result.rating });
        simStatus.textContent = `${done}/${total} trials · average ${(elapsed / done).toFixed(1)} ms · ${qualifying.length} qualifying result(s) · ${unknown.length} unknown rating(s) · shared ${activeDiggingLabel} digging`;
        if (qualifying.length > before || result.unknown)
            show(qualifying, unknown, true);
        if (done < total && !halted)
            setTimeout(tick, 0);
        else if (halted)
            tick();
    };
    tick();
};
diggingMode.onchange = () => { if (!running)
    setRunning(false); };
toggle.onclick = () => {
    if (!running) {
        startSimulation();
        return;
    }
    halted = true;
    activeWorker?.terminate();
    settleActiveWorker?.({ cancelled: true });
    setRunning(false);
    simStatus.textContent = 'Simulation halted.';
};
