const PAGE_FORMATS = {
  A4: { label: 'A4', widthMm: 210, heightMm: 297, latexPaper: 'a4paper' },
  Letter: { label: 'Carta', widthMm: 216, heightMm: 279, latexPaper: 'letterpaper' },
  Legal: { label: 'Oficio', widthMm: 216, heightMm: 356, latexPaper: 'legalpaper' }
};

const FONT_PRESETS = {
  termes: {
    key: 'termes',
    label: 'TeX Gyre Termes',
    latexName: 'TeX Gyre Termes',
    previewFamily: 'Georgia, "Times New Roman", serif'
  },
  pagella: {
    key: 'pagella',
    label: 'TeX Gyre Pagella',
    latexName: 'TeX Gyre Pagella',
    previewFamily: 'Georgia, "Times New Roman", serif'
  },
  schola: {
    key: 'schola',
    label: 'TeX Gyre Schola',
    latexName: 'TeX Gyre Schola',
    previewFamily: '"Palatino Linotype", Palatino, Georgia, serif'
  },
  heros: {
    key: 'heros',
    label: 'TeX Gyre Heros',
    latexName: 'TeX Gyre Heros',
    previewFamily: '"Helvetica Neue", Arial, sans-serif'
  },
  modern: {
    key: 'modern',
    label: 'Latin Modern Roman',
    latexName: 'Latin Modern Roman',
    previewFamily: '"Times New Roman", Georgia, serif'
  }
};

const FONT_SIZE_OPTIONS = [10, 11, 12];
const LINE_HEIGHT_OPTIONS = [1, 1.15, 1.3, 1.5];
const PARAGRAPH_SPACING_OPTIONS = [0.2, 0.35, 0.55, 0.8];

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function resolvePageFormat(value) {
  return PAGE_FORMATS[String(value || '').trim()] || PAGE_FORMATS.A4;
}

function resolveFontPreset(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (FONT_PRESETS[raw]) return FONT_PRESETS[raw];

  const matched = Object.values(FONT_PRESETS).find((preset) => preset.latexName.toLowerCase() === raw || preset.label.toLowerCase() === raw);
  return matched || FONT_PRESETS.termes;
}

function normalizePageSettings(rawConfig = {}) {
  const format = resolvePageFormat(rawConfig.format);
  const orientation = String(rawConfig.orientation || 'portrait').toLowerCase() === 'landscape' ? 'landscape' : 'portrait';
  const fontPreset = resolveFontPreset(rawConfig.font);
  const fontSize = FONT_SIZE_OPTIONS.includes(Number(rawConfig.fontSize)) ? Number(rawConfig.fontSize) : 12;
  const lineHeight = LINE_HEIGHT_OPTIONS.includes(Number(rawConfig.lineHeight)) ? Number(rawConfig.lineHeight) : 1.15;
  const paragraphSpacing = PARAGRAPH_SPACING_OPTIONS.includes(Number(rawConfig.paragraphSpacing))
    ? Number(rawConfig.paragraphSpacing)
    : 0.55;
  const marginTop = clampNumber(rawConfig.marginTop, 10, 45, 25);
  const marginRight = clampNumber(rawConfig.marginRight, 10, 45, 25);
  const marginBottom = clampNumber(rawConfig.marginBottom, 10, 45, 25);
  const marginLeft = clampNumber(rawConfig.marginLeft, 10, 45, 25);
  const showHeaderFooter = rawConfig.showHeaderFooter !== false;
  const includeToc = rawConfig.includeToc !== false;

  const widthMm = orientation === 'landscape' ? format.heightMm : format.widthMm;
  const heightMm = orientation === 'landscape' ? format.widthMm : format.heightMm;

  return {
    format: format.label,
    orientation,
    widthMm,
    heightMm,
    latexPaper: format.latexPaper,
    fontKey: fontPreset.key,
    fontLabel: fontPreset.label,
    fontLatexName: fontPreset.latexName,
    previewFontFamily: fontPreset.previewFamily,
    fontSize,
    lineHeight,
    paragraphSpacing,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    showHeaderFooter,
    includeToc
  };
}

const PAGE_FORMAT_OPTIONS = Object.values(PAGE_FORMATS).map((item) => item.label);
const FONT_OPTIONS = Object.values(FONT_PRESETS).map((item) => ({
  value: item.key,
  label: item.label
}));

export {
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  PAGE_FORMAT_OPTIONS,
  PARAGRAPH_SPACING_OPTIONS,
  normalizePageSettings,
  resolveFontPreset
};
