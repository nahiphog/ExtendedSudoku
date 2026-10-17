# Extended Sudoku Maker

Extended Sudoku uses a 12×12 board containing twelve active 3×3 boxes and four black 3×3 boxes (Boxes 4, 7, 10, and 13). Every active row, column, and box contains the digits 1–9 exactly once.

## Run locally

```sh
npm test
```

This compiles the TypeScript source from `src/` into `dist/` and validates the shared solver. Open `dist/index.html` to use the generator, or `dist/validator.html` to verify a 144-character puzzle string.

## Solver behaviour

The generator and verifier share the same engine under `src/core/`:

- `grid.ts` defines the board layout, black cells, units, and puzzle strings.
- `candidates.ts` maintains Snyder candidate state.
- `solver.ts` implements Naked/Hidden Singles, Locked Candidates, Naked/Hidden Pairs, Naked/Hidden Quads, solution counting, and a final brute-force fallback.

Walkthroughs record each legal placement or candidate elimination. Brute force is used only after the supported logical techniques make no further move.

## Puzzle strings

Puzzle strings are 144 characters, read from top left to bottom right. Use `1`–`9` for givens and `.` for empty or black cells. The four black 3×3 regions must use periods.
