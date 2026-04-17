import { normalizeAdvancedTableValue } from './advancedTable.js';

function getCoverValue(cover, key) {
  const aliases = {
    companyName: ['companyName', 'company'],
    docCode: ['docCode', 'documentCode'],
    date: ['date'],
    version: ['version'],
    title: ['title'],
    subtitle: ['subtitle'],
    slogan: ['slogan'],
    primaryColor: ['primaryColor'],
    logo: ['logo'],
    coverPhoto: ['coverPhoto'],
    locationLabel: ['locationLabel'],
    projectName: ['projectName']
  };
  const keys = aliases[key] || [key];
  for (const candidate of keys) {
    const value = cover?.[candidate];
    if (value != null && value !== '') return value;
  }
  return '';
}

function resolveBlockValue(node, formData, cover) {
  const direct = formData?.[node.id];
  if (direct != null && direct !== '') return direct;
  if (node.variableKey) {
    const variableValue = formData?.[node.variableKey];
    if (variableValue != null && variableValue !== '') return variableValue;
  }
  if (node.bindingKey) {
    const bound = formData?.[node.bindingKey];
    if (bound != null && bound !== '') return bound;
  }
  if (node.coverField) {
    const coverValue = getCoverValue(cover, node.coverField);
    if (coverValue != null && coverValue !== '') return coverValue;
  }
  return direct;
}

function normalizeObjectValue(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function isPlaceholderHeader(value) {
  return /^col(?:umna)?\s*\d+$/i.test(String(value || '').trim());
}

function isBlankTableCell(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const cellValue = value.value ?? value.formula ?? '';
    return String(cellValue).trim() === '';
  }
  return String(value).trim() === '';
}

function getEffectiveTableRowWidth(row) {
  if (!Array.isArray(row) || !row.length) return 0;
  let lastUsedIndex = -1;
  row.forEach((cell, index) => {
    if (!isBlankTableCell(cell)) {
      lastUsedIndex = index;
    }
  });
  return lastUsedIndex + 1;
}

function trimTrailingEmptyTableRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  let lastNonEmptyIndex = -1;
  rows.forEach((row, index) => {
    if (getEffectiveTableRowWidth(Array.isArray(row) ? row : []) > 0) {
      lastNonEmptyIndex = index;
    }
  });
  return lastNonEmptyIndex >= 0 ? rows.slice(0, lastNonEmptyIndex + 1) : [];
}

function getMeaningfulHeaderCount(node) {
  if (!Array.isArray(node?.columnHeaders)) return 0;
  const meaningfulHeaders = node.columnHeaders.filter((header) => {
    const value = String(header || '').trim();
    return value && !isPlaceholderHeader(value);
  });
  return meaningfulHeaders.length;
}

function getTableColumnCount(node, value) {
  const rowWidths = Array.isArray(value?.rows)
    ? value.rows.map((row) => getEffectiveTableRowWidth(Array.isArray(row) ? row : []))
    : [];
  const widestRow = rowWidths.length ? Math.max(...rowWidths) : 0;
  return Math.max(1, getMeaningfulHeaderCount(node), widestRow);
}

function getEffectiveTableHeaders(node, value, count) {
  const headers = Array.isArray(node?.columnHeaders) ? node.columnHeaders.slice(0, count) : [];
  if (!headers.length) return [];
  const meaningful = headers.filter((header) => String(header || '').trim());
  if (!meaningful.length) return [];
  if (meaningful.every((header) => isPlaceholderHeader(header))) return [];
  while (headers.length < count) headers.push('');
  return headers;
}

function cloneTableCell(cell) {
  if (cell && typeof cell === 'object' && !Array.isArray(cell)) {
    return {
      value: cell.value ?? cell.formula ?? '',
      formula: cell.formula ?? '',
      bg: cell.bg,
      fc: cell.fc,
      bl: cell.bl,
      it: cell.it,
      un: cell.un,
      ht: cell.ht,
      vt: cell.vt,
      rowSpan: 1,
      colSpan: 1,
      hidden: false,
      anchorRow: null,
      anchorCol: null
    };
  }
  return {
    value: cell ?? '',
    formula: '',
    rowSpan: 1,
    colSpan: 1,
    hidden: false,
    anchorRow: null,
    anchorCol: null
  };
}

