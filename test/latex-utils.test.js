import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProgress, interpolate, isBlockValueEmpty, isValueEmpty, normalizeTableRows } from '../src/utils/latex.js';
import { renderTable, resolveTableEnvironment } from '../src/utils/latex/tables.js';

test('isBlockValueEmpty treats image payload without file as empty', () => {
  const block = { type: 'image' };
  assert.equal(isBlockValueEmpty(block, { caption: 'Plano principal' }), true);
  assert.equal(isBlockValueEmpty(block, { file: 'https://example.com/plano.png' }), false);
});

test('isValueEmpty treats tables with only blank cells as empty', () => {
  assert.equal(isValueEmpty({ rows: [['', '  ']] }), true);
  assert.equal(isValueEmpty({ rows: [['dato', '']] }), false);
});

test('calculateProgress only counts truly filled complex required fields', () => {
  const structure = [
    {
      id: 'sec_1',
      isStructure: true,
      level: 1,
      title: 'Base',
      children: [
        { id: 'var_img', isStructure: false, type: 'image', label: 'Plano', required: true },
        { id: 'var_tbl', isStructure: false, type: 'table', label: 'Resultados', required: true }
      ]
    }
  ];

  assert.equal(
    calculateProgress(structure, {
      var_img: { caption: 'sin archivo' },
      var_tbl: { rows: [['', '']] }
    }),
    0
  );

  assert.equal(
    calculateProgress(structure, {
      var_img: { file: 'https://example.com/plano.png' },
      var_tbl: { rows: [['ok', '']] }
    }),
    100
  );
});

test('normalizeTableRows trims trailing empty cells but preserves filled overflow columns', () => {
  assert.deepEqual(
    normalizeTableRows(
      { columnCount: 3, columnHeaders: ['A', 'B', 'C'] },
      { rows: [['1', '', '', ''], ['2', '3', '4', '5']] }
    ),
    [
      ['1', '', '', ''],
      ['2', '3', '4', '5']
    ]
  );
});

test('normalizeTableRows drops trailing empty rows but keeps non-empty rows', () => {
  assert.deepEqual(
    normalizeTableRows(
      { columnCount: 5, columnHeaders: ['A', 'B', 'C', 'D', 'E'] },
      {
        rows: [
          ['1', '2', '', '', ''],
          ['3', '', '', '', ''],
          ['', '', '', '', ''],
          ['', '', '', '', '']
        ]
      }
    ),
    [
      ['1', '2', '', '', ''],
      ['3', '', '', '', '']
    ]
  );
});

test('isValueEmpty keeps generic object semantics for non-typed usage', () => {
  assert.equal(isValueEmpty({ caption: 'sin archivo' }), false);
});

test('template_text is not treated as empty when it has a built-in template', () => {
  assert.equal(
    isBlockValueEmpty(
      { type: 'template_text', template: 'La obra esta en {{var_distrito}}.' },
      undefined
    ),
    false
  );
});

test('interpolate resolves generic variable keys, not only block ids', () => {
  assert.equal(
    interpolate('Distrito: {{var_distrito}}', { var_distrito: 'Cayma' }),
    'Distrito: Cayma'
  );
});

test('renderTable ignores invalid merge references without throwing', () => {
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args);

  try {
    const latex = renderTable(
      { columnCount: 3, columnHeaders: ['A', 'B', 'C'] },
      {
        rows: [['1', '2', '3']],
        mergeCells: {
          BAD: [2, 1],
          Z9: [2, 2]
        }
      }
    );

    assert.match(latex, /\\begin\{tabular\}/);
  } finally {
    console.warn = originalWarn;
  }

  assert.ok(Array.isArray(warnings));
});

test('renderTable keeps medium tables in portrait when estimated width is moderate', () => {
  const latex = renderTable(
    {
      columnCount: 5,
      columnHeaders: ['Item', 'Unidad', 'Cantidad', 'Precio', 'Total']
    },
    {
      rows: [
        ['Concreto', 'm3', '12', '350', '4200'],
        ['Acero', 'kg', '50', '4.5', '225']
      ]
    }
  );

  assert.doesNotMatch(latex, /\\begin\{landscape\}/);
  assert.match(latex, /\\begin\{table\}/);
});

test('renderTable compresses vertically before using landscape for wide five-column tables', () => {
  const latex = renderTable(
    {
      columnCount: 5,
      columnHeaders: ['Progresiva', 'Lado', 'Distancia (m)', 'Coordenada Este (X)', 'Coordenada Norte (Y)']
    },
    {
      rows: [
        ['Cuadro de datos tecnicos', '', '', '', ''],
        ['P1', 'P1-P2', '171.16', '444032.388', '8670844.071'],
        ['P2', 'P2-P3', '117.34', '444131.6764', '8670983.4929'],
        ['P3', 'P3-P4', '7.71', '444226.345', '8670914.166'],
        ['P4', 'P4-P5', '53.92', '444227.2185', '8670906.5099'],
        ['P5', 'P5-P6', '53.07', '444212.1239', '8670854.7437'],
        ['P6', 'P6-P7', '53.14', '444191.656', '8670805.781'],
        ['P7', 'P7-P8', '5.6', '444157.2232', '8670761.4448'],
        ['P8', 'P8-P1', '150.28', '444154.5419', '8670756.5307'],
        ['Servidumbre: 16 m (8 m a cada lado del eje)', '', '', '', '']
      ]
    }
  );

  assert.doesNotMatch(latex, /\\begin\{landscape\}/);
  assert.match(latex, /\\(?:footnotesize|scriptsize|tiny)/);
});

test('renderTable infers full-row merge for rows with only the first filled cell', () => {
  const latex = renderTable(
    {
      columnCount: 5,
      columnHeaders: ['Progresiva', 'Lado', 'Distancia', 'Este', 'Norte']
    },
    {
      rows: [
        ['Cuadro de datos tecnicos', '', '', '', ''],
        ['P1', 'P1-P2', '171.16', '444032.388', '8670844.071'],
        ['Longitud: 612.22 m', '', '', '', '']
      ]
    }
  );

  assert.match(latex, /\\multicolumn\{5\}\{.*?\}\{\\textbf\{Cuadro de datos tecnicos\}\}/);
  assert.match(latex, /\\multicolumn\{5\}\{.*?\}\{Longitud: 612\.22 m\}/);
});

test('renderTable drops trailing empty rows from simple tables', () => {
  const latex = renderTable(
    {
      columnCount: 5,
      columnHeaders: ['Progresiva', 'Lado', 'Distancia', 'Este', 'Norte']
    },
    {
      rows: [
        ['P1', 'P1-P2', '171.16', '444032.388', '8670844.071'],
        ['Longitud: 612.22 m', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', '']
      ]
    }
  );

  assert.doesNotMatch(latex, / & \{\\centering \} & \{\\raggedleft \} & \{\\raggedleft \} & \{\\raggedleft \} \\\\/);
});

test('resolveTableEnvironment uses configured thresholds consistently', () => {
  assert.equal(resolveTableEnvironment(8, 5), 'sidewaystable');
  assert.equal(resolveTableEnvironment(3, 31), 'longtable');
});
