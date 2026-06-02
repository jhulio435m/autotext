import { isAdvancedTableEmpty, normalizeAdvancedTableValue } from '../advancedTable.js';
import { escapeLatex, hexToLatexRgb, sanitizeLatexLabel } from './shared.js';
import { htmlToLatex, htmlToPlainText } from './text.js';

const TABLE_WIDTH_RATIO = 0.92;
const DEFAULT_ARRAY_STRETCH = 1.18;
const NORMAL_TABCOLSEP = '6pt';
const COMPACT_TABCOLSEP = '4pt';
const DENSE_TABCOLSEP = '3pt';
const TINY_TABCOLSEP = '2pt';
const LANDSCAPE_TEXT_THRESHOLD = 22;
const WIDE_TABLE_COLUMN_THRESHOLD = 8;
const LONG_TABLE_ROW_THRESHOLD = 30;
const PENDING_CELL_TEXT = '[PENDIENTE]';
const IS_DEV = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
const MIN_READABLE_TABLE_SCALE = 0.72;
const BASE_TABLE_CAPACITY = 92;

const SIMPLE_TABLE_LAYOUTS = [
  { fontSize: '', tabcolsep: NORMAL_TABCOLSEP, arrayStretch: DEFAULT_ARRAY_STRETCH, useResize: false, charGain: 1 },
  { fontSize: '\\small', tabcolsep: '5pt', arrayStretch: 1.12, useResize: false, charGain: 1.08 },
  { fontSize: '\\footnotesize', tabcolsep: COMPACT_TABCOLSEP, arrayStretch: 1.08, useResize: false, charGain: 1.18 },
  { fontSize: '\\scriptsize', tabcolsep: DENSE_TABCOLSEP, arrayStretch: 1.04, useResize: false, charGain: 1.3 },
  { fontSize: '\\tiny', tabcolsep: TINY_TABCOLSEP, arrayStretch: 1, useResize: true, charGain: 1.42 }
];

function warnLatexTable(message, details) {
  if (!IS_DEV) return;
  console.warn(`[latex/tables] ${message}`, details);
}

function isBlankCell(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const cellValue = value.value ?? value.formula ?? '';
    return String(cellValue).trim() === '';
  }
  return String(value).trim() === '';
}

function getSimpleTableCellLatex(cell) {
  if (cell == null) return '';
  if (typeof cell === 'object' && !Array.isArray(cell)) {
    const raw = cell.value ?? cell.formula ?? '';
    return htmlToLatex(raw);
  }
  return htmlToLatex(cell);
}

function getSimpleTableCellText(cell) {
  if (cell == null) return '';
  if (typeof cell === 'object' && !Array.isArray(cell)) {
    const raw = cell.value ?? cell.formula ?? '';
    return htmlToPlainText(raw);
  }
  return htmlToPlainText(cell);
}

function renderSimpleTableCell(cell) {
  const text = getSimpleTableCellLatex(cell);
  if (!cell || typeof cell !== 'object' || Array.isArray(cell)) return text;

  let rendered = text;
  
  // Aplicar formato base
  if (cell.un) rendered = `\\underline{${rendered}}`;
  if (cell.it) rendered = `\\textit{${rendered}}`;
  if (cell.bl) rendered = `\\textbf{${rendered}}`;

  // Aplicar color de fuente
  const fontColor = hexToLatexRgb(cell.fc);
  if (fontColor) {
    rendered = `{\\color[rgb]{${fontColor}}${rendered}}`;
  }

  return rendered;
}

function resolveCellVerticalAlign(cell) {
  const raw = Number(cell?.vt);
  if (raw === 1) return 't';
  if (raw === 2) return 'b';
  return 'c';
}

function wrapCellWithVerticalAlign(cell, content, forceWidth = false) {
  const verticalAlign = resolveCellVerticalAlign(cell);
  if (!forceWidth && verticalAlign === 'c') return content;
  const width = forceWidth ? '\\linewidth' : '0.98\\linewidth';
  return `\\parbox[${verticalAlign}]{${width}}{${content}}`;
}

function isNormalizedSimpleCell(cell) {
  return Boolean(
    cell &&
    typeof cell === 'object' &&
    !Array.isArray(cell) &&
    ('hidden' in cell || 'colSpan' in cell || 'rowSpan' in cell)
  );
}

function hasNormalizedSimpleRows(rows) {
  return Array.isArray(rows)
    && rows.every((row) => Array.isArray(row) && row.every((cell) => isNormalizedSimpleCell(cell)));
}