function isStructuredTableCell(cell) {
  return Boolean(
    cell &&
    typeof cell === 'object' &&
    !Array.isArray(cell) &&
    ('hidden' in cell || 'colSpan' in cell || 'rowSpan' in cell)
  );
}

function hasStructuredTableRows(rows) {
  return Array.isArray(rows)
    && rows.every((row) => Array.isArray(row) && row.every((cell) => isStructuredTableCell(cell)));
}

function isMeaningfulStructuredCell(cell) {
  if (!cell || cell.hidden) return false;
  if (String(cell.value || '').trim()) return true;
  if ((Number(cell.colSpan) || 1) > 1 || (Number(cell.rowSpan) || 1) > 1) return true;
  return Boolean(cell.bg || cell.fc || cell.bl || cell.it || cell.un);
}

function getStructuredRowUsage(row) {
  if (!Array.isArray(row)) return { meaningfulCellCount: 0, maxUsedIndex: -1 };
  let meaningfulCellCount = 0;
  let maxUsedIndex = -1;

  row.forEach((cell, index) => {
    if (!isMeaningfulStructuredCell(cell)) return;
    meaningfulCellCount += 1;
    maxUsedIndex = Math.max(maxUsedIndex, index + Math.max(0, (Number(cell.colSpan) || 1) - 1));
  });

  return { meaningfulCellCount, maxUsedIndex };
}

function getEffectiveStructuredColumnCount(rows) {
  if (!Array.isArray(rows) || !rows.length) return 1;
  const rowUsage = rows.map(getStructuredRowUsage);
  const contentRows = rowUsage.filter((entry) => entry.meaningfulCellCount > 1);
  const source = contentRows.length ? contentRows : rowUsage;
  const maxUsedIndex = source.reduce((max, entry) => Math.max(max, entry.maxUsedIndex), -1);
  return Math.max(1, maxUsedIndex + 1);
}

function trimStructuredRowsToColumnCount(rows, count) {
  return rows.map((row) => row.slice(0, count));
}

function trimTrailingEmptyStructuredRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  let lastNonEmptyIndex = -1;

  rows.forEach((row, index) => {
    if (!Array.isArray(row)) return;
    if (row.some((cell) => isMeaningfulStructuredCell(cell))) {
      lastNonEmptyIndex = index;
    }
  });

  return lastNonEmptyIndex >= 0 ? rows.slice(0, lastNonEmptyIndex + 1) : [];
}

function normalizeTableRows(node, value, count) {
  const rows = trimTrailingEmptyTableRows(Array.isArray(value?.rows) ? value.rows : []);
  return rows.map((row) => {
    const effectiveWidth = Array.isArray(row) ? getEffectiveTableRowWidth(row) : 0;
    const cells = Array.isArray(row) ? row.slice(0, Math.min(count, effectiveWidth || count)) : [];
    while (cells.length < count) cells.push('');
    return cells;
  });
}

function normalizeTableMergeCells(rows, mergeCells) {
  const rowCount = rows.length;
  const columnCount = rows[0]?.length || 1;
  const normalized = rows.map((row) => row.map((cell) => cloneTableCell(cell)));

  Object.entries(mergeCells || {}).forEach(([cellName, span]) => {
    const match = String(cellName || '').match(/^([A-Z]+)(\d+)$/i);
    if (!match) return;

    const [, letters, rowRaw] = match;
    const rowIndex = Number(rowRaw) - 1;
    let colIndex = 0;
    for (const char of letters.toUpperCase()) {
      colIndex = colIndex * 26 + (char.charCodeAt(0) - 64);
    }
    colIndex -= 1;

    const anchor = normalized[rowIndex]?.[colIndex];
    if (!anchor) return;

    const [colSpanRaw, rowSpanRaw] = Array.isArray(span) ? span : [1, 1];
    const colSpan = Math.max(1, Math.min(Number(colSpanRaw) || 1, columnCount - colIndex));
    const rowSpan = Math.max(1, Math.min(Number(rowSpanRaw) || 1, rowCount - rowIndex));
    anchor.colSpan = colSpan;
    anchor.rowSpan = rowSpan;

    for (let r = rowIndex; r < rowIndex + rowSpan; r += 1) {
      for (let c = colIndex; c < colIndex + colSpan; c += 1) {
        if (r === rowIndex && c === colIndex) continue;
        if (!normalized[r]?.[c]) continue;
        normalized[r][c] = {
          ...normalized[r][c],
          hidden: true,
          anchorRow: rowIndex,
          anchorCol: colIndex
        };
      }
    }
  });

  return normalized;
}

