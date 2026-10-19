// @ts-nocheck
// Kept separate from the page thread so an unusually expensive rating can be
// safely stopped without freezing the simulation controls.
importScripts('./core/extended-sudoku-core.js');

self.onmessage = ({ data }) => {
  try {
    self.ExtendedSudokuCore.setGridFormat(data.format);
    const solved = self.ExtendedSudokuCore.solveWithTechniques(data.puzzle);
    self.postMessage({ moves: solved.moves });
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
