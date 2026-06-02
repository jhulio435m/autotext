import { buildExportTree } from '../exportModel.js';
import { normalizePageSettings } from '../pageConfig.js';
import {
  buildGraphicInclude,
  buildLocationLabel,
  buildProjectName,
  escapeLatex,
  firstNonEmpty,
  formatDateValue,
  formatMonthYearValue,
  getCoverValue,
  getImageWidth,
  getProjectDataValue,
  hexToRgbString,
  sanitizeLatexLabel,
  SECTION_COMMANDS
} from './shared.js';
import { htmlToPlainText, interpolate, renderTextParagraphs } from './text.js';
import { renderTable } from './tables.js';

function truncateLatexText(text, maxLen = 60) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen).replace(/\s+\S*$/, '') + '...';
}

function getLevelIndent(level) {
  return Math.max(0, level - 1);
}

function wrapIndentedBlock(content, indentEm = 0) {
  if (!content) return '';
  if (!indentEm) return content;
  return `\\begin{adjustwidth}{${indentEm}em}{0pt}\n${content}\\end{adjustwidth}\n`;
}

function renderSection(node, numbering) {
  const level = Math.max(1, Math.min(5, numbering.length || 1));
  const cmd = SECTION_COMMANDS[level - 1];
  const body = `\\${cmd}{${escapeLatex(node.title || 'Seccion')}}${getCounterResetCommands(level)}\n`;
  return wrapIndentedBlock(body, getLevelIndent(level));
}

function getCounterResetCommands(level) {
  if (level <= 1) return '\\setcounter{subsection}{0}\\setcounter{subsubsection}{0}\\setcounter{paragraph}{0}\\setcounter{subparagraph}{0}';
  if (level === 2) return '\\setcounter{subsubsection}{0}\\setcounter{paragraph}{0}\\setcounter{subparagraph}{0}';
  if (level === 3) return '\\setcounter{paragraph}{0}\\setcounter{subparagraph}{0}';
  if (level === 4) return '\\setcounter{subparagraph}{0}';
  return '';
}

function renderInlineContinuation(node) {
  if (!node || node.isStructure) return '';
  if (node.exportKind === 'text') {
    const plain = htmlToPlainText(node.exportValue || node.exportFallback);
    return escapeLatex(plain || node.exportFallback || '');
  }
  if (node.exportKind === 'inline') {
    return escapeLatex(node.exportValue || node.exportFallback || '');
  }
  return '';
}

function renderInlineSection(node, numbering, inlineNode) {
  const level = Math.max(1, Math.min(5, numbering.length || 1));
  const cmd = SECTION_COMMANDS[level - 1];
  const counterValue = `\\the${cmd}`;
  const title = escapeLatex(node.title || 'Seccion');
  const inlineText = renderInlineContinuation(inlineNode);
  const tocLine = `\\phantomsection\\addcontentsline{toc}{${cmd}}{\\protect\\numberline{${counterValue}}${title}}`;
  const body = [
    `\\refstepcounter{${cmd}}${getCounterResetCommands(level)}`,
    tocLine,
    `\\textbf{${counterValue}\\hspace{1em}${title}:} ${inlineText}\\par`,
    ''
  ].join('\n');
  return wrapIndentedBlock(body, getLevelIndent(level));
}

function renderImage(node, value, fallback) {
  const caption = escapeLatex(value?.caption || node.label || fallback);
  const source = value?.source ? `\\caption*{Fuente: ${escapeLatex(value.source)}}` : '';
  const label = value?.label
    ? `\\label{${sanitizeLatexLabel(value.label, 'figura')}}`
    : node.hasLabel
      ? `\\label{fig:${sanitizeLatexLabel(node.id || 'imagen', 'imagen')}}`
      : '';
  const external = String(value?.file || '').trim();
  const width = getImageWidth(node);
  const envStart = node.float === false ? '' : '\\begin{figure}[htbp]';
  const envEnd = node.float === false ? '' : '\\end{figure}';

  if (external && !/^data:/i.test(external)) {
    return [
      envStart,
      '\\centering',
      `\\includegraphics[width=${width}]{${escapeLatex(external)}}`,
      node.hasCaption !== false ? `\\caption{${caption}}` : '',
      source,
      label,
      envEnd,
      ''
    ].filter(Boolean).join('\n');
  }

  return [
    envStart,
    '\\centering',
    `\\fbox{\\parbox{0.82\\textwidth}{\\centering ${caption}}}`,
    node.hasCaption !== false ? `\\caption{${caption}}` : '',
    source,
    label,
    envEnd,
    ''
  ].filter(Boolean).join('\n');
}