export function getTableColumnCount(node, value) {
  const configuredCount = Number(node?.columnCount) || 0;
  const rowWidths = Array.isArray(value?.rows)
    ? value.rows.map((row) => getEffectiveSimpleRowWidth(Array.isArray(row) ? row : []))
    : [];
  const widestRow = rowWidths.length ? Math.max(...rowWidths) : 0;
  return Math.max(1, configuredCount, node?.columnHeaders?.length || 0, widestRow);
}

function isPlaceholderHeader(value) {
  return /^col(?:umna)?\s*\d+$/i.test(String(value || '').trim());
}

function getEffectiveTableHeaders(node, value, columnCount) {
  const headers = Array.isArray(node?.columnHeaders) ? node.columnHeaders.slice(0, columnCount) : [];
  if (!headers.length) return [];
  const meaningfulHeaders = headers.filter((header) => String(header || '').trim());
  if (!meaningfulHeaders.length) return [];
  if (meaningfulHeaders.every((header) => isPlaceholderHeader(header))) {
    return [];
  }
  while (headers.length < columnCount) headers.push('');
  return headers;
}

function buildParagraphColumnSpec(width, align = 'l', backgroundColor = '') {
  const colorPrefix = backgroundColor ? `>{\\columncolor[rgb]{${backgroundColor}}` : '>{';
  const normalizedAlign = String(align || 'l').toLowerCase();

  if (normalizedAlign === 'c') {
    return `${colorPrefix}\\centering\\arraybackslash}p{${width}\\textwidth}`;
  }
  if (normalizedAlign === 'r') {
    return `${colorPrefix}\\raggedleft\\arraybackslash}p{${width}\\textwidth}`;
  }
  return `${colorPrefix}\\raggedright\\arraybackslash}p{${width}\\textwidth}`;
}

function getColumnSpecs(node, columnCount) {
  const weights = Array.isArray(node?.columnWeights) ? node.columnWeights.slice(0, columnCount) : [];
  while (weights.length < columnCount) weights.push(1);
  const totalWeight = weights.reduce((sum, value) => sum + (Number(value) || 1), 0) || columnCount;

  const alignments = Array.isArray(node?.columnAlign) ? node.columnAlign.slice(0, columnCount) : [];
  while (alignments.length < columnCount) alignments.push('l');

  return alignments.map((item, index) => {
    const width = ((TABLE_WIDTH_RATIO * (Number(weights[index]) || 1)) / totalWeight).toFixed(3);
    return buildParagraphColumnSpec(width, item);
  });
}

function getColumnWidthShares(node, columnCount) {
  const weights = Array.isArray(node?.columnWeights) ? node.columnWeights.slice(0, columnCount) : [];
  while (weights.length < columnCount) weights.push(1);
  const totalWeight = weights.reduce((sum, value) => sum + (Number(value) || 1), 0) || columnCount;
  return weights.map((value) => (Number(value) || 1) / totalWeight);
}

function getMergedColumnWidthShare(node, startIndex, span, columnCount) {
  const shares = getColumnWidthShares(node, columnCount);
  return shares
    .slice(startIndex, Math.min(columnCount, startIndex + span))
    .reduce((sum, value) => sum + value, 0);
}

function getMergedColumnSpec(node, startIndex, span, columnCount, align, backgroundColor = '') {
  const width = (TABLE_WIDTH_RATIO * getMergedColumnWidthShare(node, startIndex, span, columnCount)).toFixed(3);
  return buildParagraphColumnSpec(width, align, backgroundColor);
}

function columnSpecFromAlign(node, columnCount) {
  return getColumnSpecs(node, columnCount).join(' ');
}

function gridColumnSpecFromAlign(node, columnCount) {
  return `|${getColumnSpecs(node, columnCount).join('|')}|`;
}

export function normalizeTableRows(node, value) {
  const columnCount = getTableColumnCount(node, value);
  const rows = trimTrailingEmptySimpleRows(Array.isArray(value?.rows) ? value.rows : []);
  return rows.map((row) => {
    const effectiveWidth = Array.isArray(row) ? getEffectiveSimpleRowWidth(row) : 0;
    const cells = Array.isArray(row) ? row.slice(0, Math.min(columnCount, effectiveWidth || columnCount)) : [];
    while (cells.length < columnCount) cells.push('');
    return cells;
  });
}

