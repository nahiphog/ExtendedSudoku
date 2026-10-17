const board = document.querySelector("#sudoku-board");
const blockedBoxes = new Set([4, 7, 10, 13]);
for (let boxNumber = 1; boxNumber <= 16; boxNumber += 1) {
  const box = document.createElement("div");
  box.className = "box";
  if (blockedBoxes.has(boxNumber)) {
    box.classList.add("blocked");
  } else {
    for (let cellNumber = 1; cellNumber <= 9; cellNumber += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      box.append(cell);
    }
  }
  board.append(box);
}
