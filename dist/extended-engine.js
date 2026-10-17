/*
 * Extended Sudoku uniqueness engine.
 * Adapted for this 12×12 / 9-symbol variant from the solver approach in
 * sudokUI (https://github.com/AImenes/sudokUI), GPL-3.0-or-later.
 */
(function () {
  const ALL_DIGITS = 0x1ff;
  const bitCount = value => {
    let count = 0;
    while (value) { value &= value - 1; count += 1; }
    return count;
  };

  function buildLayout(isBlack) {
    const units = [];
    for (let row = 0; row < 12; row += 1) units.push(Array.from({ length: 12 }, (_, column) => row * 12 + column).filter(cell => !isBlack(cell)));
    for (let column = 0; column < 12; column += 1) units.push(Array.from({ length: 12 }, (_, row) => row * 12 + column).filter(cell => !isBlack(cell)));
    for (let box = 0; box < 16; box += 1) {
      const rowStart = Math.floor(box / 4) * 3;
      const columnStart = (box % 4) * 3;
      const cells = [];
      for (let row = rowStart; row < rowStart + 3; row += 1) for (let column = columnStart; column < columnStart + 3; column += 1) {
        const cell = row * 12 + column;
        if (!isBlack(cell)) cells.push(cell);
      }
      if (cells.length) units.push(cells);
    }
    const cellUnits = Array.from({ length: 144 }, () => []);
    units.forEach((unit, unitIndex) => unit.forEach(cell => cellUnits[cell].push(unitIndex)));
    return { units, cellUnits, activeCells: cellUnits.map((item, cell) => item.length ? cell : -1).filter(cell => cell >= 0) };
  }

  function countSolutions(input, layout, limit = 2) {
    const values = [...input];
    const masks = Array(layout.units.length).fill(0);
    for (const cell of layout.activeCells) {
      const value = values[cell];
      if (!value) continue;
      const flag = 1 << (value - 1);
      if (layout.cellUnits[cell].some(unit => masks[unit] & flag)) return 0;
      layout.cellUnits[cell].forEach(unit => { masks[unit] |= flag; });
    }
    let found = 0;
    function search() {
      if (found >= limit) return;
      let bestCell = -1;
      let bestMask = 0;
      let bestCount = 10;
      for (const cell of layout.activeCells) {
        if (values[cell]) continue;
        let used = 0;
        layout.cellUnits[cell].forEach(unit => { used |= masks[unit]; });
        const choices = ALL_DIGITS & ~used;
        const count = bitCount(choices);
        if (!count) return;
        if (count < bestCount) { bestCell = cell; bestMask = choices; bestCount = count; if (count === 1) break; }
      }
      if (bestCell === -1) { found += 1; return; }
      for (let digit = 1; digit <= 9; digit += 1) {
        const flag = 1 << (digit - 1);
        if (!(bestMask & flag)) continue;
        values[bestCell] = digit;
        layout.cellUnits[bestCell].forEach(unit => { masks[unit] |= flag; });
        search();
        values[bestCell] = 0;
        layout.cellUnits[bestCell].forEach(unit => { masks[unit] &= ~flag; });
        if (found >= limit) return;
      }
    }
    search();
    return found;
  }

  window.ExtendedEngine = { buildLayout, countSolutions };
}());
