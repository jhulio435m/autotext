const SECTION_COMMANDS = ['section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph'];

export function interpolate(template, formData) {
  if (!template || typeof template !== 'string') return '';
  return template.replace(/\{\{(var_[a-zA-Z0-9_]+)\}\}/g, (_, id) => {
    const value = formData[id];
    if (value === undefined || value === null || value === '') {
      return `\\textcolor{red}{[${id}]}`;
    }
    return String(value);
  });
}

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

export function isValueEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    if (Array.isArray(value.rows)) {
      return value.rows.length === 0;
    }
    return Object.keys(value).length === 0;
  }
  return false;
}

export function calculateProgress(structure, formData) {
  const required = getRequiredBlocks(structure);
  if (!required.length) return 100;
  const filled = required.filter((block) => !isValueEmpty(formData?.[block.id]));
  return Math.round((filled.length / required.length) * 100);
}

function renderSection(node, numbering) {
  const level = Math.max(1, Math.min(5, node.level || numbering.length || 1));
  const cmd = SECTION_COMMANDS[level - 1];
  return `\\${cmd}{${node.title || 'Seccion'}}\n`;
}

function renderBlock(node, formData) {
  const value = formData?.[node.id];
  const fallback = `\\textcolor{red}{[PENDIENTE: ${node.label || node.id}]}`;

  if (node.type === 'table') {
    const headers = node.columnHeaders || [];
    const rows = value?.rows || [];
    const align = (node.columnAlign || headers.map(() => 'L')).join('|').toLowerCase();
    const head = headers.join(' & ');
    const body = rows.map((row) => row.join(' & ')).join(' \\\\ \n');
    return `\\begin{tabular}{|${align}|}\n\\hline\n${head} \\\\ \\hline\n${body || fallback}\\\\ \\hline\n\\end{tabular}\n`;
  }

  if (node.type === 'math') {
    const expr = typeof value === 'string' ? value : node.content;
    return expr ? `\\begin{align}\n${expr}\n\\end{align}\n` : `${fallback}\n`;
  }

  if (node.type === 'image') {
    return value?.file ? `\\begin{figure}[h]\n\\centering\n\\includegraphics[width=0.8\\textwidth]{${node.id}}\n\\end{figure}\n` : `${fallback}\n`;
  }

  if (node.type === 'input') {
    return `${value ?? fallback}\n\n`;
  }

  return `${value || fallback}\n\n`;
}

function renderNodesRecursive(nodes, formData, numbering = []) {
  let tex = '';
  (nodes || []).forEach((node, index) => {
    if (node.isStructure) {
      const current = [...numbering, index + 1];
      tex += renderSection(node, current);
      tex += renderNodesRecursive(node.children || [], formData, current);
    } else {
      tex += renderBlock(node, formData);
    }
  });
  return tex;
}

export function generateLatex(structure, formData, cover) {
  const title = cover?.title || 'Documento Tecnico';
  return [
    '\\documentclass[12pt,a4paper]{report}',
    '\\usepackage[spanish]{babel}',
    '\\usepackage[utf8]{inputenc}',
    '\\usepackage{booktabs,longtable,graphicx,xcolor,amsmath}',
    '\\begin{document}',
    `\\title{${title}}`,
    `\\author{${cover?.companyName || 'TechDoc Studio'}}`,
    `\\date{${cover?.date || '\\today'}}`,
    '\\maketitle',
    '\\tableofcontents',
    '\\newpage',
    renderNodesRecursive(structure, formData, []),
    '\\end{document}'
  ].join('\n');
}

export function resolveTableEnvironment(columnCount, rowCount, forced) {
  if (forced && forced !== 'auto') return forced;
  const isLandscape = Number(columnCount) > 6;
  const isLong = Number(rowCount) > 30;
  if (isLandscape && isLong) return 'sideways-longtable';
  if (isLandscape) return 'sidewaystable';
  if (isLong) return 'longtable';
  return 'table';
}
