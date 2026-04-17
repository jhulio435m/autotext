export const SECTION_COMMANDS = ['section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph'];

export function escapeLatex(value) {
  return String(value || '')
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([#$%&_{}])/g, '\\$1')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}');
}

export function sanitizeLatexLabel(value, fallback = 'ref') {
  const normalized = String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9:._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-:.]+|[-:.]+$/g, '');

  return normalized || fallback;
}

export function formatDateValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;

  const [, year, month, day] = match;
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre'
  ];
  return `${Number(day)} de ${months[Number(month) - 1] || month} de ${year}`;
}

export function formatMonthYearValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;

  const [, year, month] = match;
  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
  ];
  return `${months[Number(month) - 1] || month} - ${year}`;
}

export function getCoverValue(cover, key) {
  const aliases = {
    companyName: ['companyName', 'company'],
    docCode: ['docCode', 'documentCode'],
    date: ['date'],
    version: ['version'],
    title: ['title'],
    subtitle: ['subtitle'],
    slogan: ['slogan'],
    primaryColor: ['primaryColor'],
    logo: ['logo'],
    coverPhoto: ['coverPhoto'],
    locationLabel: ['locationLabel'],
    projectName: ['projectName']
  };
  const keys = aliases[key] || [key];
  for (const candidate of keys) {
    const value = cover?.[candidate];
    if (value != null && value !== '') return value;
  }
  return '';
}

export function getProjectDataValue(cover, key) {
  const value = cover?.projectData?.[key];
  return value == null ? '' : String(value).trim();
}

export function firstNonEmpty(...values) {
  for (const value of values) {
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}

export function normalizeHexColor(value) {
  const raw = String(value || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return '#' + raw[1] + raw[1] + raw[2] + raw[2] + raw[3] + raw[3];
  }
  return '';
}

/**
 * Convierte cualquier formato de color (Hex, RGB, Nombre) a formato r,g,b (0-1) para LaTeX
 */
export function hexToLatexRgb(value) {
  if (!value) return '';
  const raw = String(value).trim().toLowerCase();

  // Caso Hex: #RRGGBB o #RGB
  const hex = normalizeHexColor(raw.startsWith('#') ? raw : '#' + raw);
  if (hex) {
    const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
    const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
    const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
    return `${r.toFixed(3)},${g.toFixed(3)},${b.toFixed(3)}`;
  }

  // Caso RGB: rgb(r, g, b)
  const rgbMatch = raw.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    const r = Number.parseInt(rgbMatch[1], 10) / 255;
    const g = Number.parseInt(rgbMatch[2], 10) / 255;
    const b = Number.parseInt(rgbMatch[3], 10) / 255;
    return `${r.toFixed(3)},${g.toFixed(3)},${b.toFixed(3)}`;
  }

  // Fallback para nombres comunes (opcional, pero útil)
  const names = {
    red: '1.000,0.000,0.000',
    green: '0.000,0.500,0.000',
    blue: '0.000,0.000,1.000',
    black: '0.000,0.000,0.000',
    white: '1.000,1.000,1.000',
    gray: '0.500,0.500,0.500',
    yellow: '1.000,1.000,0.000'
  };
  
  return names[raw] || '';
}

export function normalizePrimaryColor(value) {
  const raw = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : '#006399';
}

export function hexToRgbString(value) {
  const hex = normalizePrimaryColor(value).slice(1);
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

export function latexDetokenize(value) {
  return `\\detokenize{${String(value || '').replace(/[{}]/g, '')}}`;
}

export function buildGraphicInclude(pathValue, options, fallback) {
  const assetPath = String(pathValue || '').trim();
  if (!assetPath) return fallback;
  const safePath = latexDetokenize(assetPath);
  return `\\IfFileExists{${safePath}}{\\includegraphics[${options}]{${safePath}}}{${fallback}}`;
}

export function buildProjectName(cover) {
  return firstNonEmpty(
    getCoverValue(cover, 'projectName'),
    getProjectDataValue(cover, 'var_nombre_proyecto'),
    getCoverValue(cover, 'subtitle'),
    getCoverValue(cover, 'title')
  );
}

export function buildLocationLabel(cover) {
  return firstNonEmpty(
    getCoverValue(cover, 'locationLabel'),
    [getProjectDataValue(cover, 'var_provincia'), getProjectDataValue(cover, 'var_departamento')].filter(Boolean).join(' -- '),
    [getProjectDataValue(cover, 'var_distrito'), getProjectDataValue(cover, 'var_provincia')].filter(Boolean).join(' -- ')
  );
}

export function getImageWidth(node) {
  switch (String(node?.width || 'full').toLowerCase()) {
    case 'half':
      return '0.48\\textwidth';
    case 'third':
      return '0.32\\textwidth';
    default:
      return '0.88\\textwidth';
  }
}
