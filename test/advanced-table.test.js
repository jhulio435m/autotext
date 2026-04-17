import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdvancedTableValue,
  mergeAdvancedTableRight,
  normalizeAdvancedTableValue,
  splitAdvancedTableCell
} from '../src/utils/advancedTable.js';
import { isBlockValueEmpty } from '../src/utils/latex.js';

test('advanced table can merge and split cells horizontally', () => {
  const block = { type: 'advanced_table', columnCount: 3 };
  const initial = createAdvancedTableValue(block);
  const merged = mergeAdvancedTableRight(block, initial, 0, 0);

  assert.equal(merged.rows[0][0].colSpan, 2);
  assert.equal(merged.rows[0][1].hidden, true);

  const split = splitAdvancedTableCell(block, merged, 0, 0);
  assert.equal(split.rows[0][0].colSpan, 1);
  assert.equal(split.rows[0][1].hidden, false);
});

test('advanced table emptiness depends on visible cells', () => {
  const block = { type: 'advanced_table', columnCount: 2 };
  const value = normalizeAdvancedTableValue(block, {
    rows: [[{ value: '' }, { value: '' }]]
  });

  assert.equal(isBlockValueEmpty(block, value), true);

  value.rows[0][0].value = 'Dato';
  const normalized = normalizeAdvancedTableValue(block, value);
  assert.equal(isBlockValueEmpty(block, normalized), false);
});
