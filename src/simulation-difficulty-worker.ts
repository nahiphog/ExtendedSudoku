// @ts-nocheck
// Kept separate from the page thread so an unusually expensive rating can be
// safely stopped without freezing the simulation controls.
self.onmessage = ({ data }) => {
  try {
    self.ExtendedSudokuGridVersion = data.version;
    importScripts('./core/extended-sudoku-core.js');
    const solved = self.ExtendedSudokuCore.solveWithTechniques(data.puzzle);
    self.postMessage({ moves: solved.moves });
  } catch (error) {
    self.postMessage({ error: String(error) });
  }
};
