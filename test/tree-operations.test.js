import test from 'node:test';
import assert from 'node:assert/strict';

import { moveNodeImmutably } from '../src/utils/document/tree-operations.js';

function normalizeLevel(node, level) {
  if (!node.isStructure) return node;
  return {
    ...node,
    level,
    children: (node.children || []).map((child) => normalizeLevel(child, child.isStructure ? level + 1 : level + 1))
  };
}

test('moveNodeImmutably keeps section sibling level when dropping above a non-structure block', () => {
  const structure = [
    {
      id: 'sec-root',
      isStructure: true,
      level: 1,
      title: 'Root',
      children: [
        {
          id: 'sec-sub',
          isStructure: true,
          level: 2,
          title: 'Sub',
          children: [
            { id: 'blk-text', isStructure: false, type: 'text', label: 'Texto' }
          ]
        }
      ]
    },
    {
      id: 'sec-drag',
      isStructure: true,
      level: 1,
      title: 'Drag',
      children: [
        {
          id: 'sec-child',
          isStructure: true,
          level: 2,
          title: 'Child',
          children: []
        }
      ]
    }
  ];

  const next = moveNodeImmutably(structure, 'sec-drag', 'blk-text', 'above', normalizeLevel);
  const moved = next[0].children[0].children[0];

  assert.equal(moved.id, 'sec-drag');
  assert.equal(moved.level, 3);
  assert.equal(moved.children[0].level, 4);
});

test('moveNodeImmutably keeps section sibling level when dropping below a non-structure block', () => {
  const structure = [
    {
      id: 'sec-root',
      isStructure: true,
      level: 1,
      title: 'Root',
      children: [
        {
          id: 'sec-sub',
          isStructure: true,
          level: 2,
          title: 'Sub',
          children: [
            { id: 'blk-a', isStructure: false, type: 'text', label: 'A' },
            { id: 'blk-b', isStructure: false, type: 'text', label: 'B' }
          ]
        }
      ]
    },
    {
      id: 'sec-drag',
      isStructure: true,
      level: 1,
      title: 'Drag',
      children: [
        { id: 'sec-child', isStructure: true, level: 2, title: 'Child', children: [] }
      ]
    }
  ];

  const next = moveNodeImmutably(structure, 'sec-drag', 'blk-a', 'below', normalizeLevel);
  const children = next[0].children[0].children;

  assert.equal(children[1].id, 'sec-drag');
  assert.equal(children[1].level, 3);
  assert.equal(children[1].children[0].level, 4);
});

test('moveNodeImmutably increments section level and preserves descendants when dropping inside a section', () => {
  const structure = [
    {
      id: 'sec-root',
      isStructure: true,
      level: 1,
      title: 'Root',
      children: [
        { id: 'sec-target', isStructure: true, level: 2, title: 'Target', children: [] }
      ]
    },
    {
      id: 'sec-drag',
      isStructure: true,
      level: 1,
      title: 'Drag',
      children: [
        {
          id: 'sec-child',
          isStructure: true,
          level: 2,
          title: 'Child',
          children: [
            { id: 'sec-grandchild', isStructure: true, level: 3, title: 'Grandchild', children: [] }
          ]
        }
      ]
    }
  ];

  const next = moveNodeImmutably(structure, 'sec-drag', 'sec-target', 'inside', normalizeLevel);
  const moved = next[0].children[0].children[0];

  assert.equal(moved.id, 'sec-drag');
  assert.equal(moved.level, 3);
  assert.equal(moved.children[0].level, 4);
  assert.equal(moved.children[0].children[0].level, 5);
});

test('moveNodeImmutably keeps non-structure block unchanged when dropping inside a section', () => {
  const structure = [
    {
      id: 'sec-root',
      isStructure: true,
      level: 1,
      title: 'Root',
      children: [
        { id: 'sec-target', isStructure: true, level: 2, title: 'Target', children: [] }
      ]
    },
    {
      id: 'blk-drag',
      isStructure: false,
      type: 'text',
      label: 'Texto movible'
    }
  ];

  const next = moveNodeImmutably(structure, 'blk-drag', 'sec-target', 'inside', normalizeLevel);
  const moved = next[0].children[0].children[0];

  assert.equal(moved.id, 'blk-drag');
  assert.equal(moved.isStructure, false);
  assert.equal(moved.type, 'text');
});