function renderInlineLabel(label, value) {
  return `\\textbf{${escapeLatex(label || 'Campo')}:} ${escapeLatex(value || '[PENDIENTE]')}\n\n`;
}


function renderBibliography(entries = []) {
  if (!Array.isArray(entries) || entries.length === 0) return '';
  const rows = entries.map((entry) => {
    const key = escapeLatex(entry.key || entry.id || 'ref');
    const author = escapeLatex(entry.author || 'Autor no registrado');
    const year = entry.year ? ` (${escapeLatex(entry.year)})` : '';
    const title = escapeLatex(entry.title || entry.key || entry.id || 'Referencia');
    return `\bibitem{${key}} ${author}${year}. \textit{${title}}.`;
  });
  return ['\section*{Bibliografía}', '\begin{thebibliography}{99}', ...rows, '\end{thebibliography}', ''].join('\n');
}

function renderBlock(node, level = 1) {
  const indent = getLevelIndent(level);
  if (node.exportKind === 'table') {
    return wrapIndentedBlock(`${renderTable(node, node.exportValue)}\n`, indent);
  }

  if (node.exportKind === 'diagram') {
    const diagram = node.exportValue || {};
    const code = String(diagram.code || '').trim();
    if (diagram.format === 'tikz' && code) {
      return wrapIndentedBlock([node.label ? `\\textbf{${escapeLatex(node.label)}}\\par` : '', code, ''].filter(Boolean).join('\n'), indent);
    }
    return wrapIndentedBlock([node.label ? `\\textbf{${escapeLatex(node.label)}}\\par` : '', '\\begin{verbatim}', code || 'Diagrama pendiente', '\\end{verbatim}', ''].filter(Boolean).join('\n'), indent);
  }


  if (node.exportKind === 'latex_graph') {
    const expr = node.exportExpression;
    const mathType = String(node.mathType || 'block').toLowerCase();
    const mathOpen = mathType === 'inline' ? '\\(' : mathType === 'align' ? '\\begin{align}' : '\\[';
    const mathClose = mathType === 'inline' ? '\\)' : mathType === 'align' ? '\\end{align}' : '\\]';
    return expr
      ? wrapIndentedBlock([
          node.label ? `\\textbf{${escapeLatex(node.label)}}\\par` : '',
          mathOpen,
          expr,
          mathClose,
          ''
        ].filter(Boolean).join('\n')
        + '\n', indent)
      : wrapIndentedBlock(`${escapeLatex(node.exportFallback)}\n\n`, indent);
  }

  if (node.exportKind === 'image') {
    return wrapIndentedBlock(renderImage(node, node.exportValue, node.exportFallback), indent);
  }

  if (node.exportKind === 'text') {
    return wrapIndentedBlock(renderTextParagraphs(node.exportValue || node.exportFallback, node.exportFallback), indent);
  }

  return wrapIndentedBlock(renderInlineLabel(node.label, node.exportValue || node.exportFallback), indent);
}

function renderNodesRecursive(nodes, numbering = []) {
  let tex = '';
  const currentLevel = Math.max(1, numbering.length || 1);
  (nodes || []).forEach((node, index) => {
    if (node.isStructure) {
      const current = [...numbering, index + 1];
      const children = node.children || [];
      const inlineCandidate = node.sectionTextMode === 'inline'
        ? children.find((child) => !child?.isStructure && Boolean(renderInlineContinuation(child)))
        : null;
      tex += inlineCandidate ? renderInlineSection(node, current, inlineCandidate) : renderSection(node, current);
      tex += renderNodesRecursive(
        inlineCandidate ? children.filter((child) => child.id !== inlineCandidate.id) : children,
        current
      );
    } else {
      tex += renderBlock(node, currentLevel);
    }
  });
  return tex;
}

