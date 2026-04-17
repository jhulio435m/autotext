import { escapeLatex } from './shared.js';

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

/**
 * Convierte un valor de color (hex o rgb) a formato LaTeX r,g,b (0-1)
 */
function colorToLatexRgb(value) {
  if (!value) return null;
  const raw = value.trim();
  
  // Caso Hex #RRGGBB
  const hexMatch = raw.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hexMatch) {
    const r = Number.parseInt(hexMatch[1], 16) / 255;
    const g = Number.parseInt(hexMatch[2], 16) / 255;
    const b = Number.parseInt(hexMatch[3], 16) / 255;
    return `${r.toFixed(3)},${g.toFixed(3)},${b.toFixed(3)}`;
  }

  // Caso RGB rgb(r, g, b)
  const rgbMatch = raw.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    const r = Number.parseInt(rgbMatch[1], 10) / 255;
    const g = Number.parseInt(rgbMatch[2], 10) / 255;
    const b = Number.parseInt(rgbMatch[3], 10) / 255;
    return `${r.toFixed(3)},${g.toFixed(3)},${b.toFixed(3)}`;
  }

  return null;
}

/**
 * Convierte HTML a LaTeX preservando formato básico, estructuras de listas y colores.
 */
export function htmlToLatex(html) {
  if (!html) return '';

  let processed = html
    // Limpieza inicial
    .replace(/\r/g, '')
    // Preservar colores (soporta hex y rgb, permitiendo espacios y otros estilos mezclados)
    .replace(/<span[^>]*style\s*=\s*['"]\s*(?:[^'"]*?;\s*)?color\s*:\s*([^'"]+?)\s*(?:;[^'"]*)?['"][^>]*>([\s\S]*?)<\/span>/gi, (match, color, content) => {
      const latexColor = colorToLatexRgb(color);
      if (latexColor) {
        return `___COLOR_START_${latexColor}___${content}___COLOR_END___`;
      }
      return content;
    })
    // Preservar negritas
    .replace(/<(b|strong)>([\s\S]*?)<\/\1>/gi, '___BOLD_START___$2___BOLD_END___')
    // ... rest of logic

    .replace(/<(i|em)>([\s\S]*?)<\/\1>/gi, '___ITALIC_START___$2___ITALIC_END___')
    // Preservar subrayados
    .replace(/<u>([\s\S]*?)<\/u>/gi, '___UNDERLINE_START___$2___UNDERLINE_END___')
    // Preservar jerarquia de encabezados del editor dentro del bloque enriquecido
    .replace(/<h1(\s[^>]*)?>([\s\S]*?)<\/h1>/gi, '\n\n___H1_START___$2___H1_END___\n\n')
    .replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi, '\n\n___H2_START___$2___H2_END___\n\n')
    .replace(/<h3(\s[^>]*)?>([\s\S]*?)<\/h3>/gi, '\n\n___H3_START___$2___H3_END___\n\n')
    .replace(/<h4(\s[^>]*)?>([\s\S]*?)<\/h4>/gi, '\n\n___H4_START___$2___H4_END___\n\n')
    .replace(/<h5(\s[^>]*)?>([\s\S]*?)<\/h5>/gi, '\n\n___H5_START___$2___H5_END___\n\n')
    .replace(/<h6(\s[^>]*)?>([\s\S]*?)<\/h6>/gi, '\n\n___H6_START___$2___H6_END___\n\n')
    // Manejar listas
    .replace(/<ul(\s[^>]*)?>([\s\S]*?)<\/ul>/gi, '\n\n\\begin{itemize}$2\n\\end{itemize}\n\n')
    .replace(/<ol(\s[^>]*)?>([\s\S]*?)<\/ol>/gi, '\n\n\\begin{enumerate}$2\n\\end{enumerate}\n\n')
    .replace(/<li(\s[^>]*)?>([\s\S]*?)<\/li>/gi, '\n  \\item $2')
    // Saltos de línea
    .replace(/<br\s*\/?>/gi, '___LINE_BREAK___')
    // Párrafos
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p(\s[^>]*)?>/gi, '')
    // Eliminar resto de etiquetas
    .replace(/<[^>]+>/g, '');

  processed = decodeHtmlEntities(processed);

  // Escapar caracteres especiales de LaTeX sin romper nuestros marcadores
  const parts = processed.split(/(___[A-Z0-9_.,]+___|\\begin\{[a-z]+\}|\\end\{[a-z]+\}|\\item)/);
  const escapedParts = parts.map(part => {
    if (part.startsWith('___') || part.startsWith('\\')) return part;
    return escapeLatex(part);
  });

  return escapedParts.join('')
    .replace(/___H1_START___/g, '\\par{\\fontsize{18}{22}\\selectfont\\bfseries ')
    .replace(/___H1_END___/g, '\\par}\n')
    .replace(/___H2_START___/g, '\\par{\\fontsize{16}{20}\\selectfont\\bfseries ')
    .replace(/___H2_END___/g, '\\par}\n')
    .replace(/___H3_START___/g, '\\par{\\fontsize{14}{18}\\selectfont\\bfseries ')
    .replace(/___H3_END___/g, '\\par}\n')
    .replace(/___H4_START___/g, '\\par{\\fontsize{13}{17}\\selectfont\\bfseries ')
    .replace(/___H4_END___/g, '\\par}\n')
    .replace(/___H5_START___/g, '\\par{\\fontsize{12}{16}\\selectfont\\bfseries ')
    .replace(/___H5_END___/g, '\\par}\n')
    .replace(/___H6_START___/g, '\\par{\\fontsize{11}{15}\\selectfont\\bfseries ')
    .replace(/___H6_END___/g, '\\par}\n')
    .replace(/___COLOR_START_([0-9.,]+)___/gi, '{\\color[rgb]{$1} ')
    .replace(/___COLOR_END___/g, '}')
    .replace(/___BOLD_START___/g, '\\textbf{')
    .replace(/___BOLD_END___/g, '}')
    .replace(/___ITALIC_START___/g, '\\textit{')
    .replace(/___ITALIC_END___/g, '}')
    .replace(/___UNDERLINE_START___/g, '\\underline{')
    .replace(/___UNDERLINE_END___/g, '}')
    .replace(/___LINE_BREAK___/g, '\\\\ ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function renderTextParagraphs(value, fallback) {
  const latexContent = htmlToLatex(value || '');
  if (!latexContent) return `${escapeLatex(fallback)}\n\n`;

  return `${latexContent}\n\n`;
}

export function interpolate(template, formData) {
  if (!template || typeof template !== 'string') return '';
  return template.replace(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g, (_, id) => {
    const value = formData[id];
    if (value === undefined || value === null || value === '') {
      return `[${id}]`;
    }
    return String(value);
  });
}

// Mantener por compatibilidad con tables.js si se usa
export function htmlToPlainText(value) {
  const raw = String(value || '');
  if (!raw.trim()) return '';
  
  const withBreaks = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|blockquote)>/gi, '\n\n')
    .replace(/<(p|div|blockquote)(\s[^>]*)?>/gi, '')
    .replace(/<(ul|ol)(\s[^>]*)?>/gi, '\n')
    .replace(/<\/(ul|ol)>/gi, '\n')
    .replace(/<li(\s[^>]*)?>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/(tr)>/gi, '\n')
    .replace(/<(td|th)(\s[^>]*)?>/gi, '')
    .replace(/<\/(td|th)>/gi, ' ')
    .replace(/<[^>]+>/g, '');

  return decodeHtmlEntities(withBreaks)
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
