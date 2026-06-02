import { deepClone } from '../document.js';

// Immutable helpers for tree manipulation to avoid deepClone overhead

export function findNodeParentArray(nodes, id) {
  for (let i = 0; i < (nodes || []).length; i += 1) {
    if (nodes[i].id === id) {
      return { array: nodes, index: i };
    }
    if (nodes[i].children?.length) {
      const found = findNodeParentArray(nodes[i].children, id);
      if (found) return found;
    }
  }
  return null;
}

export function insertNodeImmutably(nodes, targetId, newNode, position) {
  if (!nodes) return [];

  // Check if the target is at the current level
  const index = nodes.findIndex((n) => n.id === targetId);
  
  if (index !== -1) {
    if (position === 'above') {
      const nextNodes = [...nodes];
      nextNodes.splice(index, 0, newNode);
      return nextNodes;
    } else if (position === 'below') {
      const nextNodes = [...nodes];
      nextNodes.splice(index + 1, 0, newNode);
      return nextNodes;
    } else if (position === 'inside') {
      const nextNodes = [...nodes];
      const targetNode = nextNodes[index];
      nextNodes[index] = {
        ...targetNode,
        children: [...(targetNode.children || []), newNode],
        canvasExpanded: true
      };
      return nextNodes;
    }
  }

  // If not at the current level, recurse down the tree
  return nodes.map((node) => {
    if (node.children?.length) {
      const itIsInChild = findNodeParentArray(node.children, targetId);
      if (itIsInChild) {
        return {
          ...node,
          children: insertNodeImmutably(node.children, targetId, newNode, position)
        };
      }
    }
    return node;
  });
}

// Moves a node from source to target without deep cloning the entire tree.
// It removes the source node and then inserts it.
export function moveNodeImmutably(nodes, dragId, targetId, position, fixLevelFn) {
  // First, find and extract the dragged node
  let draggedNode = null;
  
  const removeDragged = (items) => {
    let result = [];
    for (const item of items) {
      if (item.id === dragId) {
        draggedNode = item;
      } else {
        if (item.children?.length) {
          result.push({ ...item, children: removeDragged(item.children) });
        } else {
          result.push(item);
        }
      }
    }
    return result;
  };
  
  const withoutDragged = removeDragged(nodes);
  if (!draggedNode) return nodes;

  // Insert it back
  const insertDragged = (items, parentStructureLevel = 0) => {
    let result = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.id === targetId) {
        const siblingLevel = item.isStructure ? (item.level || 1) : Math.max(1, parentStructureLevel + 1);
        if (position === 'above') {
          result.push(fixLevelFn(draggedNode, siblingLevel));
          result.push(item);
        } else if (position === 'below') {
          result.push(item);
          result.push(fixLevelFn(draggedNode, siblingLevel));
        } else if (position === 'inside') {
          const desiredLevel = (item.level || 1) + 1;
          result.push({
            ...item,
            children: [...(item.children || []), fixLevelFn(draggedNode, desiredLevel)],
            canvasExpanded: true
          });
        }
      } else {
        if (item.children?.length) {
          const childHasTarget = findNodeParentArray(item.children, targetId);
          if (childHasTarget) {
            result.push({
              ...item,
              children: insertDragged(item.children, item.isStructure ? (item.level || parentStructureLevel) : parentStructureLevel)
            });
          } else {
            result.push(item);
          }
        } else {
          result.push(item);
        }
      }
    }
    return result;
  };

  // If target is root level 'above' or 'below' and it's handled in the loop:
  const finalTree = insertDragged(withoutDragged, 0);
  
  return finalTree;
}
