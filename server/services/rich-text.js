import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'blockquote',
  'pre',
  'code',
  'h1',
  'h2',
  'h3',
  'h4',
  'span'
];

const ALLOWED_ATTRIBUTES = {
  span: ['data-type', 'id']
};

function isRichTextBlock(node) {
  return ['text', 'rich_text', 'template_text', 'ai_text'].includes(String(node?.type || ''));
}

function sanitizeSpanAttributes(tagName, attribs) {
  if (tagName !== 'span') return { tagName, attribs };
  if (attribs['data-type'] !== 'variable') {
    return { tagName: 'span', attribs: {} };
  }

  const nextId = String(attribs.id || '').trim();
  if (!/^[A-Za-z0-9_:-]{1,120}$/.test(nextId)) {
    return { tagName: 'span', attribs: {} };
  }

  return {
    tagName: 'span',
    attribs: {
      'data-type': 'variable',
      id: nextId
    }
  };
}

export function sanitizeRichTextHtml(value) {
  if (typeof value !== 'string' || !value.trim()) return '';

  return sanitizeHtml(value, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: [],
    disallowedTagsMode: 'discard',
    parser: {
      lowerCaseTags: true
    },
    transformTags: {
      span: sanitizeSpanAttributes
    }
  });
}

function sanitizeStructureNode(node) {
  if (!node || typeof node !== 'object') return node;

  const nextNode = Array.isArray(node) ? node.slice() : { ...node };

  if (isRichTextBlock(nextNode)) {
    if (typeof nextNode.content === 'string') {
      nextNode.content = sanitizeRichTextHtml(nextNode.content);
    }
    if (typeof nextNode.template === 'string') {
      nextNode.template = sanitizeRichTextHtml(nextNode.template);
    }
  }

  if (Array.isArray(nextNode.children)) {
    nextNode.children = nextNode.children.map(sanitizeStructureNode);
  }

  return nextNode;
}

function collectRichTextBlockIds(nodes, bucket = new Set()) {
  (nodes || []).forEach((node) => {
    if (!node || typeof node !== 'object') return;
    if (isRichTextBlock(node) && node.id) {
      bucket.add(String(node.id));
    }
    if (Array.isArray(node.children)) {
      collectRichTextBlockIds(node.children, bucket);
    }
  });
  return bucket;
}

export function sanitizeWorkspaceRichText(rawWorkspace = {}) {
  const projects = Array.isArray(rawWorkspace.projects) ? rawWorkspace.projects : [];
  const documents = rawWorkspace.documents && typeof rawWorkspace.documents === 'object' ? rawWorkspace.documents : {};
  const coverConfig = rawWorkspace.coverConfig && typeof rawWorkspace.coverConfig === 'object' ? rawWorkspace.coverConfig : {};

  const nextDocuments = {};

  for (const [projectId, projectDocuments] of Object.entries(documents)) {
    nextDocuments[projectId] = Array.isArray(projectDocuments)
      ? projectDocuments.map((document) => {
          if (!document || typeof document !== 'object') return document;

          const nextStructure = Array.isArray(document.structure)
            ? document.structure.map(sanitizeStructureNode)
            : [];
          const richTextIds = collectRichTextBlockIds(nextStructure);
          const rawFormData = document.formData && typeof document.formData === 'object' ? document.formData : {};
          const nextFormData = { ...rawFormData };

          richTextIds.forEach((blockId) => {
            if (typeof nextFormData[blockId] === 'string') {
              nextFormData[blockId] = sanitizeRichTextHtml(nextFormData[blockId]);
            }
          });

          return {
            ...document,
            structure: nextStructure,
            formData: nextFormData
          };
        })
      : projectDocuments;
  }

  return {
    ...rawWorkspace,
    projects,
    coverConfig,
    documents: nextDocuments
  };
}
