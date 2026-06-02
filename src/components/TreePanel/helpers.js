export function getTreeDropPosition(pointerY, rect, isStructure) {
  if (pointerY == null || !rect) return 'below';
  const relY = (pointerY - rect.top) / rect.height;

  if (!isStructure) {
    return relY < 0.5 ? 'above' : 'below';
  }

  if (relY < 0.25) return 'above';
  if (relY > 0.75) return 'below';
  return 'inside';
}

export function filterStructureTree(nodes, normalizedQuery) {
  if (!normalizedQuery) return nodes;

  const filterTree = (items) => {
    const next = [];
    (items || []).forEach((node) => {
      if (!node?.isStructure) {
        const ownMatch = `${node?.label || ''} ${node?.type || ''}`.toLowerCase().includes(normalizedQuery);
        if (ownMatch) {
          next.push(node);
        }
        return;
      }
      const children = filterTree(node.children || []);
      const ownMatch = String(node.title || '').toLowerCase().includes(normalizedQuery);
      if (ownMatch || children.length) {
        next.push({ ...node, children });
      }
    });
    return next;
  };

  return filterTree(nodes);
}
