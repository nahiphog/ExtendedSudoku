// @ts-nocheck
const { ACTIVE_CELLS, isBlackCell, positionOf, parsePuzzle, applyPlacement, buildCandidates, removeCandidate, findSolutions, solveWithTechniques } = window.ExtendedSudokuCore;

const input = document.querySelector<HTMLTextAreaElement>('#puzzle-input')!;
const button = document.querySelector<HTMLButtonElement>('#check-puzzle')!;
const validatorStatus = document.querySelector<HTMLOutputElement>('#validator-status')!;
const solutions = document.querySelector<HTMLDivElement>('#solutions')!;

const techniqueWeights: Record<Technique, number> = {
  'Snyder Notation': 0, 'Naked Single': 4, 'Hidden Single': 6, 'Locked Candidates': 8,
  'Naked Pair': 10, 'Hidden Pair': 12, 'Naked Quad': 18, 'Hidden Quad': 20,
  'Empty Rectangle': 24, 'XY-Wing': 26, 'XYZ-Wing': 28, 'W-Wing': 30, 'Brute force': 10000,
};

const createCell = (cell: number, values: readonly number[], givens: readonly number[], candidates?: CandidateMap,
  eliminated = new Set<string>(), highlighted = new Set<number>()): HTMLDivElement => {
  const { row, column } = positionOf(cell);
  const element = document.createElement('div');
  element.className = `cell${isBlackCell(cell) ? ' grey' : ''}${(column + 1) % 3 === 0 ? ' v-divider' : ''}${(row + 1) % 3 === 0 ? ' h-divider' : ''}${highlighted.has(cell) ? ' step-highlight' : ''}${!isBlackCell(cell) && !givens[cell] && values[cell] ? ' completed-solution' : ''}`;
  if (isBlackCell(cell)) return element;
  if (values[cell]) {
    const number = document.createElement('span');
    number.className = givens[cell] ? 'given-number' : 'placed-number solution-number';
    number.textContent = String(values[cell]);
    element.append(number);
    return element;
  }
  const notes = candidates?.get(cell);
  if (!notes) return element;
  const noteContainer = document.createElement('div');
  noteContainer.className = 'candidate-notes';
  for (let digit = 1; digit <= 9; digit += 1) {
    const wasEliminated = eliminated.has(`${cell}:${digit}`);
    if (!notes.has(digit as Digit) && !wasEliminated) continue;
    const note = document.createElement('span');
    note.className = `candidate candidate-${digit}${wasEliminated ? ' eliminated' : ''}`;
    note.textContent = String(digit);
    noteContainer.append(note);
  }
  element.append(noteContainer);
  return element;
};

const createBoard = (values: readonly number[], givens: readonly number[], candidates?: CandidateMap,
  eliminated = new Set<string>(), highlighted = new Set<number>(), sourceCells: number[] = []): HTMLDivElement => {
  const board = document.createElement('div');
  board.className = `walkthrough-board${sourceCells.length ? ' has-active-step' : ''}`;
  const topGuide = document.createElement('div'); topGuide.className = 'top-guide';
  const leftGuide = document.createElement('div'); leftGuide.className = 'left-guide';
  sourceCells.forEach((cell) => {
    const { row, column } = positionOf(cell);
    const topArrow = document.createElement('span');
    topArrow.className = 'guide-arrow'; topArrow.textContent = '▼';
    topArrow.style.left = `${((column + 0.5) / 12) * 100}%`;
    const leftArrow = document.createElement('span');
    leftArrow.className = 'guide-arrow'; leftArrow.textContent = '▶';
    leftArrow.style.top = `${((row + 0.5) / 12) * 100}%`;
    topGuide.append(topArrow); leftGuide.append(leftArrow);
  });
  const grid = document.createElement('div'); grid.className = 'grid final-grid validator-grid';
  for (let cell = 0; cell < 144; cell += 1) grid.append(createCell(cell, values, givens, candidates, eliminated, highlighted));
  board.append(topGuide, leftGuide, grid);
  return board;
};

const applyMove = (values: GridValues, candidates: CandidateMap, move: SolveMove): void => {
  if (move.cell !== undefined && move.digit !== undefined) applyPlacement(values, candidates, move.cell, move.digit);
  move.eliminations?.forEach(({ cell, digit }) => removeCandidate(candidates, cell, digit));
};

const buildTechniqueTable = (moves: readonly SolveMove[]): HTMLTableElement => {
  const table = document.createElement('table');
  const header = table.insertRow();
  ['Technique', 'Steps'].forEach((label) => { const cell = document.createElement('th'); cell.textContent = label; header.append(cell); });
  const byTechnique = new Map<Technique, number[]>();
  moves.forEach((move, index) => { const steps = byTechnique.get(move.technique) ?? []; steps.push(index + 2); byTechnique.set(move.technique, steps); });
  byTechnique.forEach((steps, technique) => {
    const row = table.insertRow(); row.insertCell().textContent = technique;
    const stepsCell = row.insertCell(); stepsCell.className = 'step-list'; stepsCell.textContent = steps.join(', ');
  });
  return table;
};

