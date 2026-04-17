import { useMemo, useState } from 'react';
import katex from 'katex';
import { interpolate, isBlockValueEmpty } from '../../utils/latex';
import { getVisibleAdvancedRows, normalizeAdvancedTableValue } from '../../utils/advancedTable.js';
import { buildTableExportValue } from '../../utils/exportModel.js';
import FormField from '../FormField';
import AutoTextarea from '../ui/AutoTextarea';

export function renderMath(expression) {
  try {
    return katex.renderToString(expression || '', { throwOnError: false, displayMode: true });
  } catch {
    return '<span style="color:#dc2626">[Formula invalida]</span>';
  }
}

import RichTextEditor from '../ui/RichTextEditor';

function normalizeCssColor(value) {
  if (!value) return undefined;
  const stringValue = String(value).trim();
  if (!stringValue) return undefined;
  return stringValue.startsWith('#') ? stringValue : `#${stringValue}`;
}

function resolvePreviewTextAlign(cell, fallback = 'left') {
  const raw = Number(cell?.ht);
  if (raw === 0) return 'center';
  if (raw === 2) return 'right';
  if (raw === 1) return 'left';
  return fallback;
}

function resolvePreviewVerticalAlign(cell) {
  const raw = Number(cell?.vt);
  if (raw === 1) return 'top';
  if (raw === 2) return 'bottom';
  return 'middle';
}

function getPreviewCellStyle(cell, fallbackAlign = 'left') {
  return {
    backgroundColor: normalizeCssColor(cell?.bg),
    color: normalizeCssColor(cell?.fc),
    fontWeight: cell?.bl ? 700 : undefined,
    fontStyle: cell?.it ? 'italic' : undefined,
    textDecoration: cell?.un ? 'underline' : undefined,
    textAlign: resolvePreviewTextAlign(cell, fallbackAlign),
    verticalAlign: resolvePreviewVerticalAlign(cell)
  };
}

function getPreviewColumnWidths(sheetConfig, count) {
  const columnlen = sheetConfig?.columnlen;
  if (!columnlen || typeof columnlen !== 'object') return null;
  const widths = Array.from({ length: count }, (_, index) => Number(columnlen[index]) || 0);
  const usable = widths.filter((value) => value > 0);
  if (!usable.length) return null;
  const total = usable.reduce((sum, value) => sum + value, 0);
  if (!total) return null;
  return widths.map((value) => (value > 0 ? `${((value / total) * 100).toFixed(2)}%` : null));
}

function getDisplayCellValue(cell) {
  if (cell == null) return '';
  if (typeof cell === 'object' && !Array.isArray(cell)) {
    return cell.value ?? cell.formula ?? '';
  }
  return cell;
}

function isPlaceholderHeader(value) {
  return /^col(?:umna)?\s*\d+$/i.test(String(value || '').trim());
}

function getTableColumnCount(node, value) {
  const rowWidths = Array.isArray(value?.rows)
    ? value.rows.map((row) => (Array.isArray(row) ? row.length : 0))
    : [];
  const widestRow = rowWidths.length ? Math.max(...rowWidths) : 0;
  return Math.max(1, Number(node?.columnCount) || 0, node?.columnHeaders?.length || 0, widestRow);
}

function getEffectiveHeaders(node, value, count) {
  const headers = Array.isArray(node?.columnHeaders) ? node.columnHeaders.slice(0, count) : [];
  if (!headers.length) return [];
  const meaningful = headers.filter((header) => String(header || '').trim());
  if (!meaningful.length) return [];
  if (meaningful.every((header) => isPlaceholderHeader(header))) return [];
  while (headers.length < count) headers.push('');
  return headers;
}

function normalizePreviewRows(node, value) {
  const count = getTableColumnCount(node, value);
  const rows = Array.isArray(value?.rows) ? value.rows : [];
  return rows.map((row) => {
    const cells = Array.isArray(row) ? row.slice(0, count) : [];
    while (cells.length < count) cells.push('');
    return cells;
  });
}

function hasStructuredTableRows(rows) {
  return Array.isArray(rows)
    && rows.some((row) =>
      Array.isArray(row)
      && row.some((cell) => cell && typeof cell === 'object' && !Array.isArray(cell))
    );
}

