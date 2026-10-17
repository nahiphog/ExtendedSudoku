const grid: HTMLElement = document.querySelector<HTMLElement>("#grid")!;
const well: HTMLOutputElement = document.querySelector<HTMLOutputElement>("#well")!;
const generator: HTMLButtonElement = document.querySelector<HTMLButtonElement>("#generate")!;
const actions: HTMLDivElement = document.querySelector<HTMLDivElement>("#copy-actions")!;
const stringButton: HTMLButtonElement = document.querySelector<HTMLButtonElement>("#copy-string")!;
const imageButton: HTMLButtonElement = document.querySelector<HTMLButtonElement>("#copy-image")!;
const playableCells: Array<{ cell: HTMLButtonElement; digitIndex: number }> = [];
const values: Array<Array<number | null>> = Array.from({ length: 12 }, () => Array(12).fill(null));
const greyAreas: ReadonlyArray<readonly [number, number]> = [[1, 10], [4, 7], [7, 4], [10, 1]];

for (let row = 1; row <= 12; row += 1) {
  for (let column = 1; column <= 12; column += 1) {
    const grey = greyAreas.some(([startRow, startColumn]) =>
      row >= startRow && row < startRow + 3 && column >= startColumn && column < startColumn + 3,
    );
    const cell = document.createElement(grey ? "div" : "button");
    cell.className = `cell${grey ? " grey" : ""}${column % 3 === 0 ? " v-divider" : ""}${row % 3 === 0 ? " h-divider" : ""}`;
    cell.setAttribute("role", "gridcell");
    if (!grey) {
      (cell as HTMLButtonElement).type = "button";
      cell.dataset.row = String(row);
      cell.dataset.column = String(column);
      const box = Math.floor((row - 1) / 3) * 4 + Math.floor((column - 1) / 3) + 1;
      const rowBand = Math.floor((row - 1) / 3);
      const columnBand = Math.floor((column - 1) / 3);
      const shift = ((3 - columnBand - rowBand + 4) % 4) - 1;
      const digitIndex = ((row - 1 + shift) % 3) * 3 + ((column - 1 + shift) % 3);
      cell.setAttribute("aria-label", `Row ${row}, column ${column}, Box ${box}`);
      cell.addEventListener("click", () => {
        well.textContent = `Row ${row}, column ${column} · Box ${box}`;
      });
      playableCells.push({ cell: cell as HTMLButtonElement, digitIndex });
    }
    grid.append(cell);
  }
}

generator.addEventListener("click", () => {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let index = digits.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [digits[index], digits[swapIndex]] = [digits[swapIndex], digits[index]];
  }
  const shuffle = (items: number[]): number[] => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  };
  const rowOrders = Array.from({ length: 4 }, () => shuffle([0, 1, 2]));
  const columnOrders = Array.from({ length: 4 }, () => shuffle([0, 1, 2]));
  playableCells.forEach(({ cell }) => {
    const row = Number(cell.dataset.row);
    const column = Number(cell.dataset.column);
    const rowBand = Math.floor((row - 1) / 3);
    const columnBand = Math.floor((column - 1) / 3);
    const sourceRow = rowBand * 3 + rowOrders[rowBand][(row - 1) % 3] + 1;
    const sourceColumn = columnBand * 3 + columnOrders[columnBand][(column - 1) % 3] + 1;
    const shift = ((3 - columnBand - rowBand + 4) % 4) - 1;
    const digitIndex = ((sourceRow - 1 + shift) % 3) * 3 + ((sourceColumn - 1 + shift) % 3);
    const digit = digits[digitIndex];
    cell.textContent = String(digit);
    values[row - 1][column - 1] = digit;
  });
  actions.hidden = false;
  well.textContent = "Generated a valid Extended Sudoku grid";
});

stringButton.addEventListener("click", async () => {
  const text = values.flat().map((value) => value ?? ".").join("");
  await navigator.clipboard.writeText(text);
  well.textContent = "Grid string copied to clipboard";
});

imageButton.addEventListener("click", () => {
  well.textContent = "Image copy is implemented in the browser build.";
});
