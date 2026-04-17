import { isBlockValueEmpty } from './tables.js';

export function getAllBlocks(nodes) {
  const blocks = [];
  const walk = (list) => {
    list.forEach((node) => {
      if (node.isStructure) {
        walk(node.children || []);
      } else {
        blocks.push(node);
      }
    });
  };
  walk(nodes || []);
  return blocks;
}

export function getRequiredBlocks(nodes) {
  return getAllBlocks(nodes).filter((node) => Boolean(node.required));
}

export function calculateProgress(structure, formData) {
  const required = getRequiredBlocks(structure);
  if (!required.length) return 100;
  const filled = required.filter((block) => !isBlockValueEmpty(block, formData?.[block.id]));
  return Math.round((filled.length / required.length) * 100);
}
