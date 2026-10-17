import { ACTIVE_CELLS, CELL_UNITS, DIGITS, UNITS, isBlackCell } from './grid.js';
export const candidatesFor = (values, cell) => {
    if (isBlackCell(cell) || values[cell])
        return [];
    const used = new Set();
    CELL_UNITS[cell].forEach((unitIndex) => {
        UNITS[unitIndex].forEach((peer) => { if (values[peer])
            used.add(values[peer]); });
    });
    return DIGITS.filter((digit) => !used.has(digit));
};
export const buildCandidates = (values) => {
    const candidates = new Map();
    ACTIVE_CELLS.forEach((cell) => {
        if (!values[cell])
            candidates.set(cell, new Set(candidatesFor(values, cell)));
    });
    return candidates;
};
export const cloneCandidates = (candidates) => new Map(Array.from(candidates, ([cell, digits]) => [cell, new Set(digits)]));
export const removeCandidate = (candidates, cell, digit) => {
    const cellCandidates = candidates.get(cell);
    if (!cellCandidates || !cellCandidates.has(digit))
        return false;
    cellCandidates.delete(digit);
    return true;
};
export const applyPlacement = (values, candidates, cell, digit) => {
    values[cell] = digit;
    candidates.delete(cell);
    CELL_UNITS[cell].forEach((unitIndex) => {
        UNITS[unitIndex].forEach((peer) => removeCandidate(candidates, peer, digit));
    });
};
