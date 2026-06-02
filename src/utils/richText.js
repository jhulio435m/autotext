const ALLOWED_TAGS = new Set([
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
]);

const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed']);

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeNode(node, document) {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return document.createDocumentFragment();
  }

  const tag = node.tagName.toLowerCase();
  if (DROP_WITH_CONTENT.has(tag)) {
    return document.createDocumentFragment();
  }

  if (!ALLOWED_TAGS.has(tag)) {
    const fragment = document.createDocumentFragment();
    Array.from(node.childNodes).forEach((child) => {
      fragment.appendChild(sanitizeNode(child, document));
    });
    return fragment;
  }

  const next = document.createElement(tag);
  if (tag === 'span' && node.getAttribute('data-type') === 'variable') {
    const variableId = String(node.getAttribute('id') || '').trim();
    if (/^[A-Za-z0-9_:-]{1,120}$/.test(variableId)) {
      next.setAttribute('data-type', 'variable');
      next.setAttribute('id', variableId);
    }
  }

  Array.from(node.childNodes).forEach((child) => {
    next.appendChild(sanitizeNode(child, document));
  });

  return next;
}

export function sanitizeRichTextHtml(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return escapeHtml(value);
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(value, 'text/html');
  const output = document.createElement('div');

  Array.from(parsed.body.childNodes).forEach((child) => {
    output.appendChild(sanitizeNode(child, document));
  });

  return output.innerHTML;
}

export function wrapPlainTextAsRichText(value) {
  return `<p>${escapeHtml(value || '')}</p>`;
}
