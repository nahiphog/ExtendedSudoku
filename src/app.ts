// @ts-nocheck
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
          const grey = greyAreas.some(([startRow, startColumn]) =>
            row >= startRow && row < startRow + 3 && column >= startColumn && column < startColumn + 3
          );
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
        const shuffle = input => {
          const result = [...input];
          for (let index = result.length - 1; index > 0; index -= 1) {
            const swapIndex = Math.floor(Math.random() * (index + 1));
            [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
          }
          return result;
        };
        const solution = Array.from({ length: 12 }, () => Array(12).fill(0));
        const rowMasks = Array(12).fill(0);
        const columnMasks = Array(12).fill(0);
        const boxMasks = Array(16).fill(0);
        const solve = remaining => {
          if (remaining === 0) return true;
          let best;
          let candidates;
          for (const entry of playableCells) {
            const { row, column, box } = entry;
            if (solution[row - 1][column - 1]) continue;
            const mask = 0x1ff & ~(rowMasks[row - 1] | columnMasks[column - 1] | boxMasks[box - 1]);
            const options = [];
            for (let digit = 1; digit <= 9; digit += 1) if (mask & (1 << (digit - 1))) options.push(digit);
            if (!options.length) return false;
            if (!best || options.length < candidates.length) {
              best = entry;
              candidates = options;
              if (options.length === 1) break;
            }
          }
          for (const digit of shuffle(candidates)) {
            const { row, column, box } = best;
            const bit = 1 << (digit - 1);
            solution[row - 1][column - 1] = digit;
            rowMasks[row - 1] |= bit;
            columnMasks[column - 1] |= bit;
            boxMasks[box - 1] |= bit;
            if (solve(remaining - 1)) return true;
            solution[row - 1][column - 1] = 0;
            rowMasks[row - 1] ^= bit;
            columnMasks[column - 1] ^= bit;
            boxMasks[box - 1] ^= bit;
          }
          return false;
        };
        solve(playableCells.length);
        for (let digit = 1; digit <= 9; digit += 1) {
          for (let box = 1; box <= 16; box += 1) {
            const entry = playableCells.find(cell => cell.box === box && solution[cell.row - 1][cell.column - 1] === digit);
            if (!entry) continue;
            entry.cell.textContent = digit;
            values[entry.row - 1][entry.column - 1] = digit;
          }
        }
        const complete = solution.flat();
        const puzzle = [...complete];
        let removed = 0;
        const diggingTargets = diggingMode.value === 'dual'
          ? shuffle(playableCells).filter(entry => {
              const mirror = playableCells.find(other => other.row === 13 - entry.row && other.column === 13 - entry.column);
              return mirror && (entry.row < mirror.row || (entry.row === mirror.row && entry.column <= mirror.column));
            })
          : shuffle(playableCells);
        for (const entry of diggingTargets) {
          const cell = (entry.row - 1) * 12 + entry.column - 1;
          const mirrorEntry = diggingMode.value === 'dual'
            ? playableCells.find(other => other.row === 13 - entry.row && other.column === 13 - entry.column)
            : null;
          const mirrorCell = mirrorEntry ? (mirrorEntry.row - 1) * 12 + mirrorEntry.column - 1 : cell;
          const saved = puzzle[cell];
          const mirrorSaved = puzzle[mirrorCell];
          puzzle[cell] = 0;
          puzzle[mirrorCell] = 0;
          if (window.ExtendedEngine.countSolutions(puzzle, layout, 2) === 1) {
            removed += cell === mirrorCell ? 1 : 2;
          } else {
            puzzle[cell] = saved;
            puzzle[mirrorCell] = mirrorSaved;
          }
        }
        finalPuzzle = puzzle;
        playableCells.forEach(entry => {
          const cell = (entry.row - 1) * 12 + entry.column - 1;
          entry.cell.classList.toggle('completed-solution', !puzzle[cell]);
        });
        solveTrace = buildSolveTrace(puzzle, complete) ?? [];
        renderFinalGrid(0);
        const elapsed = ((performance.now() - startedAt) / 1000).toFixed(2);
        const difficultyPoints = { 'Naked Single': 4, 'Hidden Single': 6 };
        const difficultyRating = solveTrace.reduce((total, step) => total + (difficultyPoints[step.technique] ?? 0), 0);
        summary.textContent = `Difficulty rating: ${difficultyRating} · Unique minimal puzzle · ${108 - removed} clues · ${elapsed}s`;
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

      function candidatesFor(values, cell) {
        const row = Math.floor(cell / 12);
        const column = cell % 12;
        const boxRow = Math.floor(row / 3) * 3;
        const boxColumn = Math.floor(column / 3) * 3;
        const used = new Set();
        for (let index = 0; index < 12; index += 1) {
          used.add(values[row * 12 + index]);
          used.add(values[index * 12 + column]);
        }
        for (let boxRowOffset = 0; boxRowOffset < 3; boxRowOffset += 1) {
          for (let boxColumnOffset = 0; boxColumnOffset < 3; boxColumnOffset += 1) {
            used.add(values[(boxRow + boxRowOffset) * 12 + boxColumn + boxColumnOffset]);
          }
        }
        return Array.from({ length: 9 }, (_, index) => index + 1).filter(digit => !used.has(digit));
      }

      function combinations(items, size) {
        const result = [];
        const visit = (start, picked) => {
          if (picked.length === size) { result.push(picked); return; }
          for (let index = start; index <= items.length - (size - picked.length); index += 1) visit(index + 1, [...picked, items[index]]);
        };
        visit(0, []);
        return result;
      }

      function findSubsetEliminations(candidateMap, hidden) {
        for (const size of [2, 4]) {
          for (const unit of layout.units) {
            const open = unit.filter(cell => candidateMap.has(cell));
            if (hidden) {
              for (const digits of combinations([1, 2, 3, 4, 5, 6, 7, 8, 9], size)) {
                const cells = [...new Set(digits.flatMap(digit => open.filter(cell => candidateMap.get(cell).includes(digit))))];
                if (cells.length !== size) continue;
                const eliminations = cells.flatMap(cell => candidateMap.get(cell).filter(digit => !digits.includes(digit)).map(digit => ({ cell, digit })));
                if (eliminations.length) return { technique: `Hidden ${size === 2 ? 'Pair' : 'Quad'}`, eliminations };
              }
            } else {
              const eligible = open.filter(cell => candidateMap.get(cell).length >= 2 && candidateMap.get(cell).length <= size);
              for (const cells of combinations(eligible, size)) {
                const digits = [...new Set(cells.flatMap(cell => candidateMap.get(cell)))];
                if (digits.length !== size) continue;
                const eliminations = open.filter(cell => !cells.includes(cell)).flatMap(cell => candidateMap.get(cell).filter(digit => digits.includes(digit)).map(digit => ({ cell, digit })));
                if (eliminations.length) return { technique: `Naked ${size === 2 ? 'Pair' : 'Quad'}`, eliminations };
              }
            }
          }
        }
        return null;
      }

      function findLockedCandidateEliminations(candidateMap) {
        const activeBoxes = Array.from({ length: 16 }, (_, index) => index + 1)
          .map(box => playableCells.filter(entry => entry.box === box).map(entry => (entry.row - 1) * 12 + entry.column - 1))
          .filter(cells => cells.length);
        for (const box of activeBoxes) {
          for (let digit = 1; digit <= 9; digit += 1) {
            const sources = box.filter(cell => candidateMap.get(cell)?.includes(digit));
            if (sources.length < 2) continue;
            const rows = [...new Set(sources.map(cell => Math.floor(cell / 12)))];
            const columns = [...new Set(sources.map(cell => cell % 12))];
            const targets = rows.length === 1
              ? Array.from(candidateMap.keys()).filter(cell => Math.floor(cell / 12) === rows[0] && !box.includes(cell) && candidateMap.get(cell).includes(digit))
              : columns.length === 1
                ? Array.from(candidateMap.keys()).filter(cell => cell % 12 === columns[0] && !box.includes(cell) && candidateMap.get(cell).includes(digit))
                : [];
            if (targets.length) return { technique: 'Locked Candidates', eliminations: targets.map(cell => ({ cell, digit })) };
          }
        }
        return null;
      }

      function buildSolveTrace(puzzle, complete) {
        const working = [...puzzle];
        const trace = [];
        const bannedCandidates = new Map();
        while (true) {
          const candidateMap = new Map();
          for (const entry of playableCells) {
            const cell = (entry.row - 1) * 12 + entry.column - 1;
            if (working[cell]) continue;
            const candidates = candidatesFor(working, cell).filter(digit => !bannedCandidates.get(cell)?.has(digit));
            candidateMap.set(cell, candidates);
          }
          if (!candidateMap.size) return trace;
          const nakedSingle = Array.from(candidateMap, ([cell, candidates]) => ({ cell, candidates })).find(({ candidates }) => candidates.length === 1);
          if (nakedSingle) {
            trace.push({ cell: nakedSingle.cell, digit: complete[nakedSingle.cell], technique: 'Naked Single' });
            working[nakedSingle.cell] = complete[nakedSingle.cell];
            continue;
          }
          let hiddenSingle = null;
          for (const unit of layout.units) {
            for (let digit = 1; digit <= 9; digit += 1) {
              const candidates = unit.filter(cell => candidateMap.get(cell)?.includes(digit));
              if (candidates.length === 1) {
                hiddenSingle = { cell: candidates[0], digit };
                break;
              }
            }
            if (hiddenSingle) break;
          }
          if (hiddenSingle) {
            trace.push({ cell: hiddenSingle.cell, digit: complete[hiddenSingle.cell], technique: 'Hidden Single' });
            working[hiddenSingle.cell] = complete[hiddenSingle.cell];
            continue;
          }
          const advanced = findLockedCandidateEliminations(candidateMap)
            || findSubsetEliminations(candidateMap, false)
            || findSubsetEliminations(candidateMap, true);
          if (advanced) {
            advanced.eliminations.forEach(({ cell, digit }) => {
              if (!bannedCandidates.has(cell)) bannedCandidates.set(cell, new Set());
              bannedCandidates.get(cell).add(digit);
            });
            continue;
          }
          return null;
        }
      }

      function renderFinalGrid(step) {
        if (!finalPuzzle) return;
        const displayed = replayValues(step);
        const previous = step ? replayValues(step - 1) : null;
        const filledCells = new Set(solveTrace.slice(0, step).map(({ cell }) => cell));
        const notes = snyderNotesFor(displayed);
        const eliminated = previous ? eliminatedSnyderNotes(snyderNotesFor(previous), notes, displayed) : new Map();
        finalGrid.replaceChildren();
        for (let cell = 0; cell < 144; cell += 1) {
          const row = Math.floor(cell / 12) + 1;
          const column = cell % 12 + 1;
          const tile = document.createElement('div');
          tile.className = `cell${isBlackCell(cell) ? ' grey' : ''}${column % 3 === 0 ? ' v-divider' : ''}${row % 3 === 0 ? ' h-divider' : ''}${step && solveTrace[step - 1].cell === cell ? ' step-highlight' : ''}`;
          tile.setAttribute('role', 'gridcell');
          if (!isBlackCell(cell) && displayed[cell]) {
            const number = document.createElement('span');
            number.className = `placed-number${filledCells.has(cell) ? ' solution-number' : ''}`;
            number.textContent = displayed[cell];
            tile.append(number);
          } else if (!isBlackCell(cell)) {
            const candidateNotes = document.createElement('span');
            candidateNotes.className = 'candidate-notes';
            for (let digit = 1; digit <= 9; digit += 1) {
              if (!notes.get(cell)?.has(digit) && !eliminated.get(cell)?.has(digit)) continue;
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

      function replayValues(step) {
        const displayed = [...finalPuzzle];
        solveTrace.slice(0, step).forEach(({ cell, digit }) => { displayed[cell] = digit; });
        return displayed;
      }

      function snyderNotesFor(currentValues) {
        const notes = new Map();
        playableCells.forEach(({ row, column }) => {
          const cell = (row - 1) * 12 + column - 1;
          if (!currentValues[cell]) notes.set(cell, new Set(candidatesFor(currentValues, cell)));
        });
        return notes;
      }

      function eliminatedSnyderNotes(previousNotes, currentNotes, displayed) {
        const eliminated = new Map();
        previousNotes.forEach((digits, cell) => {
          if (displayed[cell]) return;
          digits.forEach(digit => {
            if (!currentNotes.get(cell)?.has(digit)) {
              if (!eliminated.has(cell)) eliminated.set(cell, new Set());
              eliminated.get(cell).add(digit);
            }
          });
        });
        return eliminated;
      }

      function renderTechniqueTable(trace) {
        const order = ['Naked Single', 'Hidden Single'];
        techniqueTable.replaceChildren();
        order.forEach(technique => {
          const steps = trace
            .map((step, index) => ({ ...step, number: index + 1 }))
            .filter(step => step.technique === technique);
          if (!steps.length) return;
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
          solveStepLabel.textContent = `0 / ${solveTrace.length}: starting puzzle. Candidate (Snyder) marks appear in every empty, non-shaded cell.`;
          return;
        }
        const current = solveTrace[step - 1];
        const row = Math.floor(current.cell / 12) + 1;
        const column = current.cell % 12 + 1;
        const box = Math.floor((row - 1) / 3) * 4 + Math.floor((column - 1) / 3) + 1;
        const displayed = replayValues(step);
        const eliminated = eliminatedSnyderNotes(snyderNotesFor(replayValues(step - 1)), snyderNotesFor(displayed), displayed);
        const eliminatedCount = Array.from(eliminated.values()).reduce((total, digits) => total + digits.size, 0);
        solveStepLabel.textContent = `${step} / ${solveTrace.length}: Row ${row}, column ${column}, Box ${box} is highlighted — place ${current.digit} using ${current.technique}. ${eliminatedCount} Snyder mark${eliminatedCount === 1 ? '' : 's'} ${eliminatedCount === 1 ? 'is' : 'are'} red and will be removed at the next step.`;
      }

      function populateStepMenu() {
        stepSelect.replaceChildren();
        for (let step = 0; step <= solveTrace.length; step += 1) {
          const option = document.createElement('option');
          option.value = String(step);
          option.textContent = `Step ${step}`;
          stepSelect.append(option);
        }
      }

      function setReplayStep(requestedStep) {
        const step = Math.max(0, Math.min(solveTrace.length, requestedStep));
        stepSelect.value = String(step);
        renderFinalGrid(step);
        updateSolveLabel(step);
        stepStartButton.disabled = step === 0;
        stepPreviousButton.disabled = step === 0;
        stepNextButton.disabled = step === solveTrace.length;
        stepLastButton.disabled = step === solveTrace.length;
        if (step === 0) {
          walkthroughBoard.classList.remove('has-active-step');
        } else {
          const cell = solveTrace[step - 1].cell;
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
      stepLastButton.addEventListener('click', () => setReplayStep(solveTrace.length));

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
        } catch {
          well.textContent = 'Could not copy the grid string';
        }
      });

      imageButton.addEventListener('click', async () => {
        try {
          await copyGridImage(values.flat());
          well.textContent = 'Completed-grid image copied to clipboard';
        } catch {
          well.textContent = 'Could not copy the grid image in this browser';
        }
      });

      finalStringButton.addEventListener('click', async () => {
        if (!finalPuzzle) return;
        try {
          await copyGridString(finalPuzzle);
          well.textContent = 'Final-grid string copied to clipboard';
        } catch {
          well.textContent = 'Could not copy the final-grid string';
        }
      });

      finalImageButton.addEventListener('click', async () => {
        if (!finalPuzzle) return;
        try {
          await copyGridImage(finalPuzzle);
          well.textContent = 'Final-grid image copied to clipboard';
        } catch {
          well.textContent = 'Could not copy the final-grid image in this browser';
        }
      });

      async function copyGridString(flatValues) {
        await copyText(flatValues.map(value => value || '.').join(''));
      }

      async function copyGridImage(flatValues) {
        if (!navigator.clipboard?.write || !window.ClipboardItem) throw new Error('unsupported');
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
        if (!image) throw new Error('image');
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': image })]);
      }
