import { Suspense, lazy, useMemo } from 'react';
import { CELL_STYLE_KEYS } from './spreadsheetConstants';
import { coordsToCell, cellToCoords } from './spreadsheetHelpers';
import { normalizeAdvancedTableValue } from '../utils/advancedTable.js';
import { buildTableExportValue } from '../utils/exportModel.js';
import useDocumentStore from '../store';

const SpreadsheetEditor = lazy(() => import('./SpreadsheetEditor'));

// Default size for new tables — small and practical
const DEFAULT_ROWS = 4;
const DEFAULT_COLS = 3;

/* ── Conversion helpers ──────────────────────────────────────── */

function tableToSpreadsheet(block, value) {
  const normalized = normalizeAdvancedTableValue(block, value);
  const data = normalized.rows.map((row, rowIndex) =>
    row.map((cell, colIndex) => {
      if (cell.hidden) return { mc: { r: cell.anchorRow, c: cell.anchorCol } };
      const nextCell = { ...cell };
      if (cell.colSpan > 1 || cell.rowSpan > 1) {
        nextCell.mc = { r: rowIndex, c: colIndex, rs: cell.rowSpan, cs: cell.colSpan };
      }
      return nextCell;
    })
  );

  const mergeCells = {};
  normalized.rows.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (!cell.hidden && (cell.colSpan > 1 || cell.rowSpan > 1)) {
        mergeCells[coordsToCell(colIndex, rowIndex)] = [cell.colSpan, cell.rowSpan];
      }
    });
  });

  return { data, mergeCells, meta: normalized };
}

function spreadsheetToTableValue(rawData, results, rawMerge, prevMeta) {
  const rows = rawData.map((row, r) =>
    row.map((cellValue, c) => {
      const src = cellValue && typeof cellValue === 'object' && !Array.isArray(cellValue) ? cellValue : null;
      const inputValue = src ? (src.formula || src.value || '') : cellValue;
      const isFormula = String(inputValue || '').startsWith('=');
      const calculated = results?.[r]?.[c] ?? inputValue;
      const style = {};
      CELL_STYLE_KEYS.forEach((key) => { if (src?.[key] !== undefined) style[key] = src[key]; });
      return { value: calculated ?? '', formula: isFormula ? inputValue : '', rowSpan: 1, colSpan: 1, hidden: false, anchorRow: null, anchorCol: null, ...style };
    })
  );

  if (rawMerge && typeof rawMerge === 'object') {
    Object.entries(rawMerge).forEach(([cellName, span]) => {
      const coords = cellToCoords(cellName);
      if (!coords || coords.length < 2) return;
      const [colIndex, rowIndex] = coords;
      const [colSpan, rowSpan] = span;
      if (rows[rowIndex]?.[colIndex]) { rows[rowIndex][colIndex].colSpan = colSpan; rows[rowIndex][colIndex].rowSpan = rowSpan; }
    });
  }

  const effectiveCols = rows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);

  return {
    columnCount: Math.max(Number(prevMeta?.columnCount) || 0, effectiveCols),
    orientation: prevMeta?.orientation || 'portrait',
    repeatHeader: prevMeta?.repeatHeader !== false,
    headerRows: prevMeta?.headerRows || 1,
    caption: prevMeta?.caption || '',
    source: prevMeta?.source || prevMeta?.tableSource || '',
    description: prevMeta?.description || '',
    label: prevMeta?.label || '',
    tableStyle: prevMeta?.tableStyle || 'booktabs',
    style: prevMeta?.style || {},
    sheetConfig: prevMeta?.sheetConfig || {},
    rows
  };
}

/* ── Main component ──────────────────────────────────────────── */

function TableEditor({ block, value, onChange, onUpdateProps }) {
  const pushToast     = useDocumentStore((s) => s.pushToast);
  const storeUpdateNodeProps = useDocumentStore((s) => s.updateNodeProps);
  const effectiveUpdateNodeProps = onUpdateProps || storeUpdateNodeProps;

  // Determine grid size — default to a small table if no data yet
  const hasData = Array.isArray(value?.rows) && value.rows.length > 0;
  const minCols = Math.max(
    DEFAULT_COLS,
    Number(block?.columnCount) || Number(block?.columnHeaders?.length) || (Array.isArray(value?.rows?.[0]) ? value.rows[0].length : 0)
  );
  const minRows = hasData ? Math.max(DEFAULT_ROWS, value.rows.length) : DEFAULT_ROWS;

  const { sheetData, sheetMerge, sheetConfig, meta } = useMemo(() => {
    const { data, mergeCells, meta: tableMeta } = tableToSpreadsheet(block, value);
    return { sheetData: data, sheetMerge: mergeCells, sheetConfig: value?.sheetConfig || {}, meta: tableMeta };
  }, [block, value]);

  const handleChange = (rawData, results, newMerge, newStyle, structuredRows, nextSheetConfig) => {
    const result = spreadsheetToTableValue(structuredRows || rawData, results, newMerge, { ...meta, ...value });
    result.style = newStyle || value?.style || {};
    result.sheetConfig = nextSheetConfig || value?.sheetConfig || {};
    onChange(result);
  };

  const handleCleanTable = () => {
    const cleaned = buildTableExportValue(block, value || {});
    const nextValue = {
      ...(value && typeof value === 'object' ? value : {}),
      ...cleaned,
      rows: cleaned.rows || [],
      columnCount: cleaned.count || block?.columnCount || 1,
      tableStyle: cleaned.tableStyle || block?.tableStyle || 'booktabs',
      orientation: cleaned.orientation || block?.orientation || 'portrait'
    };
    ['mergeCells', 'count', 'headers', 'leadingTitleRow', 'columnAlign', 'columnWeights', 'useLandscape'].forEach(k => delete nextValue[k]);
    onChange(nextValue);
    effectiveUpdateNodeProps(block.id, { columnCount: Math.max(1, Number(cleaned.count) || 1) });
    pushToast('Tabla limpiada: se recortaron filas y columnas vacías.', 'success');
  };

  return (
    <div className='space-y-2' onPasteCapture={() => {}}>
      <div className='flex items-center justify-between gap-3 px-3 pt-3'>
        <span className='text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400'>
          Edición de tabla
        </span>
        <button
          type='button'
          onClick={handleCleanTable}
          className='inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 transition hover:border-amber-300 hover:bg-amber-100'
        >
          Limpiar tabla
        </button>
      </div>

      <Suspense
        fallback={
          <div className='rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500'>
            Cargando editor de tabla...
          </div>
        }
      >
        <SpreadsheetEditor
          data={sheetData}
          mergeCells={sheetMerge}
          sheetConfig={sheetConfig}
          onChange={handleChange}
          onPasteBlocked={() => pushToast('No se pudo pegar sobre la selección. Revisa las celdas combinadas.', 'warning')}
          minRows={minRows}
          minCols={minCols}
        />
      </Suspense>
    </div>
  );
}

export default TableEditor;
