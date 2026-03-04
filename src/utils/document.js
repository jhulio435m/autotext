import { nanoid } from 'nanoid';

export const newSectionId = () => `sec_${nanoid(8)}`;
export const newBlockId = () => `var_${nanoid(8)}`;

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function reassignAllIds(nodes) {
  return (nodes || []).map((node) => {
    const nextId = node.isStructure ? newSectionId() : newBlockId();
    return {
      ...node,
      id: nextId,
      children: node.children ? reassignAllIds(node.children) : undefined
    };
  });
}

export function flattenNodes(nodes) {
  const list = [];
  const walk = (items) => {
    (items || []).forEach((node) => {
      list.push(node);
      if (node.children?.length) walk(node.children);
    });
  };
  walk(nodes);
  return list;
}

export function createNode(type, level = 1) {
  if (type === 'section') {
    return {
      id: newSectionId(),
      isStructure: true,
      level,
      title: 'Nueva seccion',
      expanded: true,
      canvasExpanded: true,
      children: []
    };
  }

  const base = {
    id: newBlockId(),
    isStructure: false,
    label: 'Nuevo bloque',
    content: '',
    required: false,
    hasCaption: false,
    hasDescription: false,
    hasSource: false,
    hasLabel: false
  };

  if (type === 'table') {
    return {
      ...base,
      type,
      label: 'Nueva tabla',
      columnCount: 3,
      columnHeaders: ['Col 1', 'Col 2', 'Col 3'],
      columnAlign: ['L', 'C', 'R'],
      tableStyle: 'simple',
      tableEnvironment: 'auto'
    };
  }

  if (type === 'image') {
    return {
      ...base,
      type,
      label: 'Nueva imagen',
      width: 'full',
      float: true,
      hasCaption: true,
      hasSource: true
    };
  }

  if (type === 'math') {
    return {
      ...base,
      type,
      label: 'Nueva formula',
      content: 'a^2 + b^2 = c^2',
      mathType: 'block',
      mathVariables: ['a', 'b', 'c']
    };
  }

  if (type === 'input') {
    return {
      ...base,
      type,
      label: 'Nueva variable',
      inputType: 'text',
      inputPlaceholder: '',
      inputOptions: []
    };
  }

  return {
    ...base,
    type: 'text',
    label: 'Nuevo texto',
    content: 'Describe el contenido que se espera del usuario.',
    promptIA: ''
  };
}
