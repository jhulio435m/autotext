export function getFallbackPointerY(activatorEvent) {
  if (!activatorEvent) return null;
  if (typeof activatorEvent.clientY === 'number') return activatorEvent.clientY;
  if (activatorEvent.touches?.[0]?.clientY) return activatorEvent.touches[0].clientY;
  if (activatorEvent.changedTouches?.[0]?.clientY) return activatorEvent.changedTouches[0].clientY;
  return null;
}

export function getEventPointerY(event) {
  const translated = event?.active?.rect?.current?.translated;
  if (translated && typeof translated.top === 'number' && typeof translated.height === 'number') {
    return translated.top + translated.height / 2;
  }
  return getFallbackPointerY(event?.activatorEvent);
}

export function getDropPosition(pointerY, rect, isStructure) {
  if (pointerY == null || !rect) return 'below';
  const relY = (pointerY - rect.top) / rect.height;

  if (!isStructure) {
    return relY < 0.5 ? 'above' : 'below';
  }

  if (relY < 0.25) return 'above';
  if (relY > 0.75) return 'below';
  return 'inside';
}

export function flattenVisible(nodes, depth = 0, numbering = [], sectionTrail = [], depthTrail = [], acc = []) {
  (nodes || []).forEach((node, index, arr) => {
    const currentNumbering = [...numbering, index + 1];
    const nextSectionTrail = node.isStructure
      ? [...sectionTrail, node.title || 'Seccion']
      : sectionTrail;
    const currentDepthTrail = [...depthTrail, index === arr.length - 1];

    acc.push({
      node,
      depth,
      numbering: currentNumbering,
      sectionTrail: nextSectionTrail,
      depthTrail: currentDepthTrail,
      isFirstRoot: depth === 0 && index === 0
    });

    if (node.isStructure && node.canvasExpanded && node.children?.length) {
      flattenVisible(node.children, depth + 1, currentNumbering, nextSectionTrail, currentDepthTrail, acc);
    }
  });
  return acc;
}
