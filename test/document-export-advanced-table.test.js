import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDocumentLatex } from '../server/document-export.js';

test('generateDocumentLatex keeps legacy advanced tables compatible through unified table export', () => {
  const tex = generateDocumentLatex({
    documentName: 'Expediente',
    structure: [
      {
        id: 'sec_1',
        isStructure: true,
        level: 1,
        title: 'Metrados',
        children: [
          {
            id: 'var_tbl',
            isStructure: false,
            type: 'advanced_table',
            label: 'Cuadro principal',
            columnCount: 3,
            columnHeaders: ['A', 'B', 'C'],
            columnAlign: ['L', 'L', 'L']
          }
        ]
      }
    ],
    formData: {
      var_tbl: {
        orientation: 'landscape',
        repeatHeader: true,
        headerRows: 1,
        caption: 'Cuadro de prueba',
        rows: [
          [{ value: 'Cabecera', colSpan: 3 }],
          [{ value: '1' }, { value: 'Partida' }, { value: '10.0' }]
        ]
      }
    },
    coverData: {}
  });

  assert.match(tex, /\\begin\{landscape\}/);
  assert.match(tex, /\\multicolumn\{3\}\{.*?\}\s*\{\\textbf\{Cabecera\}\}/);
  assert.match(tex, /Cuadro de prueba/);
});
