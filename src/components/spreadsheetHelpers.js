/** Convert (col, row) to cell name like "A1", "B3", "AA5" */
export function coordsToCell(col, row) {
  let name = '';
  let c = col;
  while (c >= 0) {
    name = String.fromCharCode(65 + (c % 26)) + name;
    c = Math.floor(c / 26) - 1;
  }
  return name + (row + 1);
}

/** Convert cell name like "A1" to [col, row] */
export function cellToCoords(cellName) {
  const match = cellName.match(/^([A-Z]+)(\d+)$/);
  if (!match) return [0, 0];
  let col = 0;
  for (let i = 0; i < match[1].length; i++) {
    col = col * 26 + (match[1].charCodeAt(i) - 64);
  }
  return [col - 1, parseInt(match[2], 10) - 1];
}
