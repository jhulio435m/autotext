import { useEffect, useMemo, useRef } from 'react';
import { Workbook } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';
import { coordsToCell, cellToCoords } from './spreadsheetHelpers';
import { CELL_STYLE_KEYS } from './spreadsheetConstants';

const SHEET_CONFIG_KEYS = ['columnlen', 'rowlen', 'customHeight', 'customWidth', 'borderInfo', 'rowhidden', 'colhidden'];
const FORTUNE_MERGE_WARNING = 'Main merge info row_pre or col_pre or row or col is null';
let restoreFortuneConsoleFilter = null;

function extractCellStyle(cell) {
  const style = {};
  CELL_STYLE_KEYS.forEach((key) => {
    if (cell?.[key] !== undefined) {
      style[key] = cell[key];
    }
  });
  return style;
}

function getCellDisplayValue(cell) {
  if (!cell || typeof cell !== 'object') return cell ?? '';
  return cell.v ?? cell.m ?? '';
}

function getCellInputValue(cell) {
  if (!cell || typeof cell !== 'object') return cell ?? '';
  return cell.f ?? cell.m ?? cell.v ?? '';
}

function getCellMergeValue(cell) {
  if (!cell || typeof cell !== 'object') return undefined;
  return cell.mc;
}

function hasMeaningfulCellContent(cell) {
  if (cell == null) return false;
  if (typeof cell !== 'object') return String(cell).trim() !== '';
  if (getCellInputValue(cell) !== '') return true;
  if (Object.keys(extractCellStyle(cell)).length > 0) return true;
  return Boolean(cell.mc);
}

function collectMergeMap(configMerge, rawRows, celldataMap) {
  const nextMerge = {};

  Object.values(configMerge || {}).forEach((merge) => {
    if (merge && typeof merge.r === 'number' && typeof merge.c === 'number') {
      const cellName = coordsToCell(merge.c, merge.r);
      nextMerge[cellName] = [merge.cs, merge.rs];
    }
  });

  const registerMergeFromCell = (cell, r, c) => {
    const merge = cell?.mc;
    if (!merge || merge.r !== r || merge.c !== c) return;
    const cellName = coordsToCell(c, r);
    nextMerge[cellName] = [merge.cs || 1, merge.rs || 1];
  };

  rawRows.forEach((row, r) => {
    if (!Array.isArray(row)) return;
    row.forEach((cell, c) => registerMergeFromCell(cell, r, c));
  });

  celldataMap.forEach((cell, key) => {
    const [rRaw, cRaw] = key.split(':');
    registerMergeFromCell(cell, Number(rRaw), Number(cRaw));
  });

  return nextMerge;
}

function extractSheetConfig(config) {
  const nextConfig = {};
  SHEET_CONFIG_KEYS.forEach((key) => {
    const value = config?.[key];
    if (value !== undefined) {
      nextConfig[key] = value;
    }
  });
  return nextConfig;
}

function parsePixelSize(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  const match = normalized.match(/^(\d+(?:\.\d+)?)(px|pt)?$/i);
  if (!match) return null;
  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  if (match[2]?.toLowerCase() === 'pt') {
    return Math.round(numeric * (96 / 72));
  }
  return Math.round(numeric);
}

function getDeclaredSizeFromElement(element, cssProperty, attrNames) {
  for (const attrName of attrNames) {
    const attrValue = element.getAttribute(attrName);
    const parsed = parsePixelSize(attrValue);
    if (parsed) return parsed;
  }

  const inlineValue = element.style?.[cssProperty];
  const parsedInline = parsePixelSize(inlineValue);
  if (parsedInline) return parsedInline;

  return null;
}