export function generateLatex(structure, formData, cover) {
  const rawDocumentTitle = getCoverValue(cover, 'title') || 'Documento Tecnico';
  const documentTitle = escapeLatex(truncateLatexText(rawDocumentTitle, 60));
  const projectName = escapeLatex(truncateLatexText(firstNonEmpty(buildProjectName(cover), rawDocumentTitle), 55));
  const locationLabel = escapeLatex(firstNonEmpty(buildLocationLabel(cover), 'Ubicacion por definir'));
  const primaryColor = hexToRgbString(getCoverValue(cover, 'primaryColor'));
  const pageSettings = normalizePageSettings(cover);
  const geometryOptions = [
    pageSettings.latexPaper,
    pageSettings.orientation === 'landscape' ? 'landscape' : '',
    `top=${pageSettings.marginTop}mm`,
    `right=${pageSettings.marginRight}mm`,
    `bottom=${pageSettings.marginBottom}mm`,
    `left=${pageSettings.marginLeft}mm`
  ].filter(Boolean).join(',');
  const sectionFontLead = Number((pageSettings.fontSize * pageSettings.lineHeight).toFixed(2));
  const uniformHeadingFormat = `\\normalfont\\fontsize{${pageSettings.fontSize}}{${sectionFontLead}}\\selectfont\\bfseries`;
  const headerLogoGraphic = buildGraphicInclude(
    getCoverValue(cover, 'logo'),
    'height=2.2cm',
    '\\fbox{\\parbox[c][2.2cm][c]{2.4cm}{\\centering LOGO}}'
  );

  const exportTree = buildExportTree(structure, formData, cover, {
    interpolate,
    formatDateValue
  });

  return [
    `\\documentclass[${pageSettings.fontSize}pt]{article}`,
    '\\usepackage[table]{xcolor}',
    `\\usepackage[${geometryOptions}]{geometry}`,
    '\\usepackage[spanish]{babel}',
    '\\usepackage{graphicx}',
    '\\usepackage{tikz}',
    '\\usetikzlibrary{calc,shadows.blur}',
    '\\usepackage{eso-pic}',
    '\\usepackage{setspace}',
    '\\usepackage{microtype}',
    '\\usepackage{indentfirst}',
    '\\usepackage{fontspec}',
    '\\raggedbottom',
    `\\setmainfont{${pageSettings.fontLatexName}}`,
    '\\usepackage{booktabs,longtable,amsmath,array,caption,tabularx,fancyhdr,lastpage,pdflscape,multirow,colortbl}',
    '\\usepackage[inline]{enumitem}',
    '\\usepackage{changepage}',
    '\\usepackage{titlesec}',
    '\\usepackage[colorlinks=true]{hyperref}',
    '\\usepackage{bookmark}',
    `\\definecolor{CFGColorPrimario}{RGB}{${primaryColor}}`,
    '\\definecolor{CFGColorSecundario}{RGB}{180,180,180}',
    '\\definecolor{CFGColorFondo}{RGB}{245,248,250}',
    '\\definecolor{CFGColorTablaPar}{RGB}{250,252,253}',
    '\\hypersetup{linkcolor=CFGColorPrimario, urlcolor=CFGColorPrimario, citecolor=CFGColorPrimario}',
    '\\captionsetup{skip=10pt,font=small,labelfont=bf}',
    `\\titleformat{\\section}{${uniformHeadingFormat}}{\\thesection}{1em}{}`,
    `\\titleformat{\\subsection}{${uniformHeadingFormat}}{\\thesubsection}{1em}{}`,
    `\\titleformat{\\subsubsection}{${uniformHeadingFormat}}{\\thesubsubsection}{1em}{}`,
    `\\titleformat{\\paragraph}{${uniformHeadingFormat}}{\\theparagraph}{1em}{}`,
    `\\titleformat{\\subparagraph}{${uniformHeadingFormat}}{\\thesubparagraph}{1em}{}`,
    '\\titlespacing*{\\section}{0pt}{1.2em}{0.6em}',
    '\\titlespacing*{\\subsection}{1em}{0.9em}{0.45em}',
    '\\titlespacing*{\\subsubsection}{2em}{0.7em}{0.35em}',
    '\\titlespacing*{\\paragraph}{3em}{0.55em}{0.25em}',
    '\\titlespacing*{\\subparagraph}{4em}{0.45em}{0.2em}',
    '\\setlist[itemize]{noitemsep, topsep=0pt}',
    '\\setlist[enumerate]{noitemsep, topsep=0pt}',
    `\\setstretch{${pageSettings.lineHeight}}`,
    '\\setlength{\\parindent}{1.5em}',
    `\\setlength{\\parskip}{${pageSettings.paragraphSpacing}em}`,
    '\\setcounter{secnumdepth}{5}',
    '\\setcounter{tocdepth}{2}',
    '\\setlength{\\headheight}{63.2pt}',
    '\\setlength{\\headsep}{14pt}',
    '\\setlength{\\footskip}{18pt}',
    '\\newcommand{\\CFGDrawHeaderBar}{%',
    '\\begin{tikzpicture}[remember picture,overlay]',
    '\\fill[CFGColorPrimario] (current page.north west) rectangle ([yshift=-10pt]current page.north east);',
    '\\draw[CFGColorSecundario, line width=0.4pt] ([yshift=-10pt]current page.north west) -- ([yshift=-10pt]current page.north east);',
    '\\end{tikzpicture}%',
    '}',
    '\\fancypagestyle{indice}{',
    '\\fancyhf{}',
    `\\fancyhead[L]{\\footnotesize\\textbf{${documentTitle}}}`,
    `\\fancyhead[R]{${headerLogoGraphic}}`,
    `\\fancyfoot[L]{\\scriptsize ${locationLabel}}`,
    '\\fancyfoot[R]{\\scriptsize Pagina \\thepage}',
    '\\renewcommand{\\headrulewidth}{0.4pt}',
    '\\renewcommand{\\footrulewidth}{0.4pt}',
    '}',
    '\\fancypagestyle{contenido}{',
    '\\fancyhf{}',
    '\\fancyhead[C]{\\AddToShipoutPictureBG*{\\CFGDrawHeaderBar}\\vspace*{10pt}}',
    `\\fancyhead[L]{\\begin{minipage}[c]{0.80\\textwidth}\\footnotesize\\textbf{\\parbox[t]{\\linewidth}{${projectName}}}\\end{minipage}}`,
    `\\fancyhead[R]{\\begin{minipage}[c]{0.20\\textwidth}\\raggedleft ${headerLogoGraphic}\\end{minipage}}`,
    `\\fancyfoot[L]{\\scriptsize ${locationLabel}}`,
    `\\fancyfoot[C]{\\scriptsize ${documentTitle}}`,
    '\\fancyfoot[R]{\\scriptsize Pagina \\thepage\\ de \\pageref{LastPage}}',
    '\\renewcommand{\\headrulewidth}{0.6pt}',
    '\\renewcommand{\\headrule}{\\hbox to\\headwidth{\\color{CFGColorSecundario}\\leaders\\hrule height \\headrulewidth\\hfill}}',
    '\\renewcommand{\\footrulewidth}{0.4pt}',
    '}',
    '\\newcommand{\\CFGRenderLandscapeHeader}{%',
    '\\AddToShipoutPictureBG*{\\CFGDrawHeaderBar}%',
    '\\vspace*{10pt}%',
    '\\noindent%',
    `\\begin{minipage}[c]{0.78\\textwidth}\\footnotesize\\textbf{\\parbox[t]{\\linewidth}{${projectName}}}\\end{minipage}%`,
    '\\hfill%',
    `\\begin{minipage}[c]{0.18\\textwidth}\\raggedleft ${headerLogoGraphic}\\end{minipage}\\par`,
    '\\vspace{4pt}%',
    '{\\color{CFGColorSecundario}\\rule{\\textwidth}{0.6pt}}\\par',
    '\\vspace{10pt}%',
    '}',
    '\\newcommand{\\CFGRenderLandscapeFooter}{%',
    '\\vspace{8pt}%',
    '{\\color{CFGColorSecundario}\\rule{\\textwidth}{0.4pt}}\\par',
    '\\noindent%',
    `\\begin{minipage}[t]{0.33\\textwidth}\\scriptsize ${locationLabel}\\end{minipage}%`,
    `\\begin{minipage}[t]{0.34\\textwidth}\\centering\\scriptsize ${documentTitle}\\end{minipage}%`,
    '\\begin{minipage}[t]{0.33\\textwidth}\\raggedleft\\scriptsize Pagina \\thepage\\ de \\pageref{LastPage}\\end{minipage}%',
    '}',
    '\\renewcommand{\\contentsname}{INDICE}',
    '\\begin{document}',
    pageSettings.includeToc ? '\\pagestyle{indice}' : '',
    pageSettings.includeToc ? '\\thispagestyle{indice}' : '',
    pageSettings.includeToc ? '\\phantomsection' : '',
    pageSettings.includeToc ? '\\pdfbookmark[1]{INDICE}{toc}' : '',
    pageSettings.includeToc ? '\\hypersetup{linkcolor=black}' : '',
    pageSettings.includeToc ? '\\tableofcontents' : '',
    pageSettings.includeToc ? '\\hypersetup{linkcolor=CFGColorPrimario}' : '',
    pageSettings.includeToc ? '\\clearpage' : '',
    '\\pagenumbering{arabic}',
    '\\setcounter{page}{1}',
    pageSettings.showHeaderFooter ? '\\pagestyle{contenido}' : '\\pagestyle{plain}',
    '\\setlength{\\emergencystretch}{3em}',
    renderNodesRecursive(exportTree, []),
    '\\end{document}'
  ].filter(Boolean).join('\n');
}
