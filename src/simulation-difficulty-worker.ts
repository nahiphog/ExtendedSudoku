// @ts-nocheck
// Kept separate from the page thread so an unusually expensive rating can be
// safely stopped without freezing the simulation controls.
importScripts('./core/extended-sudoku-core.js');

self.onmessage = ({ data: puzzle }) => {
  try {
    const solved = self.ExtendedSudokuCore.solveWithTechniques(puzzle);
    self.postMessage({ moves: solved.moves });
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
