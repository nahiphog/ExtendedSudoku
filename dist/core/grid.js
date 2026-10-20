export const GRID_SIZE = 12;
export const CELL_COUNT = GRID_SIZE * GRID_SIZE;
export const BOX_SIZE = 3;
export const DIGITS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9]);
/** Version 2 swaps row bands 4–6 and 7–9, then renumbers rows normally. */
const readGridVersion = () => {
    const scope = globalThis;
    if (scope.ExtendedSudokuGridVersion === 2)
        return 2;
    try {
        return scope.localStorage?.getItem('extended-sudoku-grid-version') === '2' ? 2 : 1;
    }
    catch {
        return 1;
    }
};
export const GRID_VERSION = readGridVersion();
export const BLACK_BOX_ORIGINS = Object.freeze(GRID_VERSION === 2
    ? [[1, 10], [4, 4], [7, 7], [10, 1]]
    : [[1, 10], [4, 7], [7, 4], [10, 1]]);
export const cellAt = (row, column) => row * GRID_SIZE + column;
export const positionOf = (cell) => {
    const row = Math.floor(cell / GRID_SIZE);
    const column = cell % GRID_SIZE;
    return { row, column, box: Math.floor(row / BOX_SIZE) * 4 + Math.floor(column / BOX_SIZE) + 1 };
};
export const isBlackCell = (cell) => {
    const { row, column } = positionOf(cell);
    return BLACK_BOX_ORIGINS.some(([startRow, startColumn]) => row + 1 >= startRow && row + 1 < startRow + BOX_SIZE &&
        column + 1 >= startColumn && column + 1 < startColumn + BOX_SIZE);
};
export const ACTIVE_CELLS = Object.freeze(Array.from({ length: CELL_COUNT }, (_, cell) => cell).filter((cell) => !isBlackCell(cell)));
const buildUnits = () => {
    const units = [];
    for (let row = 0; row < GRID_SIZE; row += 1) {
        units.push(Array.from({ length: GRID_SIZE }, (_, column) => cellAt(row, column)).filter((cell) => !isBlackCell(cell)));
    }
    for (let column = 0; column < GRID_SIZE; column += 1) {
        units.push(Array.from({ length: GRID_SIZE }, (_, row) => cellAt(row, column)).filter((cell) => !isBlackCell(cell)));
    }
    for (let box = 0; box < 16; box += 1) {
        const rowStart = Math.floor(box / 4) * BOX_SIZE;
        const columnStart = (box % 4) * BOX_SIZE;
        const cells = [];
        for (let row = rowStart; row < rowStart + BOX_SIZE; row += 1) {
            for (let column = columnStart; column < columnStart + BOX_SIZE; column += 1) {
                const cell = cellAt(row, column);
                if (!isBlackCell(cell))
                    cells.push(cell);
            }
        }
        if (cells.length)
            units.push(cells);
    }
    return units;
};
export const UNITS = Object.freeze(buildUnits().map((unit) => Object.freeze(unit)));
export const CELL_UNITS = Object.freeze(Array.from({ length: CELL_COUNT }, () => []).map((unitIndexes, cell) => {
    UNITS.forEach((unit, unitIndex) => { if (unit.includes(cell))
        unitIndexes.push(unitIndex); });
    return Object.freeze(unitIndexes);
}));
export const emptyGrid = () => Array(CELL_COUNT).fill(0);
export const serializePuzzle = (values) => Array.from({ length: CELL_COUNT }, (_, cell) => {
    const value = isBlackCell(cell) ? 0 : values[cell];
    return value >= 1 && value <= 9 ? String(value) : '.';
}).join('');
/** Parses a 144-character string. Black cells must be represented by periods. */
export const parsePuzzle = (input) => {
    const compact = input.replace(/\s/g, '');
    const errors = [];
    const values = emptyGrid();
    if (compact.length !== CELL_COUNT)
        errors.push('A puzzle must contain exactly 144 characters.');
    for (let cell = 0; cell < Math.min(compact.length, CELL_COUNT); cell += 1) {
        const character = compact[cell];
        if (character === '.')
            continue;
        if (!/^[1-9]$/.test(character)) {
            errors.push(`Character ${cell + 1} must be a digit 1–9 or a period.`);
            continue;
        }
        if (isBlackCell(cell)) {
            errors.push(`Character ${cell + 1} is in a black cell and must be a period.`);
            continue;
        }
        values[cell] = Number(character);
    }
    return { values, errors };
};
export const describeCell = (cell) => {
    const { row, column, box } = positionOf(cell);
    return `R${row + 1}C${column + 1} (Box ${box})`;
};
