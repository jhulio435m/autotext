function createCell(partial = {}) {
  return {
    value: '',
    rowSpan: 1,
    colSpan: 1,
    align: 'left',
    hidden: false,
    anchorRow: null,
    anchorCol: null,
    ...partial
  };
}

export function getAdvancedTableColumnCount(block, value) {
  const blockCount = Number(block?.columnCount) || 0;
  const rowCount = Array.isArray(value?.rows)
    ? value.rows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0)
    : 0;
  return Math.max(1, blockCount, rowCount);
}

export function createAdvancedTableValue(block) {
  const count = getAdvancedTableColumnCount(block, {});
  return {
    orientation: 'portrait',
    repeatHeader: true,
    headerRows: 1,
    rows: [Array.from({ length: count }, () => createCell())]
  };
}

export function normalizeAdvancedTableValue(block, value) {
  const columnCount = getAdvancedTableColumnCount(block, value);
  const rawRows = Array.isArray(value?.rows) && value.rows.length ? value.rows : [Array.from({ length: columnCount }, () => createCell())];

  const rows = rawRows.map((row) => {
    const next = Array.isArray(row) ? row.slice(0, columnCount) : [];
    while (next.length < columnCount) next.push(createCell());
    return next.map((cell) => {
      if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
        return createCell({
          ...cell,
          value: cell.value == null ? '' : String(cell.value),
          rowSpan: Math.max(1, Number(cell.rowSpan) || 1),
          colSpan: Math.max(1, Number(cell.colSpan) || 1)
        });
      }
      return createCell({ value: cell == null ? '' : String(cell) });
    });
  });

  rows.forEach((row) =>
    row.forEach((cell) => {
      cell.hidden = false;
      cell.anchorRow = null;
      cell.anchorCol = null;
    })
  );

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    for (let colIndex = 0; colIndex < columnCount; colIndex += 1) {
      const cell = rows[rowIndex][colIndex];
      if (cell.hidden) continue;
      const maxRowSpan = Math.max(1, Math.min(cell.rowSpan, rows.length - rowIndex));
      const maxColSpan = Math.max(1, Math.min(cell.colSpan, columnCount - colIndex));
      cell.rowSpan = maxRowSpan;
      cell.colSpan = maxColSpan;

      for (let r = rowIndex; r < rowIndex + cell.rowSpan; r += 1) {
        for (let c = colIndex; c < colIndex + cell.colSpan; c += 1) {
          if (r === rowIndex && c === colIndex) continue;
          rows[r][c] = createCell({
            hidden: true,
            anchorRow: rowIndex,
            anchorCol: colIndex
          });
        }
      }
    }
  }

  return {
    orientation: value?.orientation === 'landscape' ? 'landscape' : 'portrait',
    repeatHeader: value?.repeatHeader !== false,
    headerRows: Math.max(1, Math.min(Number(value?.headerRows) || 1, rows.length)),
    caption: value?.caption || '',
    source: value?.source || '',
    description: value?.description || '',
    rows
  };
}

export function getVisibleAdvancedRows(block, value) {
  const normalized = normalizeAdvancedTableValue(block, value);
  return normalized.rows.map((row) => row.filter((cell) => !cell.hidden));
}

export function isAdvancedTableEmpty(block, value) {
  return getVisibleAdvancedRows(block, value).every((row) =>
    row.every((cell) => !String(cell.value || '').trim())
  );
}

export function updateAdvancedTableCell(block, value, rowIndex, colIndex, patch) {
  const normalized = normalizeAdvancedTableValue(block, value);
  const nextRows = normalized.rows.map((row) => row.map((cell) => ({ ...cell })));
  const cell = nextRows[rowIndex]?.[colIndex];
  if (!cell || cell.hidden) return normalized;
  nextRows[rowIndex][colIndex] = createCell({ ...cell, ...patch });
  return normalizeAdvancedTableValue(block, { ...normalized, rows: nextRows });
}

