"use strict";
// @ts-nocheck
const { applyPlacement, buildCandidates, removeCandidate, solveWithTechniques, generateCompletedGrid, digSingleCell, digDualCell } = window.ExtendedSudokuCore;
const greyAreas = [[1, 10], [4, 7], [7, 4], [10, 1]];
const grid = document.querySelector('#grid');
const well = document.querySelector('#well');
const generator = document.querySelector('#generate');
const diggingMode = document.querySelector('#digging-mode');
const completedContent = document.querySelector('#completed-content');
const completedToggle = document.querySelector('#toggle-completed');
const actions = document.querySelector('#copy-actions');
const stringButton = document.querySelector('#copy-string');
const imageButton = document.querySelector('#copy-image');
const finalSection = document.querySelector('#final-section');
const finalGrid = document.querySelector('#final-grid');
const walkthroughBoard = document.querySelector('#walkthrough-board');
const topArrow = document.querySelector('#top-arrow');
const leftArrow = document.querySelector('#left-arrow');
const summary = document.querySelector('#generation-summary');
const finalStringButton = document.querySelector('#copy-final-string');
const finalImageButton = document.querySelector('#copy-final-image');
const techniqueTable = document.querySelector('#technique-table');
const stepSelect = document.querySelector('#solve-step-select');
const stepStartButton = document.querySelector('#step-start');
const stepPreviousButton = document.querySelector('#step-previous');
const stepNextButton = document.querySelector('#step-next');
const stepLastButton = document.querySelector('#step-last');
const solveStepLabel = document.querySelector('#solve-step-label');
const playableCells = [];
const values = Array.from({ length: 12 }, () => Array(12).fill(null));
let finalPuzzle = null;
let solveTrace = [];
const isBlackCell = cell => {
    const row = Math.floor(cell / 12) + 1;
    const column = cell % 12 + 1;
    return greyAreas.some(([startRow, startColumn]) => row >= startRow && row < startRow + 3 && column >= startColumn && column < startColumn + 3);
};
const layout = window.ExtendedEngine.buildLayout(isBlackCell);
for (let row = 1; row <= 12; row += 1) {
    for (let column = 1; column <= 12; column += 1) {
        const grey = greyAreas.some(([startRow, startColumn]) => row >= startRow && row < startRow + 3 && column >= startColumn && column < startColumn + 3);
        const cell = document.createElement(grey ? 'div' : 'button');
        cell.className = `cell${grey ? ' grey' : ''}${column % 3 === 0 ? ' v-divider' : ''}${row % 3 === 0 ? ' h-divider' : ''}`;
        cell.setAttribute('role', 'gridcell');
        if (!grey) {
            cell.type = 'button';
            cell.dataset.row = row;
            cell.dataset.column = column;
            const box = Math.floor((row - 1) / 3) * 4 + Math.floor((column - 1) / 3) + 1;
            cell.setAttribute('aria-label', `Row ${row}, column ${column}, Box ${box}`);
            cell.addEventListener('click', () => {
                well.textContent = `Row ${row}, column ${column} · Box ${box}`;
            });
            playableCells.push({ cell, row, column, box });
        }
        grid.append(cell);
    }
}
generator.addEventListener('click', () => {
    const startedAt = performance.now();
    const complete = generateCompletedGrid();
    playableCells.forEach(entry => {
        const cell = (entry.row - 1) * 12 + entry.column - 1;
        entry.cell.textContent = complete[cell];
        values[entry.row - 1][entry.column - 1] = complete[cell];
    });
    const puzzle = diggingMode.value === 'single' ? digSingleCell(complete) : digDualCell(complete);
    const removed = playableCells.length - puzzle.filter(Boolean).length;
    finalPuzzle = puzzle;
    playableCells.forEach(entry => {
        const cell = (entry.row - 1) * 12 + entry.column - 1;
        entry.cell.classList.toggle('given-number', Boolean(puzzle[cell]));
        entry.cell.classList.toggle('completed-only', !puzzle[cell]);
    });
    const solvedWalkthrough = solveWithTechniques(puzzle, true);
    solveTrace = solvedWalkthrough.moves;
    renderFinalGrid(0);
    const elapsed = ((performance.now() - startedAt) / 1000).toFixed(2);
    const difficultyPoints = { 'Naked Single': 4, 'Hidden Single': 14, 'Locked Candidates': 50, 'Naked Pair': 60, 'Naked Triple': 80, 'Hidden Pair': 70, 'Hidden Triple': 100, 'Naked Quad': 120, 'Hidden Quad': 150, 'Empty Rectangle': 120, 'Swordfish': 150, 'Jellyfish': 160, 'XY-Wing': 160, 'XYZ-Wing': 180, 'W-Wing': 150, 'Brute force': 10000 };
    const difficultyRating = solveTrace.reduce((total, step) => total + (difficultyPoints[step.technique] ?? 0), 0);
    summary.innerHTML = `Difficulty rating: <span class="difficulty-rating-value">${difficultyRating}</span> · ${108 - removed} clues · ${elapsed}s`;
    renderTechniqueTable(solveTrace);
    populateStepMenu();
    setReplayStep(0);
    finalSection.hidden = false;
    actions.hidden = false;
    well.textContent = 'Generated a valid Extended Sudoku grid';
});
completedToggle.addEventListener('click', () => {
    const isHidden = !completedContent.hidden;
    completedContent.hidden = isHidden;
    completedToggle.textContent = isHidden ? 'Show' : 'Hide';
    completedToggle.setAttribute('aria-expanded', String(!isHidden));
});
function renderFinalGrid(step) {
    if (!finalPuzzle)
        return;
    const replay = solverReplay(step);
    const { displayed, notes, eliminated, activeMove } = replay;
    const highlighted = new Set(activeMove?.sourceCells ?? []);
    finalGrid.replaceChildren();
    for (let cell = 0; cell < 144; cell += 1) {
        const row = Math.floor(cell / 12) + 1;
        const column = cell % 12 + 1;
        const tile = document.createElement('div');
        tile.className = `cell${isBlackCell(cell) ? ' grey' : ''}${column % 3 === 0 ? ' v-divider' : ''}${row % 3 === 0 ? ' h-divider' : ''}${highlighted.has(cell) ? ' step-highlight' : ''}`;
        tile.setAttribute('role', 'gridcell');
        if (!isBlackCell(cell) && displayed[cell]) {
            const number = document.createElement('span');
            number.className = finalPuzzle[cell] ? 'given-number' : 'placed-number completed-only';
            number.textContent = displayed[cell];
            tile.append(number);
        }
        else if (!isBlackCell(cell) && step > 0) {
            const candidateNotes = document.createElement('span');
            candidateNotes.className = 'candidate-notes';
            for (let digit = 1; digit <= 9; digit += 1) {
                if (!notes.get(cell)?.has(digit) && !eliminated.get(cell)?.has(digit))
                    continue;
                const note = document.createElement('span');
                note.className = `candidate candidate-${digit}${eliminated.get(cell)?.has(digit) ? ' eliminated' : ''}`;
                note.textContent = digit;
                candidateNotes.append(note);
            }
            tile.append(candidateNotes);
        }
        finalGrid.append(tile);
    }
}
function applySolverMove(displayed, notes, move) {
    if (move.cell !== undefined && move.digit !== undefined)
        applyPlacement(displayed, notes, move.cell, move.digit);
    move.eliminations?.forEach(({ cell, digit }) => removeCandidate(notes, cell, digit));
}
function solverReplay(step) {
    const displayed = [...finalPuzzle];
    const notes = buildCandidates(displayed);
    const eliminated = new Map();
    let activeMove = null;
    if (step >= 2) {
        for (let index = 0; index < step - 2; index += 1)
            applySolverMove(displayed, notes, solveTrace[index]);
        activeMove = solveTrace[step - 2];
        if (activeMove.cell !== undefined) {
            applySolverMove(displayed, notes, activeMove);
        }
        else {
            activeMove.eliminations?.forEach(({ cell, digit }) => {
                if (!eliminated.has(cell))
                    eliminated.set(cell, new Set());
                eliminated.get(cell).add(digit);
            });
        }
    }
    return { displayed, notes, eliminated, activeMove };
}
function renderTechniqueTable(trace) {
    const techniqueDifficulty = { 'Snyder Notation': 0, 'Naked Single': 4, 'Hidden Single': 14, 'Locked Candidates': 50, 'Naked Pair': 60, 'Hidden Pair': 70, 'Naked Triple': 80, 'Hidden Triple': 100, 'Naked Quad': 120, 'Empty Rectangle': 120, 'Hidden Quad': 150, 'Swordfish': 150, 'W-Wing': 150, 'Jellyfish': 160, 'XY-Wing': 160, 'XYZ-Wing': 180, 'Brute force': 10000 };
    const order = [...new Set(trace.map(step => step.technique))].sort((left, right) => (techniqueDifficulty[left] ?? Infinity) - (techniqueDifficulty[right] ?? Infinity) || left.localeCompare(right));
    techniqueTable.replaceChildren();
    order.forEach(technique => {
        const steps = trace
            .map((step, index) => ({ ...step, number: index + 2 }))
            .filter(step => step.technique === technique);
        if (!steps.length)
            return;
        const row = document.createElement('tr');
        const name = document.createElement('td');
        const details = document.createElement('td');
        name.textContent = technique;
        details.className = 'step-list';
        details.textContent = steps.map(step => step.number).join(', ');
        row.append(name, details);
        techniqueTable.append(row);
    });
}
function updateSolveLabel(step) {
    if (!solveTrace.length) {
        solveStepLabel.textContent = 'No empty cells to replay.';
        return;
    }
    if (step === 0) {
        solveStepLabel.textContent = 'Original puzzle — no Snyder notation.';
        return;
    }
    if (step === 1) {
        solveStepLabel.textContent = 'Snyder notation has been added to every non-given, non-shaded cell.';
        return;
    }
    const current = solveTrace[step - 2];
    solveStepLabel.textContent = `${step} / ${solveTrace.length + 1}: ${current.explanation ?? current.technique}`;
}
function populateStepMenu() {
    stepSelect.replaceChildren();
    for (let step = 0; step <= solveTrace.length + 1; step += 1) {
        const option = document.createElement('option');
        option.value = String(step);
        option.textContent = `Step ${step}`;
        stepSelect.append(option);
    }
}
function setReplayStep(requestedStep) {
    const step = Math.max(0, Math.min(solveTrace.length + 1, requestedStep));
    stepSelect.value = String(step);
    renderFinalGrid(step);
    updateSolveLabel(step);
    stepStartButton.disabled = step === 0;
    stepPreviousButton.disabled = step === 0;
    stepNextButton.disabled = step === solveTrace.length + 1;
    stepLastButton.disabled = step === solveTrace.length + 1;
    if (step < 2) {
        walkthroughBoard.classList.remove('has-active-step');
    }
    else {
        const cell = solveTrace[step - 2].sourceCells?.[0];
        if (cell === undefined) {
            walkthroughBoard.classList.remove('has-active-step');
            return;
        }
        const row = Math.floor(cell / 12);
        const column = cell % 12;
        topArrow.style.left = `${((column + 0.5) / 12) * 100}%`;
        leftArrow.style.top = `${((row + 0.5) / 12) * 100}%`;
        walkthroughBoard.classList.add('has-active-step');
    }
}
stepSelect.addEventListener('change', () => setReplayStep(Number(stepSelect.value)));
stepStartButton.addEventListener('click', () => setReplayStep(0));
stepPreviousButton.addEventListener('click', () => setReplayStep(Number(stepSelect.value) - 1));
stepNextButton.addEventListener('click', () => setReplayStep(Number(stepSelect.value) + 1));
stepLastButton.addEventListener('click', () => setReplayStep(solveTrace.length + 1));
async function copyText(text) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const helper = document.createElement('textarea');
    helper.value = text;
    document.body.append(helper);
    helper.select();
    document.execCommand('copy');
    helper.remove();
}
stringButton.addEventListener('click', async () => {
    try {
        await copyGridString(values.flat());
        well.textContent = 'Completed-grid string copied to clipboard';
    }
    catch {
        well.textContent = 'Could not copy the grid string';
    }
});
imageButton.addEventListener('click', async () => {
    try {
        await copyGridImage(values.flat());
        well.textContent = 'Completed-grid image copied to clipboard';
    }
    catch {
        well.textContent = 'Could not copy the grid image in this browser';
    }
});
finalStringButton.addEventListener('click', async () => {
    if (!finalPuzzle)
        return;
    try {
        await copyGridString(finalPuzzle);
        well.textContent = 'Final-grid string copied to clipboard';
    }
    catch {
        well.textContent = 'Could not copy the final-grid string';
    }
});
finalImageButton.addEventListener('click', async () => {
    if (!finalPuzzle)
        return;
    try {
        await copyGridImage(finalPuzzle);
        well.textContent = 'Final-grid image copied to clipboard';
    }
    catch {
        well.textContent = 'Could not copy the final-grid image in this browser';
    }
});
async function copyGridString(flatValues) {
    await copyText(flatValues.map(value => value || '.').join(''));
}
async function copyGridImage(flatValues) {
    if (!navigator.clipboard?.write || !window.ClipboardItem)
        throw new Error('unsupported');
    const size = 720;
    const outer = 7;
    const thick = 7;
    const thin = 1;
    const cellSize = (size - outer * 2 - thick * 3 - thin * 8) / 12;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    context.fillStyle = '#000';
    context.fillRect(0, 0, size, size);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '600 30px Arial';
    let y = outer;
    for (let row = 0; row < 12; row += 1) {
        let x = outer;
        for (let column = 0; column < 12; column += 1) {
            const cell = row * 12 + column;
            const value = flatValues[cell];
            if (!isBlackCell(cell)) {
                context.fillStyle = '#fff';
                context.fillRect(x, y, cellSize, cellSize);
            }
            if (value) {
                context.fillStyle = '#000';
                context.fillText(value, x + cellSize / 2, y + cellSize / 2);
            }
            x += cellSize + (column % 3 === 2 && column < 11 ? thick : thin);
        }
        y += cellSize + (row % 3 === 2 && row < 11 ? thick : thin);
    }
    const image = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!image)
        throw new Error('image');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })]);
}
