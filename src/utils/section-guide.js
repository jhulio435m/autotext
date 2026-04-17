import { isBlockValueEmpty } from './latex';

function countRequiredStats(nodes, formData) {
  return (nodes || []).reduce(
    (acc, node) => {
      if (node?.isStructure) {
        const childStats = countRequiredStats(node.children || [], formData);
        return {
          required: acc.required + childStats.required,
          completed: acc.completed + childStats.completed
        };
      }

      if (!node?.required) {
        return acc;
      }

      const completed = isBlockValueEmpty(node, formData?.[node.id]) ? 0 : 1;
      return {
        required: acc.required + 1,
        completed: acc.completed + completed
      };
    },
    { required: 0, completed: 0 }
  );
}

export function buildSectionGuide(nodes, formData, prefix = [], trail = []) {
  return (nodes || []).flatMap((node, index) => {
    if (!node?.isStructure) return [];

    const currentPrefix = [...prefix, index + 1];
    const currentTrail = [...trail, node.title || 'Sección'];
    const stats = countRequiredStats(node.children || [], formData);

    return [
      {
        id: node.id,
        title: node.title || 'Sección',
        depth: trail.length,
        prefix: currentPrefix,
        trail: currentTrail,
        required: stats.required,
        completed: stats.completed,
        pending: Math.max(0, stats.required - stats.completed)
      },
      ...buildSectionGuide(node.children || [], formData, currentPrefix, currentTrail)
    ];
  });
}

