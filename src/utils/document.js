import { nanoid } from 'nanoid';

export const newSectionId = () => `sec_${nanoid(8)}`;
export const newBlockId = () => `var_${nanoid(8)}`;

export function normalizeBlockType(type) {
  if (type === 'input') return 'variable';
  if (type === 'math') return 'latex_graph';
  if (type === 'advanced_table') return 'table';
  if (type === 'rich_text' || type === 'template_text') return type;
  return type || 'text';
}

export function deepClone(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

export function cloneDocumentNode(node) {
  if (!node) return null;
  const clone = deepClone(node);
  
  if (clone.isStructure) {
    clone.id = newSectionId();
    clone.children = (clone.children || []).map(cloneDocumentNode);
  } else {
    clone.id = newBlockId();
    // If it is a native variable type, we might want to link them? But user says "se repite".
    // For now we assign a new ID. The variableKey can be optionally linked, 
    // but the user's focus is on reusing "structures/tables/images".
    if (clone.type === 'variable') {
      clone.variableKey = clone.id;
    }
  }
  return clone;
}

export function normalizeDocumentNodes(nodes) {
  return (nodes || []).map((node) => {
    if (node?.isStructure) {
      return {
        ...node,
        sectionTextMode: node.sectionTextMode === 'inline' ? 'inline' : 'block',
        children: node.children ? normalizeDocumentNodes(node.children) : []
      };
    }

    const nextType = normalizeBlockType(node?.type);
    const nextNode = {
      ...node,
      type: nextType
    };

    if (nextType === 'ai_text') {
      nextNode.promptTemplate = node.promptTemplate || node.promptIA || '';
      nextNode.inputVariables = Array.isArray(node.inputVariables) ? node.inputVariables : [];
      nextNode.generationMode = node.generationMode || 'manual';
    }

    if (nextType === 'variable') {
      nextNode.variableKey = node.variableKey || node.id || '';
      nextNode.variableScope = node.variableScope || 'document';
      nextNode.inputType = node.inputType || 'text';
      nextNode.inputPlaceholder = node.inputPlaceholder || '';
      nextNode.inputOptions = Array.isArray(node.inputOptions) ? node.inputOptions : [];
    }

    if (nextType === 'template_text') {
      nextNode.template = node.template || node.content || '';
      nextNode.templateMode = node.templateMode || 'inline';
    }

    if (nextType === 'latex_graph') {
      nextNode.mathType = node.mathType || 'block';
      nextNode.mathVariables = Array.isArray(node.mathVariables) ? node.mathVariables : [];
    }

    if (nextType === 'table') {
      nextNode.columnCount = Math.max(1, Number(node.columnCount) || 4);
      nextNode.columnHeaders = Array.isArray(node.columnHeaders)
        ? node.columnHeaders
        : Array.from({ length: nextNode.columnCount }, (_, index) => `Col ${index + 1}`);
      nextNode.columnAlign = Array.isArray(node.columnAlign)
        ? node.columnAlign
        : Array.from({ length: nextNode.columnCount }, () => 'L');
      nextNode.tableStyle = node.tableStyle || 'booktabs';
      nextNode.tableEnvironment = node.tableEnvironment || 'auto';
      nextNode.orientation = node.orientation === 'landscape' ? 'landscape' : 'portrait';
      nextNode.repeatHeader = node.repeatHeader !== false;
      nextNode.headerRows = Math.max(1, Number(node.headerRows) || 1);
      nextNode.hasCaption = node.hasCaption !== false;
      nextNode.hasSource = node.hasSource !== false;
      nextNode.hasDescription = node.hasDescription !== false;
      nextNode.hasLabel = node.hasLabel !== false;
    }

    if (nextType === 'text' || nextType === 'rich_text') {
      nextNode.promptIA = node.promptIA || '';
    }

    return nextNode;
  });
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
      sectionTextMode: 'block',
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
      columnCount: 4,
      columnHeaders: ['Col 1', 'Col 2', 'Col 3', 'Col 4'],
      columnAlign: ['L', 'L', 'C', 'R'],
      tableStyle: 'booktabs',
      tableEnvironment: 'auto',
      orientation: 'portrait',
      repeatHeader: true,
      headerRows: 1,
      hasCaption: true,
      hasSource: true,
      hasDescription: true,
      hasLabel: true
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

  if (type === 'latex_graph' || type === 'math') {
    return {
      ...base,
      type: 'latex_graph',
      label: 'Nueva formula',
      content: 'a^2 + b^2 = c^2',
      mathType: 'block',
      mathVariables: ['a', 'b', 'c']
    };
  }

  if (type === 'variable' || type === 'input') {
    const id = newBlockId();
    return {
      ...base,
      id,
      type: 'variable',
      label: 'Nueva variable',
      variableKey: id,
      variableScope: 'document',
      inputType: 'text',
      inputPlaceholder: '',
      inputOptions: []
    };
  }

  if (type === 'template_text') {
    return {
      ...base,
      type: 'template_text',
      label: 'Nuevo texto plantilla',
      content: 'La obra se ejecutara en {{var_ubicacion}}.',
      template: 'La obra se ejecutara en {{var_ubicacion}}.',
      templateMode: 'inline'
    };
  }

  if (type === 'rich_text') {
    return {
      ...base,
      type: 'rich_text',
      label: 'Texto',
      content: '',
      promptIA: ''
    };
  }

  if (type === 'ai_text') {
    return {
      ...base,
      type: 'ai_text',
      label: 'Nuevo texto IA',
      content: 'Genera un texto editable a partir de variables del documento.',
      promptTemplate: 'Redacta {{var_contexto}} con tono tecnico y profesional.',
      inputVariables: [],
      generationMode: 'manual'
    };
  }

  return {
    ...base,
    type: 'text',
    label: 'Texto',
    content: '',
    promptIA: ''
  };
}