const createWalkthrough = (givens: GridValues, moves: SolveMove[]): HTMLElement => {
  const workspace = document.createElement('div'); workspace.className = 'final-workspace validator-workspace';
  const gridShell = document.createElement('div'); gridShell.className = 'final-grid-shell';
  const statistics = document.createElement('section'); statistics.className = 'statistics';
  const heading = document.createElement('h2'); heading.textContent = 'Solution walkthrough';
  const difficulty = document.createElement('p');
  difficulty.textContent = `Difficulty rating: ${moves.reduce((total, move) => total + techniqueWeights[move.technique], 0)}`;
  const key = document.createElement('p'); key.className = 'snyder-key';
  key.textContent = 'Blue = Snyder notation or a solved non-given number. Red struck notation = candidate eliminated in this step.';
  const techniqueHeading = document.createElement('h3'); techniqueHeading.textContent = 'Techniques used';
  const stepHeading = document.createElement('h3'); stepHeading.textContent = 'Step-by-step solution';
  const controls = document.createElement('div'); controls.className = 'step-controls';
  const start = document.createElement('button'); start.textContent = '≪'; start.title = 'Go to step 0';
  const previous = document.createElement('button'); previous.textContent = '‹'; previous.title = 'Previous step';
  const select = document.createElement('select');
  const next = document.createElement('button'); next.textContent = '›'; next.title = 'Next step';
  const last = document.createElement('button'); last.textContent = '≫'; last.title = 'Go to last step';
  const label = document.createElement('p'); label.className = 'solve-step-label';
  const lastStep = moves.length + 1;
  for (let step = 0; step <= lastStep; step += 1) {
    const text = step === 0 ? 'Step 0 — Original puzzle' : step === 1 ? 'Step 1 — Add Snyder notation' : `Step ${step} — ${moves[step - 2].technique}`;
    select.add(new Option(text, String(step)));
  }
  let currentStep = 0;
  const render = (): void => {
    const state = [...givens];
    const candidates = buildCandidates(state);
    let activeMove: SolveMove | undefined;
    let eliminated = new Set<string>();
    if (currentStep >= 2) {
      for (let index = 0; index < currentStep - 2; index += 1) applyMove(state, candidates, moves[index]);
      activeMove = moves[currentStep - 2];
      if (activeMove.cell !== undefined) applyMove(state, candidates, activeMove);
      else eliminated = new Set((activeMove.eliminations ?? []).map(({ cell, digit }) => `${cell}:${digit}`));
    }
    const sources = activeMove?.sourceCells ?? [];
    gridShell.replaceChildren(createBoard(state, givens, currentStep > 0 ? candidates : undefined, eliminated, new Set(sources), sources));
    select.value = String(currentStep);
    start.disabled = currentStep === 0; previous.disabled = currentStep === 0;
    next.disabled = currentStep === lastStep; last.disabled = currentStep === lastStep;
    label.textContent = currentStep === 0 ? 'Original puzzle — no Snyder notation.'
      : currentStep === 1 ? 'Snyder notation has been added to every non-given cell.' : activeMove?.explanation ?? '';
  };
  const setStep = (step: number): void => { currentStep = Math.max(0, Math.min(lastStep, step)); render(); };
  start.onclick = () => setStep(0); previous.onclick = () => setStep(currentStep - 1);
  next.onclick = () => setStep(currentStep + 1); last.onclick = () => setStep(lastStep);
  select.onchange = () => setStep(Number(select.value));
  controls.append(start, previous, select, next, last);
  statistics.append(heading, difficulty, key, techniqueHeading, buildTechniqueTable(moves), stepHeading, controls, label);
  workspace.append(gridShell, statistics); render();
  return workspace;
};

const createSolutionCard = (heading: string, values: GridValues, givens: GridValues, other?: GridValues): HTMLElement => {
  const card = document.createElement('div'); card.className = 'validator-card';
  const title = document.createElement('h2'); title.textContent = heading; card.append(title);
  const board = createBoard(values, givens);
  if (other) ACTIVE_CELLS.forEach((cell) => { if (values[cell] !== other[cell]) board.querySelectorAll('.cell')[cell].classList.add('differs'); });
  card.append(board); return card;
};

button.addEventListener('click', () => {
  solutions.replaceChildren();
  const parsed = parsePuzzle(input.value);
  if (parsed.errors.length) { validatorStatus.textContent = parsed.errors[0]; return; }
  const givens = [...parsed.values];
  const found = findSolutions(givens, 2);
  if (!found.length) { validatorStatus.textContent = 'This puzzle has no solution.'; return; }
  if (found.length > 1) {
    validatorStatus.textContent = 'This puzzle is not unique. Two solutions are shown; differing cells are orange.';
    solutions.append(createSolutionCard('Solution 1', found[0], givens, found[1]), createSolutionCard('Solution 2', found[1], givens, found[0]));
    solutions.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const solved = solveWithTechniques(givens, true);
  validatorStatus.textContent = !solved.walkthroughValid
    ? `This puzzle has a unique solution. The walkthrough stopped safely: ${solved.walkthroughError}`
    : solved.usedBruteForce
    ? 'This puzzle has a unique solution. Logical techniques are shown first; brute force follows only when they are exhausted.'
    : 'This puzzle has a unique solution using the supported logical techniques.';
  const card = document.createElement('div'); card.className = 'validator-card';
  const heading = document.createElement('h2'); heading.textContent = 'Unique solution';
  card.append(heading);
  if (!solved.walkthroughValid && solved.solution) {
    const solutionHeading = document.createElement('h3'); solutionHeading.textContent = 'Solved grid';
    card.append(solutionHeading, createBoard(solved.solution, givens));
  }
  card.append(createWalkthrough(givens, solved.moves)); solutions.append(card);
  solutions.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