function getEffectiveSimpleRowWidth(row) {
  if (!Array.isArray(row) || !row.length) return 0;
  let lastUsedIndex = -1;
  row.forEach((cell, index) => {
    if (!isBlankCell(cell)) {
      lastUsedIndex = index;
    }
  });
  return lastUsedIndex + 1;
}

function isNormalizedSimpleRowEmpty(row) {
  if (!Array.isArray(row) || row.length === 0) return true;
  return row.every((cell) => {
    if (!cell || cell.hidden) return true;
    return String(cell.value ?? cell.formula ?? '').trim() === '';
  });
}

function trimTrailingEmptySimpleRows(rows, normalized = false) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  let lastNonEmptyIndex = -1;
  rows.forEach((row, index) => {
    const isEmpty = normalized
      ? isNormalizedSimpleRowEmpty(row)
      : getEffectiveSimpleRowWidth(Array.isArray(row) ? row : []) === 0;
    if (!isEmpty) {
      lastNonEmptyIndex = index;
    }
  });
  return lastNonEmptyIndex >= 0 ? rows.slice(0, lastNonEmptyIndex + 1) : [];
}

function cloneSimpleTableCell(cell) {
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

function parseMergeCellRef(cellName) {
  const match = String(cellName || '').match(/^([A-Z]+)(\d+)$/i);
  if (!match) return null;

  const [, letters, rowRaw] = match;
  let colIndex = 0;
  for (const char of letters.toUpperCase()) {
    colIndex = colIndex * 26 + (char.charCodeAt(0) - 64);
  }

  return {
    rowIndex: Number(rowRaw) - 1,
    colIndex: colIndex - 1
  };
}

function validateMergedCells(rows, mergeCells, columnCount) {
  const issues = [];
  const occupied = new Map();
  const rowCount = rows.length;

  Object.entries(mergeCells || {}).forEach(([cellName, span]) => {
    const coordinates = parseMergeCellRef(cellName);
    if (!coordinates) {
      issues.push({ type: 'invalid-ref', cellName });
      return;
    }

    const { rowIndex, colIndex } = coordinates;
    if (rowIndex < 0 || colIndex < 0 || rowIndex >= rowCount || colIndex >= columnCount) {
      issues.push({ type: 'anchor-out-of-range', cellName, rowIndex, colIndex });
      return;
    }

    const [colSpanRaw, rowSpanRaw] = Array.isArray(span) ? span : [1, 1];
    const requestedColSpan = Number(colSpanRaw) || 1;
    const requestedRowSpan = Number(rowSpanRaw) || 1;
    const colSpan = Math.max(1, Math.min(requestedColSpan, columnCount - colIndex));
    const rowSpan = Math.max(1, Math.min(requestedRowSpan, rowCount - rowIndex));

    if (colSpan !== requestedColSpan || rowSpan !== requestedRowSpan) {
      issues.push({
        type: 'span-clamped',
        cellName,
        requestedColSpan,
        requestedRowSpan,
        colSpan,
        rowSpan
      });
    }

    for (let r = rowIndex; r < rowIndex + rowSpan; r += 1) {
      for (let c = colIndex; c < colIndex + colSpan; c += 1) {
        const key = `${r}:${c}`;
        const previous = occupied.get(key);
        if (previous && previous !== cellName) {
          issues.push({
            type: 'overlap',
            cellName,
            overlapsWith: previous,
            rowIndex: r,
            colIndex: c
          });
        } else {
          occupied.set(key, cellName);
        }
      }
    }
  });

  return issues;
}

function validateNormalizedGrid(rows) {
  const issues = [];

  rows.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell.hidden) return;
      if (cell.anchorRow == null || cell.anchorCol == null) {
        issues.push({ type: 'orphan-hidden-cell', rowIndex, colIndex });
        return;
      }
      const anchor = rows[cell.anchorRow]?.[cell.anchorCol];
      if (!anchor) {
        issues.push({ type: 'missing-anchor', rowIndex, colIndex, anchorRow: cell.anchorRow, anchorCol: cell.anchorCol });
        return;
      }
      const rowCovered = rowIndex >= cell.anchorRow && rowIndex < cell.anchorRow + (anchor.rowSpan || 1);
      const colCovered = colIndex >= cell.anchorCol && colIndex < cell.anchorCol + (anchor.colSpan || 1);
      if (!rowCovered || !colCovered) {
        issues.push({ type: 'anchor-range-mismatch', rowIndex, colIndex, anchorRow: cell.anchorRow, anchorCol: cell.anchorCol });
      }
    });
  });

  return issues;
}