function applyImplicitFullRowMerges(rows) {
  const columnCount = rows[0]?.length || 0;
  if (columnCount <= 1) return rows;

  rows.forEach((row, rowIndex) => {
    const filledIndexes = row.reduce((acc, cell, colIndex) => {
      if (!cell?.hidden && String(cell?.value ?? '').trim()) {
        acc.push(colIndex);
      }
      return acc;
    }, []);

    if (filledIndexes.length !== 1 || filledIndexes[0] !== 0) return;

    row[0].colSpan = columnCount;
    row[0].rowSpan = 1;

    for (let colIndex = 1; colIndex < columnCount; colIndex += 1) {
      row[colIndex] = {
        ...row[colIndex],
        hidden: true,
        anchorRow: rowIndex,
        anchorCol: 0
      };
    }
  });

  return rows;
}

function reindexNormalizedRows(rows) {
  const nextRows = rows.map((row) =>
    row.map((cell) => ({
      ...cell,
      hidden: false,
      anchorRow: null,
      anchorCol: null
    }))
  );

  const rowCount = nextRows.length;
  const columnCount = nextRows[0]?.length || 1;

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    for (let colIndex = 0; colIndex < columnCount; colIndex += 1) {
      const cell = nextRows[rowIndex][colIndex];
      if (cell.hidden) continue;
      const rowSpan = Math.max(1, Math.min(Number(cell.rowSpan) || 1, rowCount - rowIndex));
      const colSpan = Math.max(1, Math.min(Number(cell.colSpan) || 1, columnCount - colIndex));
      cell.rowSpan = rowSpan;
      cell.colSpan = colSpan;

      for (let r = rowIndex; r < rowIndex + rowSpan; r += 1) {
        for (let c = colIndex; c < colIndex + colSpan; c += 1) {
          if (r === rowIndex && c === colIndex) continue;
          nextRows[r][c] = {
            ...nextRows[r][c],
            hidden: true,
            anchorRow: rowIndex,
            anchorCol: colIndex
          };
        }
      }
    }
  }

  return nextRows;
}

function isNumericLike(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  return /^-?\d+(?:[.,]\d+)?$/.test(raw);
}

function inferTableColumnAlign(node, rows, count) {
  const configured = Array.isArray(node?.columnAlign) ? node.columnAlign.slice(0, count) : [];
  while (configured.length < count) configured.push('l');

  return configured.map((align, colIndex) => {
    const normalizedAlign = String(align || 'l').toLowerCase();
    if (!['l', 'c', 'r'].includes(normalizedAlign)) return 'l';

    const visibleCells = rows
      .map((row) => row[colIndex])
      .filter((cell) => cell && !cell.hidden)
      .map((cell) => String(cell.value || '').trim())
      .filter(Boolean);

    if (!visibleCells.length) return normalizedAlign;

    const numericCells = visibleCells.filter(isNumericLike);
    const numericRatio = numericCells.length / visibleCells.length;
    if (numericCells.length >= 2 && numericRatio >= 0.5) {
      return 'r';
    }

    return normalizedAlign;
  });
}

function classifyColumnWeight(rows, colIndex) {
  const visibleCells = rows
    .map((row) => row[colIndex])
    .filter((cell) => cell && !cell.hidden)
    .map((cell) => String(cell.value || '').trim())
    .filter(Boolean);

  if (!visibleCells.length) return 1;

  const numericCells = visibleCells.filter(isNumericLike).length;
  const averageLength = visibleCells.reduce((sum, value) => sum + value.length, 0) / visibleCells.length;

  if (numericCells >= Math.max(2, Math.ceil(visibleCells.length * 0.5))) return 1.05;
  if (averageLength <= 4) return 0.82;
  if (averageLength >= 16) return 1.45;
  if (averageLength >= 10) return 1.2;
  return 1;
}