function extractDimensionsFromHtml(html) {
  if (!html || typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return null;
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');
  const table = document.querySelector('table');
  if (!table) return null;

  const columnlen = {};
  const rowlen = {};
  const customWidth = {};
  const customHeight = {};

  const colElements = Array.from(table.querySelectorAll('col'));
  colElements.forEach((col, index) => {
    const width = getDeclaredSizeFromElement(col, 'width', ['width']);
    if (width) {
      columnlen[index] = width;
      customWidth[index] = 1;
    }
  });

  const rows = Array.from(table.rows || []);
  rows.forEach((row, rowIndex) => {
    const height = getDeclaredSizeFromElement(row, 'height', ['height']);
    if (height) {
      rowlen[rowIndex] = height;
      customHeight[rowIndex] = 1;
    }

    let visualColumn = 0;
    Array.from(row.cells || []).forEach((cell) => {
      const width = getDeclaredSizeFromElement(cell, 'width', ['width']);
      if (width) {
        const span = Math.max(1, Number(cell.colSpan) || 1);
        const perColumnWidth = Math.max(20, Math.round(width / span));
        for (let offset = 0; offset < span; offset += 1) {
          const columnIndex = visualColumn + offset;
          if (!columnlen[columnIndex] || columnlen[columnIndex] < perColumnWidth) {
            columnlen[columnIndex] = perColumnWidth;
            customWidth[columnIndex] = 1;
          }
        }
      }
      visualColumn += Math.max(1, Number(cell.colSpan) || 1);
    });
  });

  if (!Object.keys(columnlen).length && !Object.keys(rowlen).length) {
    return null;
  }

  return {
    ...(Object.keys(columnlen).length ? { columnlen, customWidth } : {}),
    ...(Object.keys(rowlen).length ? { rowlen, customHeight } : {})
  };
}

function mergeSheetConfig(baseConfig, htmlConfig) {
  if (!htmlConfig) return baseConfig;
  const nextConfig = { ...baseConfig };
  ['columnlen', 'rowlen', 'customWidth', 'customHeight'].forEach((key) => {
    if (htmlConfig[key] && Object.keys(htmlConfig[key]).length) {
      nextConfig[key] = {
        ...(baseConfig?.[key] || {}),
        ...htmlConfig[key]
      };
    }
  });
  return nextConfig;
}

function installFortuneConsoleFilter() {
  if (restoreFortuneConsoleFilter || typeof console === 'undefined') return;

  const original = {
    log: console.log,
    warn: console.warn,
    error: console.error
  };

  const shouldIgnore = (args) =>
    typeof args?.[0] === 'string' && args[0].includes(FORTUNE_MERGE_WARNING);

  console.log = (...args) => {
    if (shouldIgnore(args)) return;
    original.log(...args);
  };
  console.warn = (...args) => {
    if (shouldIgnore(args)) return;
    original.warn(...args);
  };
  console.error = (...args) => {
    if (shouldIgnore(args)) return;
    original.error(...args);
  };

  restoreFortuneConsoleFilter = () => {
    console.log = original.log;
    console.warn = original.warn;
    console.error = original.error;
    restoreFortuneConsoleFilter = null;
  };
}

/**
 * React wrapper for FortuneSheet (Google Sheets clone)
 */
function SpreadsheetEditor({
  data = [[]],
  mergeCells = {},
  sheetConfig = {},
  onChange,
  onPasteBlocked,
  readOnly = false,
  minRows = 3,
  minCols = 3
}) {
  const workbookRef = useRef(null);
  const lastEmittedRef = useRef('');
  const pendingHtmlConfigRef = useRef(null);
  const pasteAttemptRef = useRef(null);

  useEffect(() => {
    installFortuneConsoleFilter();
  }, []);

  // Convert autotext 2D rows into FortuneSheet celldata format
  const sheetData = useMemo(() => {
    const celldata = [];
    
    // Process rows/cells
    data.forEach((row, r) => {
      row.forEach((cell, c) => {
        const val = typeof cell === 'object' ? (cell.formula || cell.value || '') : cell;
        if (!hasMeaningfulCellContent(cell)) return;
        const isFormula = String(val).startsWith('=');
        const style = typeof cell === 'object' ? extractCellStyle(cell) : {};
        const merge = typeof cell === 'object' ? getCellMergeValue(cell) : undefined;
        celldata.push({
          r,
          c,
          v: {
            v: isFormula ? undefined : val,
            m: isFormula ? undefined : String(val),
            f: isFormula ? val : undefined,
            mc: merge,
            ...style
          }
        });
      });
    });

    // Process merges from A1 format to FortuneSheet format
    const fortuneMerge = {};
    Object.entries(mergeCells || {}).forEach(([cellName, spans]) => {
      const [c, r] = cellToCoords(cellName);
      const [cs, rs] = spans;
      fortuneMerge[`${r}_${c}`] = { r, c, rs, cs };
    });

    return [
      {
        name: 'Hoja1',
        celldata,
        config: {
          ...extractSheetConfig(sheetConfig),
          merge: fortuneMerge
        }
      }
    ];
  }, [data, mergeCells, sheetConfig]);

  const handleWorkbookChange = (nextData) => {
    if (readOnly || !nextData?.[0]) return;
    
    const sheet = nextData[0];
    const configMerge = sheet.config?.merge || {};
    const rawRows = Array.isArray(sheet.data) ? sheet.data : [];
    const celldata = Array.isArray(sheet.celldata) ? sheet.celldata : [];
    const celldataMap = new Map(
      celldata
        .filter((entry) => entry && typeof entry.r === 'number' && typeof entry.c === 'number')
        .map((entry) => [`${entry.r}:${entry.c}`, entry.v || null])
    );

    // Find max dimensions from the live matrix that FortuneSheet keeps updated.
    let maxR = Math.max(0, Number(minRows || 1) - 1, rawRows.length - 1);
    let maxC = Math.max(0, Number(minCols || 1) - 1);
    rawRows.forEach((row, rowIndex) => {
      if (rowIndex > maxR) maxR = rowIndex;
      if (Array.isArray(row) && row.length - 1 > maxC) {
        maxC = row.length - 1;
      }
    });
    celldata.forEach((entry) => {
      if (!entry) return;
      if (typeof entry.r === 'number' && entry.r > maxR) maxR = entry.r;
      if (typeof entry.c === 'number' && entry.c > maxC) maxC = entry.c;
    });

    // Keep both the user input and the calculated result.
    // For plain tables we persist the visible/input value, not only formulas.
    const results = Array.from({ length: maxR + 1 }, () => Array(maxC + 1).fill(''));
    const inputs = Array.from({ length: maxR + 1 }, () => Array(maxC + 1).fill(''));
    const structuredRows = Array.from({ length: maxR + 1 }, () => Array(maxC + 1).fill(''));

    for (let r = 0; r <= maxR; r += 1) {
      for (let c = 0; c <= maxC; c += 1) {
        const matrixCell = rawRows[r]?.[c] ?? null;
        const celldataCell = celldataMap.get(`${r}:${c}`) ?? null;
        const cell = matrixCell ?? celldataCell;
        if (cell == null) continue;

        if (typeof cell === 'object') {
          const renderedValue = getCellDisplayValue(matrixCell ?? celldataCell);
          const inputValue = getCellInputValue(matrixCell ?? celldataCell);
          const style = {
            ...extractCellStyle(celldataCell),
            ...extractCellStyle(matrixCell)
          };
          const formula = matrixCell?.f ?? celldataCell?.f ?? '';
          const hasStyle = Object.keys(style).length > 0;
          results[r][c] = renderedValue;
          inputs[r][c] = inputValue;
          structuredRows[r][c] = hasStyle || formula
            ? {
                value: renderedValue,
                formula,
                ...style
              }
            : inputValue;
          continue;
        }

        results[r][c] = cell;
        inputs[r][c] = cell;
        structuredRows[r][c] = cell;
      }
    }

    // Convert merges back to A1 format
    const nextMerge = collectMergeMap(configMerge, rawRows, celldataMap);
    const nextSheetConfig = mergeSheetConfig(
      extractSheetConfig(sheet.config),
      pendingHtmlConfigRef.current
    );
    pendingHtmlConfigRef.current = null;
    const snapshot = JSON.stringify({ inputs, results, nextMerge, structuredRows, nextSheetConfig });
    if (snapshot === lastEmittedRef.current) return;
    lastEmittedRef.current = snapshot;
    if (pasteAttemptRef.current?.timer) {
      clearTimeout(pasteAttemptRef.current.timer);
      pasteAttemptRef.current = null;
    }
    
    onChange?.(inputs, results, nextMerge, undefined, structuredRows, nextSheetConfig);
  };

  const handlePasteCapture = (event) => {
    const html = event.clipboardData?.getData('text/html') || '';
    pendingHtmlConfigRef.current = extractDimensionsFromHtml(html);

    if (pasteAttemptRef.current?.timer) {
      clearTimeout(pasteAttemptRef.current.timer);
    }

    pasteAttemptRef.current = {
      timer: window.setTimeout(() => {
        pasteAttemptRef.current = null;
        pendingHtmlConfigRef.current = null;
        onPasteBlocked?.();
      }, 350)
    };
  };

  return (
    <div
      className='fortunesheet-wrapper overflow-hidden rounded-md border border-slate-200 min-h-[300px] lg:min-h-[450px]'
      onPasteCapture={handlePasteCapture}
    >
      <Workbook 
        ref={workbookRef}
        data={sheetData} 
        onChange={handleWorkbookChange}
        lang="es"
      />
    </div>
  );
}

export default SpreadsheetEditor;