function normalizeSimpleTableValue(node, value) {
  const columnCount = getTableColumnCount(node, value);
  const rows = normalizeTableRows(node, value).map((row) => row.map((cell) => cloneSimpleTableCell(cell)));
  const rowCount = rows.length;
  const mergeCells = value?.mergeCells && typeof value.mergeCells === 'object' ? value.mergeCells : {};
  const issues = validateMergedCells(rows, mergeCells, columnCount);

  issues.forEach((issue) => warnLatexTable('Invalid mergeCells entry', issue));

  Object.entries(mergeCells).forEach(([cellName, span]) => {
    const coordinates = parseMergeCellRef(cellName);
    if (!coordinates) return;

    const { rowIndex, colIndex } = coordinates;
    const anchor = rows[rowIndex]?.[colIndex];
    if (!anchor) return;

    const [colSpanRaw, rowSpanRaw] = Array.isArray(span) ? span : [1, 1];
    const colSpan = Math.max(1, Math.min(Number(colSpanRaw) || 1, columnCount - colIndex));
    const rowSpan = Math.max(1, Math.min(Number(rowSpanRaw) || 1, rowCount - rowIndex));
    anchor.colSpan = colSpan;
    anchor.rowSpan = rowSpan;

    for (let r = rowIndex; r < rowIndex + rowSpan; r += 1) {
      for (let c = colIndex; c < colIndex + colSpan; c += 1) {
        if (r === rowIndex && c === colIndex) continue;
        if (!rows[r]?.[c]) continue;
        rows[r][c] = {
          ...rows[r][c],
          hidden: true,
          anchorRow: rowIndex,
          anchorCol: colIndex
        };
      }
    }
  });

  validateNormalizedGrid(rows).forEach((issue) => warnLatexTable('Normalized merge validation warning', issue));

  return applyImplicitFullRowMerges(rows);
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

function resolveCellAlign(cell, fallback = 'l') {
  const raw = Number(cell?.ht);
  if (raw === 0) return 'c';
  if (raw === 1) return 'l';
  if (raw === 2) return 'r';
  return fallback;
}

function renderAlignedSimpleCellContent(cell, fallbackAlign = 'l') {
  const rendered = renderSimpleTableCell(cell);
  const align = resolveCellAlign(cell, fallbackAlign);
  if (align === 'c') return `{\\centering ${rendered}}`;
  if (align === 'r') return `{\\raggedleft ${rendered}}`;
  return rendered;
}

function applyCellHorizontalAlign(content, align = 'l') {
  if (align === 'c') return `\\centering ${content}`;
  if (align === 'r') return `\\raggedleft ${content}`;
  return `\\raggedright ${content}`;
}

function estimateColumnTextLoad(rows, columnCount) {
  return Array.from({ length: columnCount }, (_, colIndex) => {
    let totalLength = 0;
    let samples = 0;
    let maxLength = 0;

    rows.forEach((row) => {
      const cell = row[colIndex];
      if (!cell || cell.hidden) return;
      const text = getSimpleTableCellText(cell).trim();
      if (!text) return;
      totalLength += text.length;
      samples += 1;
      maxLength = Math.max(maxLength, text.length);
    });

    return {
      averageLength: samples ? totalLength / samples : 0,
      maxLength
    };
  });
}

function estimateSimpleTableDemand(rows, headers = []) {
  const columnCount = rows[0]?.length || headers.length || 1;
  const headerLengths = Array.from({ length: columnCount }, (_, index) => String(headers[index] || '').trim().length);
  const columnLoads = estimateColumnTextLoad(rows, columnCount);

  return columnLoads.map((entry, index) => {
    const visibleValues = rows
      .map((row) => row[index])
      .filter((cell) => cell && !cell.hidden)
      .map((cell) => getSimpleTableCellText(cell).trim())
      .filter(Boolean);
    const numericRatio = visibleValues.length
      ? visibleValues.filter((value) => /^-?\d+(?:[.,]\d+)?$/.test(value)).length / visibleValues.length
      : 0;
    const headerLength = headerLengths[index] || 0;
    const demand = Math.max(
      headerLength * 0.95,
      entry.averageLength * 0.72 + entry.maxLength * 0.38,
      entry.maxLength * 0.58,
      3.5
    );
    return numericRatio >= 0.6 ? demand * 0.9 : demand;
  });
}

function measureSimpleTablePressure(node, columnCount, rows, headers, layout) {
  const columnShares = getColumnWidthShares(node, columnCount);
  const columnDemand = estimateSimpleTableDemand(rows, headers);
  const columnPressure = columnDemand.map((demand, index) => {
    const available = Math.max(columnShares[index] * BASE_TABLE_CAPACITY * layout.charGain, 1);
    const longTextPenalty = demand > LANDSCAPE_TEXT_THRESHOLD ? 1.06 : 1;
    return (demand * longTextPenalty) / available;
  });
  return {
    maxPressure: columnPressure.length ? Math.max(...columnPressure) : 0,
    averagePressure: columnPressure.length
      ? columnPressure.reduce((sum, value) => sum + value, 0) / columnPressure.length
      : 0,
    columnPressure
  };
}

function resolveSimpleTableLayout(node, columnCount, rows, headers = []) {
  const evaluatedLayouts = SIMPLE_TABLE_LAYOUTS.map((layout) => ({
    ...layout,
    ...measureSimpleTablePressure(node, columnCount, rows, headers, layout)
  }));
  const fittedLayout = evaluatedLayouts.find((layout) => layout.maxPressure <= 1 && layout.averagePressure <= 0.96);
  const fallbackLayout = evaluatedLayouts[evaluatedLayouts.length - 1];
  const selectedLayout = fittedLayout || fallbackLayout;
  const shrinkRatio = selectedLayout.maxPressure > 0 ? 1 / selectedLayout.maxPressure : 1;
  const useLandscape = !fittedLayout && fallbackLayout.useResize && shrinkRatio < MIN_READABLE_TABLE_SCALE;

  return {
    ...selectedLayout,
    shrinkRatio,
    useLandscape
  };
}

function renderMergedLatexCell({
  cell,
  rowIndex,
  colIndex,
  columnCount,
  fallbackAlign,
  multiline = false,
  titleRow = false,
  node,
  leadingContent = ''
}) {
  const effectiveAlign = resolveCellAlign(cell, fallbackAlign);
  const backgroundColor = hexToLatexRgb(cell?.bg);
  const contentCell = { ...cell, bg: undefined };
  const isFullRowMerge = cell.colSpan === columnCount && cell.rowSpan === 1;
  const isPlainCell = !multiline && !backgroundColor && (cell.colSpan || 1) === 1 && (cell.rowSpan || 1) === 1;

  // Renderizar contenido base
  let text = renderSimpleTableCell(contentCell);
  const contentWithLeading = `${leadingContent}${text}`;
  const alignedContent = isPlainCell ? contentWithLeading : applyCellHorizontalAlign(contentWithLeading, effectiveAlign);

  // Determinar si necesitamos parbox
  const needsWrap = Boolean(multiline || cell.rowSpan > 1 || (cell.colSpan > 1 && !isFullRowMerge));
  let cellContent = wrapCellWithVerticalAlign(
    cell,
    needsWrap ? `\\parbox{\\linewidth}{${alignedContent}}` : alignedContent,
    needsWrap
  );

  const mergeSpec = getMergedColumnSpec(node, colIndex, cell.colSpan || 1, columnCount, effectiveAlign, backgroundColor);

  if (cell.colSpan > 1 && cell.rowSpan > 1) {
    return `\\multicolumn{${cell.colSpan}}{${mergeSpec}}{\\multirow{${cell.rowSpan}}{*}{${cellContent}}}`;
  }
  
  if (isFullRowMerge && titleRow && rowIndex === 0) {
    const headerContent = `\\textbf{${renderSimpleTableCell({ ...cell, bg: undefined })}}`;
    return `\\multicolumn{${cell.colSpan}}{${getMergedColumnSpec(node, colIndex, cell.colSpan, columnCount, 'c', backgroundColor)}}{${headerContent}}`;
  }

  if (isFullRowMerge) {
    return `\\multicolumn{${cell.colSpan}}{${mergeSpec}}{${text}}`;
  }

  // Siempre usar multicolumn de N columnas si hay fondo o span para asegurar el columncolor
  if (cell.colSpan > 1 || backgroundColor || (cell.ht !== undefined && cell.ht !== null)) {
    return `\\multicolumn{${cell.colSpan || 1}}{${mergeSpec}}{${cellContent}}`;
  }

  if (cell.rowSpan > 1) {
    return `\\multirow{${cell.rowSpan}}{*}{${cellContent}}`;
  }

  return cellContent;
}

function buildTableMeta(node, value, rows, columnCount, headers) {
  const effectiveNode = {
    ...node,
    columnAlign: value?.columnAlign || node?.columnAlign,
    columnWeights: value?.columnWeights || node?.columnWeights
  };
  const tableStyle = String(value?.tableStyle || node?.tableStyle || 'booktabs').toLowerCase();
  const usesBooktabs = tableStyle === 'booktabs';
  const usesGrid = tableStyle === 'grid';
  const usesCompact = tableStyle === 'compact';
  const layout = resolveSimpleTableLayout(effectiveNode, columnCount, rows, headers);
  const fontSize = usesCompact
    ? (layout.fontSize || '\\footnotesize')
    : layout.fontSize;
  const tabcolsep = usesCompact
    ? (layout.tabcolsep === NORMAL_TABCOLSEP ? COMPACT_TABCOLSEP : layout.tabcolsep)
    : layout.tabcolsep;
  const arrayStretch = usesCompact
    ? Math.min(layout.arrayStretch, 1.02)
    : layout.arrayStretch;
  const useLandscape = typeof value?.useLandscape === 'boolean'
    ? value.useLandscape
    : value?.orientation === 'landscape'
      ? true
      : layout.useLandscape;
  const forcedEnvironment = String(value?.tableEnvironment || node?.tableEnvironment || 'auto').toLowerCase();
  const rowCount = rows.length + (headers.length ? 1 : 0) + (value?.leadingTitleRow ? 1 : 0);
  const useLongtable = forcedEnvironment === 'longtable'
    || forcedEnvironment === 'sideways-longtable'
    || (forcedEnvironment === 'auto' && rowCount > LONG_TABLE_ROW_THRESHOLD);

  return {
    node,
    value,
    rows,
    headers,
    columnCount,
    leadingTitleRow: value?.leadingTitleRow || null,
    useLandscape,
    useLongtable,
    usesBooktabs,
    usesGrid,
    usesCompact,
    fontSize,
    tabcolsep,
    arrayStretch,
    useResize: layout.useResize && !useLandscape,
    shrinkRatio: layout.shrinkRatio,
    columnSpec: usesGrid ? gridColumnSpecFromAlign(effectiveNode, columnCount) : columnSpecFromAlign(effectiveNode, columnCount),
    centeredHeaderSpecs: getColumnSpecs({
      ...effectiveNode,
      columnAlign: Array.from({ length: columnCount }, () => 'c')
    }, columnCount),
    ruleTop: usesBooktabs ? '\\toprule' : '\\hline',
    ruleMid: usesBooktabs ? '\\midrule' : '\\hline',
    ruleBottom: usesBooktabs ? '\\bottomrule' : '\\hline'
  };
}

function buildTableLayoutModel(node, value) {
  const columnCount = Number(value?.count) || getTableColumnCount(node, value);
  const rows = hasNormalizedSimpleRows(value?.rows)
    ? trimTrailingEmptySimpleRows(value.rows, true)
    : normalizeSimpleTableValue(node, { ...value, rows: Array.isArray(value?.rows) ? value.rows : [] });
  const headers = Array.isArray(value?.headers) ? value.headers : getEffectiveTableHeaders(node, value, columnCount);
  return buildTableMeta(node, value, rows, columnCount, headers);
}

function renderTableHeader(model) {
  const leadingTitleLine = model.leadingTitleRow?.[0]
    && !model.leadingTitleRow[0].hidden
    && model.leadingTitleRow[0].colSpan === model.columnCount
    ? `\\rowcolor{CFGColorPrimario} \\multicolumn{${model.columnCount}}{${model.usesGrid ? '|c|' : 'c'}}{\\color{white}\\textbf{${getSimpleTableCellLatex(model.leadingTitleRow[0])}}} \\\\`
    : '';

  const headerLine = model.headers.length
    ? `\\rowcolor{CFGColorPrimario} ` + model.headers
      .map((header, index) => `\\multicolumn{1}{${model.centeredHeaderSpecs[index]}}{\\color{white}\\textbf{${htmlToLatex(header || '')}}}`)
      .join(' & ') + ' \\\\'
    : '';

  return {
    leadingTitleLine,
    headerLine
  };
}

function renderLatexTableRow(row, model, options = {}) {
  const { multiline = false } = options;
  const cells = [];
  let consumedColumns = 0;

  for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
    if (consumedColumns >= model.columnCount) break;

    const cell = row[colIndex];
    if (!cell) {
      cells.push(' ');
      consumedColumns += 1;
      continue;
    }

    if (cell.hidden) {
      if (cell.anchorRow === options.rowIndex) {
        continue;
      }
      cells.push(' ');
      consumedColumns += 1;
      continue;
    }

    const fallbackAlign = String((model.value?.columnAlign || model.node?.columnAlign || [])[colIndex] || 'l').toLowerCase();
    const remainingColumns = model.columnCount - consumedColumns;
    const safeSpan = Math.max(1, Math.min(Number(cell.colSpan) || 1, remainingColumns));

    cells.push(
      renderMergedLatexCell({
        cell: { ...cell, colSpan: safeSpan },
        rowIndex: options.rowIndex,
        colIndex,
        columnCount: model.columnCount,
        fallbackAlign,
        multiline,
        titleRow: true,
        node: {
          ...model.node,
          columnWeights: model.value?.columnWeights || model.node?.columnWeights
        },
        leadingContent: ''
      })
    );

    consumedColumns += safeSpan;
  }

  while (consumedColumns < model.columnCount) {
    cells.push(' ');
    consumedColumns += 1;
  }

  return `${cells.join(' & ')} \\\\`;
}