function buildColumnWeightsFromSheetConfig(sheetConfig, count) {
  const columnlen = sheetConfig?.columnlen;
  if (!columnlen || typeof columnlen !== 'object') return null;

  const rawWidths = Array.from({ length: count }, (_, index) => Number(columnlen[index]) || 0);
  const usableWidths = rawWidths.filter((value) => value > 0);
  if (!usableWidths.length) return null;

  const averageWidth = usableWidths.reduce((sum, value) => sum + value, 0) / usableWidths.length;
  if (!Number.isFinite(averageWidth) || averageWidth <= 0) return null;

  return rawWidths.map((value) => {
    if (!value || value <= 0) return 1;
    return Math.max(0.35, Number((value / averageWidth).toFixed(3)));
  });
}

function buildColumnWeights(rows, count, sheetConfig) {
  const configuredWidths = buildColumnWeightsFromSheetConfig(sheetConfig, count);
  if (configuredWidths) return configuredWidths;
  return Array.from({ length: count }, (_, colIndex) => classifyColumnWeight(rows, colIndex));
}

function isFullRowMergedTitleRow(row, count) {
  const firstCell = row?.[0];
  return Boolean(firstCell && !firstCell.hidden && firstCell.colSpan === count && String(firstCell.value || '').trim());
}

function inferHeadersFromRows(rows, count, explicitHeaders) {
  if (explicitHeaders.length) {
    return { headers: explicitHeaders, rows, leadingTitleRow: null };
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return { headers: [], rows, leadingTitleRow: null };
  }

  const leadingTitleRow = isFullRowMergedTitleRow(rows[0], count) ? rows[0] : null;
  const candidateIndex = leadingTitleRow ? 1 : 0;
  const candidateRow = rows[candidateIndex];
  if (!candidateRow) {
    return { headers: [], rows, leadingTitleRow };
  }

  const visibleCells = candidateRow.filter((cell) => cell && !cell.hidden);
  const values = visibleCells.map((cell) => String(cell.value || '').trim());
  const filledValues = values.filter(Boolean);
  if (filledValues.length < Math.max(2, count - 1)) {
    return { headers: [], rows, leadingTitleRow };
  }

  const numericHeaders = filledValues.filter(isNumericLike).length;
  if (numericHeaders > 0) {
    return { headers: [], rows, leadingTitleRow };
  }

  const nextRow = rows[candidateIndex + 1] || [];
  const nextVisibleValues = nextRow
    .filter((cell) => cell && !cell.hidden)
    .map((cell) => String(cell.value || '').trim())
    .filter(Boolean);
  const nextNumericCount = nextVisibleValues.filter(isNumericLike).length;
  if (nextVisibleValues.length && nextNumericCount === 0 && candidateIndex === 0) {
    return { headers: [], rows, leadingTitleRow };
  }

  const nextRows = reindexNormalizedRows(
    rows.filter((_, index) => index !== candidateIndex && (!leadingTitleRow || index !== 0))
  );
  return {
    headers: values,
    rows: nextRows,
    leadingTitleRow
  };
}

