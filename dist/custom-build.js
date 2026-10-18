"use strict";
// @ts-nocheck
const { ACTIVE_CELLS, isBlackCell, applyPlacement, buildCandidates, removeCandidate, findSolutions, solveWithTechniques, generateCompletedGrid } = window.ExtendedSudokuCore;
const selectionGrid = document.querySelector('#custom-grid');
const selectedCount = document.querySelector('#selected-count');
const buildButton = document.querySelector('#build-toggle');
const minimumDifficulty = document.querySelector('#minimum-difficulty');
const maximumDifficulty = document.querySelector('#maximum-difficulty');
const attemptCounter = document.querySelector('#build-attempts');
const buildStatus = document.querySelector('#build-status');
const results = document.querySelector('#build-results');
const selected = new Set();
let isRunning = false;
let shouldHalt = false;
const techniqueWeights = {
    'Snyder Notation': 0, 'Naked Single': 4, 'Hidden Single': 14, 'Locked Candidates': 50,
    'Naked Pair': 60, 'Naked Triple': 80, 'Hidden Pair': 70, 'Hidden Triple': 100, 'Naked Quad': 120, 'Hidden Quad': 150,
    'Empty Rectangle': 120, 'Swordfish': 150, 'Jellyfish': 160, 'XY-Wing': 160, 'XYZ-Wing': 180, 'W-Wing': 150, 'Brute force': 10000,
};
const updateSelectionCount = () => { selectedCount.textContent = `${selected.size} cells selected.`; };
for (let cell = 0; cell < 144; cell += 1) {
    const row = Math.floor(cell / 12);
    const column = cell % 12;
    const tile = document.createElement(isBlackCell(cell) ? 'div' : 'button');
    tile.className = `cell${isBlackCell(cell) ? ' grey' : ''}${(column + 1) % 3 === 0 ? ' v-divider' : ''}${(row + 1) % 3 === 0 ? ' h-divider' : ''}`;
    if (!isBlackCell(cell)) {
        tile.type = 'button';
        tile.setAttribute('aria-pressed', 'false');
        tile.setAttribute('aria-label', `Select row ${row + 1}, column ${column + 1}`);
        tile.addEventListener('click', () => {
            if (isRunning)
                return;
            if (selected.has(cell))
                selected.delete(cell);
            else
                selected.add(cell);
            tile.classList.toggle('selected', selected.has(cell));
            tile.setAttribute('aria-pressed', String(selected.has(cell)));
            updateSelectionCount();
        });
    }
    selectionGrid.append(tile);
}
updateSelectionCount();
const createCell = (cell, values, givens, candidates, eliminated = new Set()) => {
    const row = Math.floor(cell / 12);
    const column = cell % 12;
    const element = document.createElement('div');
    element.className = `cell${isBlackCell(cell) ? ' grey' : ''}${(column + 1) % 3 === 0 ? ' v-divider' : ''}${(row + 1) % 3 === 0 ? ' h-divider' : ''}`;
    if (isBlackCell(cell))
        return element;
    if (values[cell]) {
        const number = document.createElement('span');
        number.className = givens[cell] ? 'given-number' : 'placed-number completed-only';
        number.textContent = String(values[cell]);
        element.append(number);
        return element;
    }
    if (!candidates)
        return element;
    const notes = candidates.get(cell);
    if (!notes)
        return element;
    const noteContainer = document.createElement('div');
    noteContainer.className = 'candidate-notes';
    for (let digit = 1; digit <= 9; digit += 1) {
        const removed = eliminated.has(`${cell}:${digit}`);
        if (!notes.has(digit) && !removed)
            continue;
        const note = document.createElement('span');
        note.className = `candidate candidate-${digit}${removed ? ' eliminated' : ''}`;
        note.textContent = String(digit);
        noteContainer.append(note);
    }
    element.append(noteContainer);
    return element;
};
const createBoard = (values, givens, candidates, eliminated) => {
    const grid = document.createElement('div');
    grid.className = 'grid final-grid custom-result-grid';
    for (let cell = 0; cell < 144; cell += 1)
        grid.append(createCell(cell, values, givens, candidates, eliminated));
    return grid;
};
const applyMove = (values, candidates, move) => {
    if (move.cell !== undefined && move.digit !== undefined)
        applyPlacement(values, candidates, move.cell, move.digit);
    move.eliminations?.forEach(({ cell, digit }) => removeCandidate(candidates, cell, digit));
};
const serializeGrid = (values) => values.map((value) => value || '.').join('');
const copyText = async (text) => {
    if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(text);
};
const copyGridImage = async (values) => {
    if (!navigator.clipboard?.write || !window.ClipboardItem)
        throw new Error('Clipboard unavailable');
    const size = 720;
    const cellSize = size / 12;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context)
        throw new Error('Canvas unavailable');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, size, size);
    for (let cell = 0; cell < 144; cell += 1) {
        const row = Math.floor(cell / 12);
        const column = cell % 12;
        if (isBlackCell(cell)) {
            context.fillStyle = '#20223d';
            context.fillRect(column * cellSize, row * cellSize, cellSize, cellSize);
            continue;
        }
        context.strokeStyle = '#aeb4d5';
        context.lineWidth = 1;
        context.strokeRect(column * cellSize, row * cellSize, cellSize, cellSize);
        if (!values[cell])
            continue;
        context.fillStyle = '#20223d';
        context.font = `600 ${cellSize * .52}px Arial`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(String(values[cell]), (column + .5) * cellSize, (row + .53) * cellSize);
    }
    context.strokeStyle = '#20223d';
    context.lineWidth = 6;
    for (let line = 0; line <= 12; line += 3) {
        context.beginPath();
        context.moveTo(0, line * cellSize);
        context.lineTo(size, line * cellSize);
        context.stroke();
        context.beginPath();
        context.moveTo(line * cellSize, 0);
        context.lineTo(line * cellSize, size);
        context.stroke();
    }
    const image = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!image)
        throw new Error('Image generation failed');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })]);
};
const createCopyActions = (values, label) => {
    const actions = document.createElement('div');
    actions.className = 'actions solution-copy-actions';
    const stringButton = document.createElement('button');
    stringButton.type = 'button';
    stringButton.textContent = `Copy ${label} string`;
    const imageButton = document.createElement('button');
    imageButton.type = 'button';
    imageButton.textContent = `Copy ${label} image`;
    stringButton.onclick = async () => { try {
        await copyText(serializeGrid(values));
        stringButton.textContent = 'Copied';
    }
    catch {
        stringButton.textContent = 'Copy failed';
    } };
    imageButton.onclick = async () => { try {
        await copyGridImage(values);
        imageButton.textContent = 'Copied';
    }
    catch {
        imageButton.textContent = 'Copy failed';
    } };
    actions.append(stringButton, imageButton);
    return actions;
};
const createTechniqueTable = (moves) => {
    const section = document.createElement('section');
    section.className = 'custom-technique-summary';
    const heading = document.createElement('h3');
    heading.textContent = 'Techniques used';
    const table = document.createElement('table');
    table.className = 'technique-ratings';
    const head = document.createElement('thead');
    head.innerHTML = '<tr><th scope="col">Technique</th><th scope="col">Steps</th></tr>';
    const body = document.createElement('tbody');
    [...new Set(moves.map((move) => move.technique))].forEach((technique) => {
        const row = document.createElement('tr');
        const name = document.createElement('td');
        name.textContent = technique;
        const steps = document.createElement('td');
        steps.className = 'step-list';
        steps.textContent = moves.map((move, index) => ({ move, number: index + 2 })).filter(({ move }) => move.technique === technique).map(({ number }) => number).join(', ');
        row.append(name, steps);
        body.append(row);
    });
    table.append(head, body);
    section.append(heading, table);
    return section;
};
const createWalkthrough = (givens, moves) => {
    const section = document.createElement('section');
    section.className = 'custom-walkthrough';
    const info = document.createElement('div');
    info.className = 'custom-walkthrough-info';
    const heading = document.createElement('h2');
    heading.textContent = 'Solution walkthrough';
    const rating = document.createElement('p');
    rating.textContent = `Difficulty rating: ${moves.reduce((total, move) => total + (techniqueWeights[move.technique] ?? 0), 0)}`;
    const controls = document.createElement('div');
    controls.className = 'step-controls';
    const first = document.createElement('button');
    first.type = 'button';
    first.textContent = '<<';
    first.title = 'Go to step 0';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.textContent = '‹';
    previous.title = 'Previous step';
    const select = document.createElement('select');
    const next = document.createElement('button');
    next.type = 'button';
    next.textContent = '›';
    next.title = 'Next step';
    const last = document.createElement('button');
    last.type = 'button';
    last.textContent = '>>';
    last.title = 'Go to last step';
    const label = document.createElement('p');
    label.className = 'solve-step-label';
    const board = document.createElement('div');
    board.className = 'final-grid-shell';
    const lastStep = moves.length + 1;
    for (let step = 0; step <= lastStep; step += 1)
        select.add(new Option(step === 0 ? 'Step 0 — Final grid' : step === 1 ? 'Step 1 — Add Snyder notation' : `Step ${step} — ${moves[step - 2].technique}`, String(step)));
    let currentStep = 0;
    const render = () => {
        const values = [...givens];
        const candidates = buildCandidates(values);
        let activeMove;
        let eliminated = new Set();
        if (currentStep >= 2) {
            for (let index = 0; index < currentStep - 2; index += 1)
                applyMove(values, candidates, moves[index]);
            activeMove = moves[currentStep - 2];
            if (activeMove.cell !== undefined)
                applyMove(values, candidates, activeMove);
            else
                eliminated = new Set((activeMove.eliminations ?? []).map(({ cell, digit }) => `${cell}:${digit}`));
        }
        const renderedBoard = createBoard(values, givens, currentStep > 0 ? candidates : undefined, eliminated);
        const highlightedCells = new Set();
        if (activeMove?.cell !== undefined)
            highlightedCells.add(activeMove.cell);
        activeMove?.eliminations?.forEach(({ cell }) => highlightedCells.add(cell));
        highlightedCells.forEach((cell) => renderedBoard.children[cell]?.classList.add('step-highlight'));
        board.replaceChildren(renderedBoard);
        first.disabled = currentStep === 0;
        previous.disabled = currentStep === 0;
        next.disabled = currentStep === lastStep;
        last.disabled = currentStep === lastStep;
        select.value = String(currentStep);
        label.textContent = currentStep === 0 ? 'Original custom-built puzzle.' : currentStep === 1 ? 'Snyder notation has been added.' : activeMove?.explanation ?? '';
    };
    first.onclick = () => { currentStep = 0; render(); };
    previous.onclick = () => { currentStep -= 1; render(); };
    next.onclick = () => { currentStep += 1; render(); };
    last.onclick = () => { currentStep = lastStep; render(); };
    select.onchange = () => { currentStep = Number(select.value); render(); };
    controls.append(first, previous, select, next, last);
    info.append(heading, rating, createTechniqueTable(moves), controls, label);
    section.append(board, info);
    render();
    return section;
};
const setRunning = (running) => {
    isRunning = running;
    buildButton.disabled = false;
    buildButton.textContent = running ? 'Halt' : 'Build now';
    buildButton.setAttribute('aria-pressed', String(running));
    minimumDifficulty.disabled = running;
    maximumDifficulty.disabled = running;
    selectionGrid.classList.toggle('is-building', running);
};
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
buildButton.addEventListener('click', async () => {
    if (isRunning) {
        shouldHalt = true;
        buildButton.disabled = true;
        buildStatus.textContent = 'Halting after the current attempt…';
        return;
    }
    if (!selected.size) {
        buildStatus.textContent = 'Select at least one cell before building a puzzle.';
        return;
    }
    const minimum = Number(minimumDifficulty.value);
    const maximum = Number(maximumDifficulty.value);
    if (minimum > maximum) {
        buildStatus.textContent = 'Choose a minimum difficulty that does not exceed the maximum.';
        return;
    }
    shouldHalt = false;
    setRunning(true);
    results.replaceChildren();
    let attempts = 0;
    const startedAt = performance.now();
    attemptCounter.textContent = 'Attempt: 0';
    buildStatus.textContent = 'Building puzzle — attempt 0…';
    await nextFrame();
    while (!shouldHalt) {
        attempts += 1;
        attemptCounter.textContent = `Attempt: ${attempts}`;
        const completed = generateCompletedGrid();
        const finalGrid = Array(144).fill(0);
        selected.forEach((cell) => { finalGrid[cell] = completed[cell]; });
        const found = findSolutions(finalGrid, 2);
        if (found.length === 1) {
            const solved = solveWithTechniques(finalGrid, true);
            const difficultyRating = solved.moves.reduce((total, move) => total + (techniqueWeights[move.technique] ?? 0), 0);
            if (difficultyRating < minimum || difficultyRating > maximum) {
                buildStatus.textContent = `Building puzzle — ${attempts} attempt${attempts === 1 ? '' : 's'} made; latest rating ${difficultyRating} is outside ${minimum}–${maximum}.`;
                await nextFrame();
                continue;
            }
            const card = document.createElement('section');
            card.className = 'validator-card custom-result';
            const elapsed = ((performance.now() - startedAt) / 1000).toFixed(2);
            const heading = document.createElement('h2');
            heading.textContent = `Custom puzzle built in ${attempts} attempt${attempts === 1 ? '' : 's'} · ${elapsed}s`;
            card.append(heading, createCopyActions(finalGrid, 'final grid'), createCopyActions(solved.solution, 'completed grid'), createWalkthrough(finalGrid, solved.moves));
            results.append(card);
            buildStatus.textContent = `Built a unique puzzle in ${attempts} attempt${attempts === 1 ? '' : 's'} · ${elapsed}s.`;
            setRunning(false);
            return;
        }
        buildStatus.textContent = `Building puzzle — ${attempts} attempt${attempts === 1 ? '' : 's'} made…`;
        await nextFrame();
    }
    const elapsed = ((performance.now() - startedAt) / 1000).toFixed(2);
    buildStatus.textContent = `Build halted after ${attempts} attempt${attempts === 1 ? '' : 's'} · ${elapsed}s.`;
    setRunning(false);
});