function renderTableBody(model) {
  return model.rows.map((row, rowIndex) => {
    return renderLatexTableRow(row, model, { rowIndex, multiline: false });
  }).join('\n');
}

function wrapTableEnvironment(model, content) {
  const labelLine = model.node?.hasLabel !== false && model.value?.label
    ? `\\label{${sanitizeLatexLabel(model.value.label, 'tabla')}}`
    : model.node?.hasLabel
      ? `\\label{tab:${sanitizeLatexLabel(model.node.id || 'tabla', 'tabla')}}`
      : '';
  const captionLine = model.node?.hasCaption !== false && model.value?.caption ? `\\caption{${escapeLatex(model.value.caption)}}` : '';
  const longtableCaptionLine = captionLine || labelLine ? `${captionLine}${labelLine} \\\\` : '';
  const sourceLine = model.node?.hasSource !== false && model.value?.source
    ? `\\multicolumn{${model.columnCount}}{r}{\\scriptsize\\textit{Fuente: ${escapeLatex(model.value.source)}}} \\\\`
    : '';

  const zebraCommand = model.usesCompact ? '' : '\\rowcolors{1}{white}{CFGColorTablaPar}';

  const table = model.useLongtable
    ? [
        model.fontSize,
        model.tabcolsep !== NORMAL_TABCOLSEP ? `\\setlength{\\tabcolsep}{${model.tabcolsep}}` : '',
        `\\renewcommand{\\arraystretch}{${model.arrayStretch}}`,
        '\\setlength{\\LTleft}{\\fill}',
        '\\setlength{\\LTright}{\\fill}',
        zebraCommand,
        `\\begin{longtable}{${model.columnSpec}}`,
        longtableCaptionLine,
        model.ruleTop,
        content,
        sourceLine,
        model.ruleBottom,
        '\\end{longtable}',
        ''
      ].filter(Boolean).join('\n')
    : [
        '\\begin{table}[htbp]',
        '\\centering',
        model.fontSize,
        model.tabcolsep !== NORMAL_TABCOLSEP ? `\\setlength{\\tabcolsep}{${model.tabcolsep}}` : '',
        `\\renewcommand{\\arraystretch}{${model.arrayStretch}}`,
        zebraCommand,
        model.useResize ? '\\resizebox{\\textwidth}{!}{%' : '',
        `\\begin{tabular}{${model.columnSpec}}`,
        model.ruleTop,
        content,
        model.ruleBottom,
        '\\end{tabular}',
        model.useResize ? '}' : '',
        captionLine,
        sourceLine ? `\\caption*{Fuente: ${escapeLatex(model.value.source)}}` : '',
        labelLine,
        '\\end{table}',
        ''
      ].filter(Boolean).join('\n');

  return model.useLandscape
    ? [
        '\\clearpage',
        '\\begin{landscape}',
        '\\pagestyle{contenido}',
        '\\thispagestyle{contenido}',
        table,
        '\\end{landscape}',
        '\\clearpage'
      ].join('\n')
    : table;
}