export function addAdvancedTableRow(block, value) {
  const normalized = normalizeAdvancedTableValue(block, value);
  const columnCount = getAdvancedTableColumnCount(block, normalized);
  const nextRows = [...normalized.rows, Array.from({ length: columnCount }, () => createCell())];
  return normalizeAdvancedTableValue(block, { ...normalized, rows: nextRows });
}

export function addAdvancedTableColumn(block, value) {
  const normalized = normalizeAdvancedTableValue(block, value);
  const nextRows = normalized.rows.map((row) => [...row, createCell()]);
  return normalizeAdvancedTableValue(
    { ...block, columnCount: (normalized.rows[0]?.length || 0) + 1 },
    { ...normalized, rows: nextRows }
  );
}

export function removeAdvancedTableRow(block, value, rowIndex) {
  const normalized = normalizeAdvancedTableValue(block, value);
  if (normalized.rows.length <= 1) return normalized;
  const nextRows = normalized.rows.filter((_, index) => index !== rowIndex);
  return normalizeAdvancedTableValue(block, { ...normalized, rows: nextRows });
}

export function removeAdvancedTableColumn(block, value, colIndex) {
  const normalized = normalizeAdvancedTableValue(block, value);
  const columnCount = normalized.rows[0]?.length || 1;
  if (columnCount <= 1) return normalized;
  const safeIndex = Math.max(0, Math.min(colIndex, columnCount - 1));
  const nextRows = normalized.rows.map((row) => row.filter((_, index) => index !== safeIndex));
  return normalizeAdvancedTableValue(
    { ...block, columnCount: columnCount - 1 },
    { ...normalized, rows: nextRows }
  );
}

export function mergeAdvancedTableRight(block, value, rowIndex, colIndex) {
  const normalized = normalizeAdvancedTableValue(block, value);
  const cell = normalized.rows[rowIndex]?.[colIndex];
  if (!cell || cell.hidden) return normalized;
  const targetCol = colIndex + cell.colSpan;
  const target = normalized.rows[rowIndex]?.[targetCol];
  if (!target || target.hidden) return normalized;

  const nextRows = normalized.rows.map((row) => row.map((item) => ({ ...item })));
  nextRows[rowIndex][colIndex] = createCell({
    ...cell,
    colSpan: cell.colSpan + target.colSpan
  });
  return normalizeAdvancedTableValue(block, { ...normalized, rows: nextRows });
}

export function mergeAdvancedTableDown(block, value, rowIndex, colIndex) {
  const normalized = normalizeAdvancedTableValue(block, value);
  const cell = normalized.rows[rowIndex]?.[colIndex];
  if (!cell || cell.hidden) return normalized;
  const targetRow = rowIndex + cell.rowSpan;
  const target = normalized.rows[targetRow]?.[colIndex];
  if (!target || target.hidden || target.colSpan !== cell.colSpan) return normalized;

  const nextRows = normalized.rows.map((row) => row.map((item) => ({ ...item })));
  nextRows[rowIndex][colIndex] = createCell({
    ...cell,
    rowSpan: cell.rowSpan + target.rowSpan
  });
  return normalizeAdvancedTableValue(block, { ...normalized, rows: nextRows });
}

export function splitAdvancedTableCell(block, value, rowIndex, colIndex) {
  const normalized = normalizeAdvancedTableValue(block, value);
  const cell = normalized.rows[rowIndex]?.[colIndex];
  if (!cell || cell.hidden || (cell.rowSpan === 1 && cell.colSpan === 1)) return normalized;

  const nextRows = normalized.rows.map((row) => row.map((item) => ({ ...item })));
  nextRows[rowIndex][colIndex] = createCell({
    ...cell,
    rowSpan: 1,
    colSpan: 1
  });
  return normalizeAdvancedTableValue(block, { ...normalized, rows: nextRows });
}