export function buildTableExportValue(node, rawValue) {
  const value = normalizeObjectValue(rawValue);
  if (hasStructuredTableRows(value.rows)) {
    const normalized = normalizeAdvancedTableValue(node, value);
    const trimmedStructuredRows = trimTrailingEmptyStructuredRows(normalized.rows);
    const count = getEffectiveStructuredColumnCount(trimmedStructuredRows);
    const trimmedRows = trimStructuredRowsToColumnCount(trimmedStructuredRows, count);
    const explicitHeaders = getEffectiveTableHeaders(node, value, count);
    const columnAlign = inferTableColumnAlign(node, trimmedRows, count);
    const columnWeights = buildColumnWeights(trimmedRows, count, value.sheetConfig);

    return {
      ...value,
      ...normalized,
      rows: trimmedRows,
      count,
      headers: explicitHeaders,
      leadingTitleRow: null,
      caption: value?.caption || '',
      source: value?.source || node?.tableSource || '',
      description: value?.description || node?.description || '',
      label: value?.label || '',
      tableStyle: value?.tableStyle || node?.tableStyle || 'booktabs',
      orientation: value?.orientation || node?.orientation || 'portrait',
      columnAlign,
      columnWeights,
      useLandscape: typeof value.useLandscape === 'boolean' ? value.useLandscape : undefined
    };
  }

  const count = getTableColumnCount(node, value);
  const baseRows = normalizeTableRows(node, value, count);
  const normalizedRows = applyImplicitFullRowMerges(
    normalizeTableMergeCells(baseRows, value.mergeCells && typeof value.mergeCells === 'object' ? value.mergeCells : {})
  );
  const explicitHeaders = getEffectiveTableHeaders(node, value, count);
  const { headers, rows, leadingTitleRow } = inferHeadersFromRows(normalizedRows, count, explicitHeaders);
  const columnAlign = inferTableColumnAlign(node, rows, count);
  const columnWeights = buildColumnWeights(rows, count, value.sheetConfig);

  return {
    ...value,
    count,
    headers,
    rows,
    leadingTitleRow,
    caption: value?.caption || '',
    source: value?.source || node?.tableSource || '',
    description: value?.description || node?.description || '',
    label: value?.label || '',
    tableStyle: value?.tableStyle || node?.tableStyle || 'booktabs',
    orientation: value?.orientation || node?.orientation || 'portrait',
    columnAlign,
    columnWeights,
    useLandscape: typeof value.useLandscape === 'boolean' ? value.useLandscape : undefined
  };
}

function normalizeBlockForExport(node, formData, cover, helpers) {
  const rawValue = resolveBlockValue(node, formData, cover);
  const fallback = `[PENDIENTE: ${node.label || node.id}]`;

  if (node.type === 'table') {
    return {
      ...node,
      exportKind: 'table',
      exportFallback: fallback,
      exportValue: buildTableExportValue(node, rawValue)
    };
  }

  if (node.type === 'advanced_table') {
    return {
      ...node,
      exportKind: 'table',
      exportFallback: fallback,
      exportValue: buildTableExportValue(node, rawValue)
    };
  }

  if (node.type === 'image') {
    return {
      ...node,
      exportKind: 'image',
      exportFallback: fallback,
      exportValue: normalizeObjectValue(rawValue)
    };
  }

  if (node.type === 'latex_graph') {
    const expr = typeof rawValue === 'string' && rawValue.trim() ? rawValue : node.content;
    return {
      ...node,
      exportKind: 'latex_graph',
      exportFallback: fallback,
      exportExpression: expr || ''
    };
  }

  if (node.type === 'variable') {
    const formatted =
      node.inputType === 'date'
        ? helpers.formatDateValue(rawValue || '')
        : rawValue == null || rawValue === ''
          ? fallback
          : `${rawValue}${node.inputUnit ? ` ${node.inputUnit}` : ''}`;

    return {
      ...node,
      exportKind: 'inline',
      exportFallback: fallback,
      exportValue: formatted
    };
  }

  if (
    node.type === 'template_text' ||
    node.type === 'rich_text' ||
    node.type === 'text' ||
    node.type === 'ai_text'
  ) {
    let textValue = typeof rawValue === 'string' && rawValue !== '' ? rawValue : (node.template || node.content || '');
    // Convert Tiptap variable html node back to {{var_id}}
    textValue = textValue.replace(/<span[^>]*data-type="variable"[^>]*id="([^"]+)"[^>]*>.*?<\/span>/gi, '{{$1}}');
    
    return {
      ...node,
      exportKind: node.type === 'ai_text' ? 'inline' : 'text',
      exportFallback: fallback,
      exportValue: helpers.interpolate(textValue, formData) || fallback
    };
  }

  return {
    ...node,
    exportKind: 'inline',
    exportFallback: fallback,
    exportValue: rawValue || node.content || fallback
  };
}

export function buildExportTree(nodes, formData, cover, helpers) {
  return (nodes || []).map((node) => {
    if (node?.isStructure) {
      return {
        ...node,
        children: buildExportTree(node.children || [], formData, cover, helpers)
      };
    }
    return normalizeBlockForExport(node, formData, cover, helpers);
  });
}