export function renderTable(node, value) {
  const model = buildTableLayoutModel(node, value);
  const { leadingTitleLine, headerLine } = renderTableHeader(model);
  const body = renderTableBody(model);
  const continuationSpec = model.usesGrid ? `|r|` : 'r';

  const tableCore = [
    leadingTitleLine,
    leadingTitleLine ? model.ruleMid : '',
    headerLine,
    headerLine ? model.ruleMid : '',
    model.useLongtable ? '\\endfirsthead' : '',
    model.useLongtable ? model.ruleTop : '',
    model.useLongtable ? headerLine : '',
    model.useLongtable && headerLine ? model.ruleMid : '',
    model.useLongtable ? '\\endhead' : '',
    model.useLongtable ? model.ruleMid : '',
    model.useLongtable ? `\\multicolumn{${model.columnCount}}{${continuationSpec}}{\\scriptsize Continuacion en la pagina siguiente} \\\\` : '',
    model.useLongtable ? '\\endfoot' : '',
    body || `\\multicolumn{${model.columnCount}}{l}{${escapeLatex(PENDING_CELL_TEXT)}}\\\\`
  ].filter(Boolean).join('\n');

  return wrapTableEnvironment(model, tableCore);
}

function buildAdvancedTableLayoutModel(node, value) {
  const normalized = normalizeAdvancedTableValue(node, value);
  const columnCount = normalized.rows[0]?.length || node?.columnCount || 1;

  return {
    node,
    normalized,
    columnCount,
    environment: normalized.repeatHeader ? 'longtable' : 'tabular',
    columnSpec: columnSpecFromAlign(node, columnCount),
    useLandscape: normalized.orientation === 'landscape'
  };
}