function renderEditableText(node, value, onChange) {
  const currentValue = typeof value === 'string' && value !== '' ? value : (node.content || '');
  return (
    <div className='group/inline-edit'>
      <RichTextEditor
        value={currentValue}
        onChange={(val) => onChange(node.id, val)}
        placeholder='Escribe el texto aquí...'
      />
    </div>
  );
}

function EditableTemplateBlock({ node, value, formData, onChange, onCreateVariable }) {
  const [selection, setSelection] = useState({ text: '', start: 0, end: 0 });
  const templateValue = typeof value === 'string' && value !== '' ? value : (node.template || node.content || '');
  const resolved = useMemo(() => interpolate(templateValue, formData), [templateValue, formData]);
  const variableMatches = Array.from(templateValue.matchAll(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g)).map((match) => match[1]);
  const variableCount = new Set(variableMatches).size;

  const handleSelection = (event) => {
    const start = event.target.selectionStart ?? 0;
    const end = event.target.selectionEnd ?? 0;
    const text = start !== end ? templateValue.slice(start, end) : '';
    setSelection({ text, start, end });
  };

  const handleCreateVariable = () => {
    const cleanText = selection.text.trim();
    if (!cleanText || !onCreateVariable) return;
    const created = onCreateVariable(node.id, cleanText, cleanText);
    if (!created?.variableKey) return;
    const replacement = `{{${created.variableKey}}}`;
    const nextValue = `${templateValue.slice(0, selection.start)}${replacement}${templateValue.slice(selection.end)}`;
    onChange(node.id, nextValue);
    setSelection({ text: '', start: 0, end: 0 });
  };

  return (
    <div className='group/inline-edit space-y-3'>
      <AutoTextarea
        minRows={1}
        value={templateValue}
        onChange={(event) => onChange(node.id, event.target.value)}
        onSelect={handleSelection}
        onKeyUp={handleSelection}
        onMouseUp={handleSelection}
        className='w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-7 text-slate-800 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 group-hover/preview-block:border-amber-200'
      />
      {selection.text.trim() ? (
        <div className='flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2'>
          <p className='min-w-0 truncate text-xs text-amber-800'>
            Selección: <span className='font-semibold'>{selection.text.trim()}</span>
          </p>
          <button
            type='button'
            onClick={handleCreateVariable}
            className='shrink-0 rounded-full border border-amber-300 bg-white px-2.5 py-1 text-[11px] text-amber-800 transition hover:border-amber-400 hover:bg-amber-100'
          >
            Convertir en variable
          </button>
        </div>
      ) : null}
      <div className='rounded-lg border border-dashed border-sky-200 bg-sky-50/70 px-3 py-3'>
        <p className='whitespace-pre-wrap text-sm leading-7 text-slate-800'>{resolved || '[Sin contenido]'}</p>
      </div>
    </div>
  );
}

function mergeObjectValue(currentValue, patch) {
  return {
    ...(currentValue && typeof currentValue === 'object' ? currentValue : {}),
    ...patch
  };
}

function insertTemplateVariable(templateValue, variableKey) {
  const safeTemplate = templateValue || '';
  const token = `{{${variableKey}}}`;
  return safeTemplate.includes(token)
    ? safeTemplate
    : `${safeTemplate}${safeTemplate && !safeTemplate.endsWith(' ') ? ' ' : ''}${token}`;
}

function renderCaptionEditor(node, value, onChange) {
  if (!onChange || !node.hasCaption) return null;

  return (
    <div className='mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2'>
      <label className='block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500'>
        Título visible
      </label>
      <input
        type='text'
        value={value?.caption || ''}
        onChange={(event) => onChange(node.id, mergeObjectValue(value, { caption: event.target.value }))}
        placeholder='Escribe el título o caption'
        className='mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100'
      />
    </div>
  );
}

