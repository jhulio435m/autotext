import { flattenNodes } from './document';
import { sanitizeRichTextHtml } from './richText';

export function parseBibTeX(input) {
  const raw = String(input || '');
  const entries = [];
  const pattern = /@([A-Za-z]+)\s*\{\s*([^,\s]+)\s*,([\s\S]*?)(?=\n\s*@|\s*$)/g;
  let match;
  while ((match = pattern.exec(raw))) {
    const [, type, key, body] = match;
    const fields = {};
    body.replace(/([A-Za-z]+)\s*=\s*(\{([^{}]*)\}|"([^"]*)"|([^,\n]+))/g, (_, name, _value, braced, quoted, bare) => {
      fields[name.toLowerCase()] = String(braced || quoted || bare || '').trim();
      return '';
    });
    entries.push({
      id: key.trim(),
      key: key.trim(),
      type: type.toLowerCase(),
      title: fields.title || key.trim(),
      author: fields.author || '',
      year: fields.year || '',
      raw: match[0].trim()
    });
  }
  return entries;
}

export function serializeBibTeX(entries = []) {
  return (entries || []).map((entry) => {
    if (entry.raw && String(entry.raw).includes(`{${entry.key || entry.id},`)) return entry.raw;
    const key = entry.key || entry.id;
    return `@${entry.type || 'misc'}{${key},\n  title = {${entry.title || key}},\n  author = {${entry.author || ''}},\n  year = {${entry.year || ''}}\n}`;
  }).join('\n\n');
}

export function findCitationKeys(structure = [], formData = {}) {
  const keys = new Set();
  flattenNodes(structure).forEach((node) => {
    if (node?.isStructure) return;
    const value = String(formData[node.id] || node.content || node.template || '');
    value.replace(/\\cite(?:[a-zA-Z*]*)?(?:\[[^\]]*\])?\{([^}]+)\}/g, (_, group) => {
      group.split(',').map((item) => item.trim()).filter(Boolean).forEach((key) => keys.add(key));
      return '';
    });
  });
  return [...keys];
}

export function appendCitationToHtml(value, citationKey) {
  const citation = ` \\cite{${citationKey}}`;
  const current = String(value || '');
  if (!current.trim()) return `<p>${citation.trim()}</p>`;
  if (current.includes('</p>')) return sanitizeRichTextHtml(current.replace(/<\/p>\s*$/, `${citation}</p>`));
  return sanitizeRichTextHtml(`${current}${citation}`);
}

export function diffText(before, after) {
  const left = String(before || '').split(/\s+/).filter(Boolean);
  const right = String(after || '').split(/\s+/).filter(Boolean);
  const rows = [];
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    if (left[index] === right[index]) rows.push({ type: 'same', text: left[index] || right[index] || '' });
    else {
      if (left[index]) rows.push({ type: 'removed', text: left[index] });
      if (right[index]) rows.push({ type: 'added', text: right[index] });
    }
  }
  return rows;
}

export function summarizeDocumentForDiff(docLike = {}) {
  const parts = [];
  flattenNodes(docLike.structure || []).forEach((node) => {
    if (node?.isStructure) parts.push(`# ${node.title || ''}`);
    else parts.push(`${node.label || node.type || node.id}: ${docLike.formData?.[node.id] || node.content || node.template || ''}`);
  });
  return parts.join('\n');
}