function renderAdvancedTableBody(model) {
  return model.normalized.rows.map((row, rowIndex) => {
    return renderLatexTableRow(
      row,
      {
        ...model,
        value: {
          ...(model.normalized || {}),
          columnAlign: model.node?.columnAlign || []
        }
      },
      { rowIndex, multiline: true }
    );
  }).join('\n');
}

function wrapRenderedTableContent({ tableCore, useLandscape, caption, label, source }) {
  const wrappedCore = useLandscape
    ? [
        '\\clearpage',
        '\\newgeometry{left=2.5cm,right=2.5cm,top=2.5cm,bottom=2.5cm,paperwidth=29.7cm,paperheight=21cm}',
        '\\pagestyle{contenido}',
        '\\thispagestyle{contenido}',
        tableCore,
        '\\restoregeometry',
        '\\clearpage'
      ].join('\n')
    : tableCore;

  return [
    wrappedCore,
    caption || '',
    label || '',
    source || '',
    ''
  ].filter(Boolean).join('\n');
}

export function renderAdvancedTable(node, value) {
  const model = buildAdvancedTableLayoutModel(node, value);
  const body = renderAdvancedTableBody(model);
  const tableCore = [
    `\\begin{${model.environment}}{${model.columnSpec}}`,
    body || `\\multicolumn{${model.columnCount}}{l}{${escapeLatex(PENDING_CELL_TEXT)}}\\\\`,
    `\\end{${model.environment}}`
  ].join('\n');

  return wrapRenderedTableContent({
    tableCore,
    useLandscape: model.useLandscape,
    caption: model.node?.hasCaption !== false && model.normalized.caption ? `\\captionof{table}{${escapeLatex(model.normalized.caption)}}` : '',
    label: model.node?.hasLabel !== false && model.normalized.label ? `\\label{${sanitizeLatexLabel(model.normalized.label, 'tabla')}}` : '',
    source: model.node?.hasSource !== false && model.normalized.source ? `\\textit{Fuente: ${escapeLatex(model.normalized.source)}}` : ''
  });
}