export function renderPreviewBlock(node, formData, options = {}) {
  const { editableText = false, onEdit, availableVariables = [], onCreateVariable } = options;
  const value = formData[node.id];
  const asDocument = !editableText;

  const renderInlineField = (label, content, extraClassName = '') => (
    <p className={`text-sm leading-7 text-slate-800 ${extraClassName}`.trim()}>
      {label ? <span className='font-semibold text-slate-900'>{label}: </span> : null}
      <span className='whitespace-pre-wrap'>{content}</span>
    </p>
  );

  if (editableText && onEdit && (node.type === 'text' || node.type === 'rich_text')) {
    return renderEditableText(node, value, onEdit);
  }

  if (editableText && onEdit && node.type === 'template_text') {
    const content = (
      <EditableTemplateBlock
        node={node}
        value={value}
        formData={formData}
        onChange={onEdit}
        onCreateVariable={onCreateVariable}
      />
    );
    return (
      <div className='space-y-2'>
        {content}
        {availableVariables.length ? (
          <div className='flex flex-wrap gap-1.5'>
            {availableVariables.slice(0, 8).map((item) => (
              <button
                key={`${node.id}-${item.key}`}
                type='button'
                className='rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700'
                onClick={() => onEdit(node.id, insertTemplateVariable(typeof value === 'string' && value !== '' ? value : (node.template || node.content || ''), item.key))}
              >
                Insertar {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (isBlockValueEmpty(node, value)) {
    if (editableText && onEdit) {
      return <FormField block={node} value={value} />;
    }
    return (
      <p className={asDocument ? 'text-sm italic leading-7 text-rose-700' : 'rounded bg-rose-50 px-2 py-1 text-sm text-rose-700'}>
        [PENDIENTE: {node.label || node.id}]
      </p>
    );
  }

  // For structured types (table, image, variable, latex_graph), show FormField inline when editable
  if (editableText && onEdit && ['table', 'image', 'latex_graph', 'variable'].includes(node.type)) {
    return <FormField block={node} value={value} />;
  }

  if (node.type === 'table') {
    const exportValue = buildTableExportValue(node, value || {});
    const usesStructuredRows = hasStructuredTableRows(exportValue?.rows) || (exportValue?.mergeCells && Object.keys(exportValue.mergeCells).length > 0);

    if (usesStructuredRows) {
      const normalized = normalizeAdvancedTableValue(node, exportValue);
      const visibleRows = getVisibleAdvancedRows(node, normalized);
      const isLandscape = normalized.orientation === 'landscape';
      const columnCount = normalized.rows[0]?.length || 0;
      const columnWidths = getPreviewColumnWidths(exportValue?.sheetConfig, columnCount);

      return (
        <div className='space-y-3 font-serif'>
          <div className={`overflow-x-auto ${isLandscape ? 'bg-slate-50/50 p-2' : ''}`}>
            <table className='border-collapse text-sm bg-white border-t-2 border-b-2 border-slate-800 my-2' style={{ width: '100%', minWidth: isLandscape ? '1000px' : 'auto' }}>
              {columnWidths ? (
                <colgroup>
                  {columnWidths.map((width, index) => (
                    <col key={`${node.id}-col-${index}`} style={width ? { width } : undefined} />
                  ))}
                </colgroup>
              ) : null}
              <tbody>
                {visibleRows.map((row, rowIndex) => (
                  <tr key={`${node.id}-tbl-${rowIndex}`}>
                    {row.map((cell, colIndex) => (
                      <td
                        key={`${node.id}-tbl-${rowIndex}-${colIndex}`}
                        rowSpan={cell.rowSpan}
                        colSpan={cell.colSpan}
                        className={`px-2 py-1.5 ${rowIndex < normalized.headerRows ? 'font-bold text-slate-900 border-b border-slate-800' : 'text-slate-700'} ${rowIndex === visibleRows.length - 1 ? '' : 'border-b border-slate-200'}`}
                        style={getPreviewCellStyle(cell, rowIndex < normalized.headerRows ? 'center' : 'left')}
                      >
                        {cell.value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {normalized.caption ? <p className='text-sm font-semibold'>Tabla: {normalized.caption}</p> : null}
          {normalized.source ? <p className='text-xs text-slate-500'>Fuente: {normalized.source}</p> : null}
          {editableText ? renderCaptionEditor(node, exportValue, onEdit) : null}
        </div>
      );
    }

    const rows = normalizePreviewRows(node, exportValue);
    const columnCount = getTableColumnCount(node, exportValue);
    const headers = Array.isArray(exportValue?.headers) ? exportValue.headers : getEffectiveHeaders(node, exportValue, columnCount);
    const leadingTitleRow = Array.isArray(exportValue?.leadingTitleRow) ? exportValue.leadingTitleRow : null;
    const columnWidths = getPreviewColumnWidths(exportValue?.sheetConfig, columnCount);
    return (
      <div className='space-y-1 font-serif'>
        {exportValue.caption ? <p className='text-sm font-semibold'>Tabla: {exportValue.caption}</p> : null}
        <table className='w-full border-collapse text-sm border-t-2 border-b-2 border-slate-800 my-2'>
          {columnWidths ? (
            <colgroup>
              {columnWidths.map((width, index) => (
                <col key={`${node.id}-plain-col-${index}`} style={width ? { width } : undefined} />
              ))}
            </colgroup>
          ) : null}
          {leadingTitleRow?.[0] || headers.length ? (
            <thead>
              {leadingTitleRow?.[0] && !leadingTitleRow[0].hidden ? (
                <tr>
                  <th className='border-b border-slate-800 px-2 py-1 text-center font-semibold' colSpan={leadingTitleRow[0].colSpan || columnCount}>
                    {getDisplayCellValue(leadingTitleRow[0])}
                  </th>
                </tr>
              ) : null}
              <tr>
                {headers.map((header, index) => (
                  <th key={`${node.id}-${index}-${header}`} className='border-b border-slate-800 px-2 py-1 text-left font-semibold text-slate-900'>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${node.id}-${rowIndex}`}>
                {row.map((cell, colIndex) => (
                  <td
                    key={`${node.id}-${rowIndex}-${colIndex}`}
                    className={`px-2 py-1.5 ${rowIndex === rows.length - 1 ? '' : 'border-b border-slate-100'}`}
                    style={getPreviewCellStyle(cell)}
                  >
                    {getDisplayCellValue(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {exportValue.source ? <p className='text-xs text-slate-500'>Fuente: {exportValue.source}</p> : null}
        {editableText ? renderCaptionEditor(node, exportValue, onEdit) : null}
      </div>
    );
  }

  if (node.type === 'image') {
    return (
      <div className='space-y-2'>
        <img src={value.file} alt={node.label} className='max-h-72 object-contain mx-auto' />
        {value.caption ? <p className='text-sm'>{value.caption}</p> : null}
        {value.source ? <p className='text-xs text-slate-500'>Fuente: {value.source}</p> : null}
        {editableText ? renderCaptionEditor(node, value, onEdit) : null}
      </div>
    );
  }

  if (node.type === 'latex_graph') {
    return <div dangerouslySetInnerHTML={{ __html: renderMath(value || node.content) }} />;
  }

  if (node.type === 'ai_text') {
    return (
      <div>
        {asDocument
          ? renderInlineField(node.label, String(value), 'font-serif text-justify')
          : <p className='text-sm leading-relaxed text-justify font-serif'>{String(value)}</p>}
      </div>
    );
  }

  if (node.type === 'template_text') {
    const templateValue = typeof value === 'string' && value !== '' ? value : (node.template || node.content || '');
    return <p className='whitespace-pre-wrap text-sm leading-relaxed text-justify font-serif'>{interpolate(templateValue, formData)}</p>;
  }

  if (node.type === 'rich_text' || node.type === 'text') {
    return (
      <div 
        className='whitespace-pre-wrap text-sm leading-relaxed prose prose-sm max-w-none text-justify font-serif'
        dangerouslySetInnerHTML={{ __html: String(value || node.content || '') }}
      />
    );
  }

  if (asDocument) {
    return renderInlineField(node.label, String(value), 'font-serif text-justify');
  }

  return <p className='text-sm leading-relaxed text-justify font-serif'>{String(value)}</p>;
}

export function renderPreviewNode(node, formData, prefix = [], trail = [], options = {}) {
  if (node.isStructure) {
    const level = Math.max(1, Math.min(3, prefix.length || 1));
    const HeadingTag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
    const inlineCandidate = node.sectionTextMode === 'inline'
      ? (node.children || []).find((child) => !child?.isStructure && ['text', 'rich_text', 'template_text', 'variable'].includes(child?.type))
      : null;
    const inlineChildren = inlineCandidate ? (node.children || []).filter((child) => child.id !== inlineCandidate.id) : (node.children || []);

    if (!options.editableText) {
      const headingClassName = level === 1
        ? 'mt-8 border-b border-slate-300 pb-2 text-[18px] font-bold uppercase tracking-[0.01em] text-slate-900 font-serif'
        : level === 2
          ? 'mt-6 text-[16px] font-bold text-slate-900 font-serif'
          : 'mt-5 text-[14px] font-semibold text-slate-900 font-serif';
      const contentClassName = level === 1
        ? 'mt-4 space-y-4'
        : level === 2
          ? 'mt-3 space-y-3 pl-4'
          : 'mt-3 space-y-3 pl-7';

      return (
        <div key={node.id} id={`preview-section-${node.id}`} className='scroll-mt-24'>
          {inlineCandidate ? (
            <p className={headingClassName}>
              <span className='mr-2'>{prefix.join('.')}.</span>
              <span>{node.title}:</span>{' '}
              <span className='font-normal normal-case tracking-normal text-slate-700' dangerouslySetInnerHTML={{ __html: String(formData[inlineCandidate.id] || inlineCandidate.content || '') }} />
            </p>
          ) : (
            <HeadingTag className={headingClassName}>
              <span className='mr-2'>{prefix.join('.')}.</span>
              <span>{node.title}</span>
            </HeadingTag>
          )}
          <div className={contentClassName}>
            {inlineChildren.map((child, index) => renderPreviewNode(child, formData, [...prefix, index + 1], trail, options))}
          </div>
        </div>
      );
    }

    const nextTrail = [...trail, node.title];
    return (
      <section
        key={node.id}
        id={`preview-section-${node.id}`}
        className={options.editableText ? 'mt-6 px-1 py-1' : 'mt-6'}
      >
        <div className='flex flex-wrap items-center gap-2'>
          {options.editableText ? <span className='text-xs font-semibold text-slate-400'>{prefix.join('.')}</span> : null}
          {options.editableText && options.updateNodeProps ? (
            <input
              type='text'
              value={node.title || ''}
              onChange={(event) => options.updateNodeProps(node.id, { title: event.target.value })}
              onFocus={() => options.setSelectedId?.(node.id)}
              className='min-w-[220px] flex-1 border border-transparent bg-transparent px-1 py-0.5 text-xl font-bold text-slate-900 outline-none transition hover:border-slate-200 focus:border-sky-300 focus:ring-1 focus:ring-sky-100'
            />
          ) : (
            <h2 className='text-xl font-bold text-slate-900'>{node.title}</h2>
          )}
        </div>
        {inlineCandidate ? (
          <div className='mt-2 pl-6'>
            {renderPreviewBlock(inlineCandidate, formData, options)}
          </div>
        ) : null}
        <div className={options.editableText ? 'mt-2 space-y-2' : 'mt-3 space-y-4'}>
          {inlineChildren.map((child, index) => renderPreviewNode(child, formData, [...prefix, index + 1], nextTrail, options))}
        </div>
      </section>
    );
  }

  return (
    <article
      id={`preview-block-${node.id}`}
      key={node.id}
      className={options.editableText
        ? 'group/preview-block scroll-mt-24 space-y-1.5 border-l border-transparent pl-4 transition hover:border-slate-200'
        : 'scroll-mt-24 border-l border-slate-200 pl-4'}
    >
      {options.editableText && !['text', 'rich_text', 'template_text'].includes(node.type) ? (
        <div className='flex items-start justify-between gap-3'>
          {options.updateNodeProps ? (
            <input
              type='text'
              value={node.label || ''}
              onChange={(event) => options.updateNodeProps(node.id, { label: event.target.value })}
              onFocus={() => options.setSelectedId?.(node.id)}
              className='w-full max-w-xl border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-200 focus:border-sky-300 focus:ring-1 focus:ring-sky-100'
            />
          ) : (
            <h3 className='text-sm font-semibold text-slate-700'>{node.label || node.id}</h3>
          )}
          <button
            type='button'
            className='shrink-0 border border-transparent px-2 py-0.5 text-[11px] text-slate-400 opacity-0 transition group-hover/preview-block:opacity-100 hover:border-slate-200 hover:text-slate-600'
            onClick={() => {
              options.setSelectedId?.(node.id);
              document.getElementById(`preview-block-${node.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
          >
            Seleccionar
          </button>
        </div>
      ) : null}
      {renderPreviewBlock(node, formData, options)}
    </article>
  );
}
