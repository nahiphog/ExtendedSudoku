"use strict";
// @ts-nocheck
const { ACTIVE_CELLS, generateCompletedGrid, digSingleCell } = window.ExtendedSudokuCore;
const trials = document.querySelector('#trials');
const limit = document.querySelector('#limit');
const toggle = document.querySelector('#simulation-toggle');
const simStatus = document.querySelector('#sim-status');
const selected = document.querySelector('#selected');
for (let count = 1; count <= 108; count += 1)
    limit.add(new Option(count, count, count === 30, count === 30));
let halted = false;
let running = false;
let runId = 0;
const setRunning = (value) => {
    running = value;
    toggle.textContent = value ? 'Halt simulation' : 'Run single-cell simulation';
    toggle.setAttribute('aria-pressed', String(value));
};
const stringify = (values) => values.map((value) => value || '.').join('');
const clueCount = (values) => ACTIVE_CELLS.filter((cell) => values[cell]).length;
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
function renderPuzzle(label, values) {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = `${label} — ${clueCount(values)} given cells`;
    const code = document.createElement('code');
    const text = stringify(values);
    code.textContent = text;
    item.append(title, code, copyButton(text));
    return item;
}
function show(qualifying, latest, clueLimit, focus = false) {
    selected.replaceChildren();
    const list = document.createElement('ol');
    if (qualifying.length) {
        qualifying.forEach((values, index) => list.append(renderPuzzle(`Qualifying result ${index + 1}`, values)));
    }
    else if (latest) {
        const notice = document.createElement('p');
        notice.textContent = `No trial met the “at most ${clueLimit}” cap yet. The most recent single-cell-dug puzzle is shown below.`;
        selected.append(notice);
        list.append(renderPuzzle('Most recent trial', latest));
    }
    selected.append(list);
    if (focus)
        selected.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
const startSimulation = () => {
    runId += 1;
    const thisRun = runId;
    halted = false;
    setRunning(true);
    selected.replaceChildren();
    const total = Number(trials.value);
    const clueLimit = Number(limit.value);
    let done = 0;
    let elapsed = 0;
    let latest = null;
    const qualifying = [];
    const tick = () => {
        if (thisRun !== runId)
            return;
        if (halted || done >= total) {
            const state = halted ? 'halted' : 'complete';
            simStatus.textContent = `${done}/${total} trials · average ${(elapsed / Math.max(1, done)).toFixed(1)} ms · ${qualifying.length} qualifying result(s) · ${state} · shared single-cell digging`;
            // A halted simulation should preserve only results that already met the
            // chosen criterion; a partially completed trial is not a result.
            show(qualifying, halted ? null : latest, clueLimit);
            setRunning(false);
            return;
        }
        const startedAt = performance.now();
        latest = digSingleCell(generateCompletedGrid());
        elapsed += performance.now() - startedAt;
        done += 1;
        const qualifyingCountBefore = qualifying.length;
        if (clueCount(latest) <= clueLimit && qualifying.length < 2)
            qualifying.push(latest);
        simStatus.textContent = `${done}/${total} trials · average ${(elapsed / done).toFixed(1)} ms · ${qualifying.length} qualifying result(s) · shared single-cell digging`;
        if (qualifying.length > qualifyingCountBefore)
            show(qualifying, latest, clueLimit);
        if (done < total && !halted)
            setTimeout(tick, 0);
        else
            show(qualifying, halted ? null : latest, clueLimit);
    };
    tick();
};
toggle.onclick = () => {
    if (running) {
        halted = true;
        runId += 1;
        setRunning(false);
        simStatus.textContent = 'Simulation halted.';
        return;
    }
    startSimulation();
};