export function isValueEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    if (Array.isArray(value.rows)) {
      return value.rows.length === 0 || value.rows.every((row) => !Array.isArray(row) || row.every(isBlankCell));
    }
    if ('file' in value) {
      return isBlankCell(value.file);
    }
    return Object.keys(value).length === 0;
  }
  return false;
}

export function isBlockValueEmpty(block, value) {
  if (block?.type === 'template_text') {
    return String(block?.template || block?.content || value || '').trim() === '';
  }

  if (block?.type === 'advanced_table') {
    return isAdvancedTableEmpty(block, value);
  }

  if (block?.type === 'image') {
    return isBlankCell(value?.file);
  }

  if (block?.type === 'table') {
    return isValueEmpty({ rows: normalizeTableRows(block, value) });
  }

  return isValueEmpty(value);
}

export function resolveTableEnvironment(columnCount, rowCount, forced) {
  if (forced && forced !== 'auto') return forced;
  const isLandscape = Number(columnCount) >= WIDE_TABLE_COLUMN_THRESHOLD;
  const isLong = Number(rowCount) > LONG_TABLE_ROW_THRESHOLD;
  if (isLandscape && isLong) return 'sideways-longtable';
  if (isLandscape) return 'sidewaystable';
  if (isLong) return 'longtable';
  return 'table';
}
