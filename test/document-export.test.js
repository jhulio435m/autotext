import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDocumentLatex } from '../server/document-export.js';

test('generateDocumentLatex respects mathType for latex blocks', () => {
  const tex = generateDocumentLatex({
    documentName: 'Demo',
    structure: [
      {
        id: 'sec_1',
        isStructure: true,
        level: 1,
        title: 'Formula',
        children: [
          {
            id: 'var_formula',
            isStructure: false,
            type: 'latex_graph',
            label: 'Relacion',
            mathType: 'inline',
            content: 'a+b'
          }
        ]
      }
    ],
    formData: {},
    coverData: {}
  });

  assert.match(tex, /\\\(\s*a\+b\s*\\\)/);
  assert.doesNotMatch(tex, /\\begin\{align\}/);
});

test('generateDocumentLatex respects image width and non-float images', () => {
  const tex = generateDocumentLatex({
    documentName: 'Demo',
    structure: [
      {
        id: 'sec_1',
        isStructure: true,
        level: 1,
        title: 'Imagen',
        children: [
          {
            id: 'var_img',
            isStructure: false,
            type: 'image',
            label: 'Plano',
            width: 'half',
            float: false,
            hasCaption: false
          }
        ]
      }
    ],
    formData: {
      var_img: {
        file: 'figuras/plano.png'
      }
    },
    coverData: {}
  });

  assert.match(tex, /\\includegraphics\[width=0\.48\\textwidth\]\{figuras\/plano\.png\}/);
  assert.doesNotMatch(tex, /\\begin\{figure\}/);
});

test('generateDocumentLatex resolves template_text using reusable variable keys', () => {
  const tex = generateDocumentLatex({
    documentName: 'Demo',
    structure: [
      {
        id: 'sec_1',
        isStructure: true,
        level: 1,
        title: 'Base',
        children: [
          {
            id: 'var_tpl',
            isStructure: false,
            type: 'template_text',
            label: 'Ubicacion',
            template: 'La obra se ejecutara en {{var_distrito}}.'
          }
        ]
      }
    ],
    formData: {
      var_distrito: 'Cayma'
    },
    coverData: {}
  });

  assert.match(tex, /La obra se ejecutara en Cayma\./);
});

test('generateDocumentLatex applies page settings for geometry, font and optional index', () => {
  const tex = generateDocumentLatex({
    documentName: 'Demo',
    structure: [
      {
        id: 'sec_1',
        isStructure: true,
        level: 1,
        title: 'Contenido',
        children: []
      }
    ],
    formData: {},
    coverData: {
      format: 'Letter',
      orientation: 'landscape',
      font: 'heros',
      fontSize: 11,
      lineHeight: 1.3,
      paragraphSpacing: 0.8,
      marginTop: 18,
      marginRight: 20,
      marginBottom: 22,
      marginLeft: 24,
      includeToc: false,
      showHeaderFooter: false
    }
  });

  assert.match(tex, /\\documentclass\[11pt\]\{article\}/);
  assert.match(tex, /\\usepackage\[letterpaper,landscape,top=18mm,right=20mm,bottom=22mm,left=24mm\]\{geometry\}/);
  assert.match(tex, /\\setmainfont\{TeX Gyre Heros\}/);
  assert.match(tex, /\\setstretch\{1\.3\}/);
  assert.match(tex, /\\setlength\{\\parskip\}\{0\.8em\}/);
  assert.match(tex, /\\pagestyle\{plain\}/);
  assert.doesNotMatch(tex, /\\tableofcontents/);
});

test('generateDocumentLatex uses plain style for index and matches heading size to page font size', () => {
  const tex = generateDocumentLatex({
    documentName: 'Demo',
    structure: [
      {
        id: 'sec_1',
        isStructure: true,
        level: 1,
        title: 'Seccion',
        children: [
          {
            id: 'sec_2',
            isStructure: true,
            level: 2,
            title: 'Subseccion',
            children: []
          }
        ]
      }
    ],
    formData: {},
    coverData: {
      includeToc: true,
      fontSize: 11,
      lineHeight: 1.15
    }
  });

  assert.match(tex, /\\pagestyle\{indice\}/);
  assert.match(tex, /\\thispagestyle\{indice\}/);
  assert.match(tex, /\\titleformat\{\\section\}\{\\normalfont\\fontsize\{11\}\{12\.65\}\\selectfont\\bfseries\}/);
  assert.match(tex, /\\titleformat\{\\subsection\}\{\\normalfont\\fontsize\{11\}\{12\.65\}\\selectfont\\bfseries\}/);
  assert.match(tex, /\\titleformat\{\\subsubsection\}\{\\normalfont\\fontsize\{11\}\{12\.65\}\\selectfont\\bfseries\}/);
});

test('generateDocumentLatex no longer emits a cover page before content', () => {
  const tex = generateDocumentLatex({
    documentName: 'MEMORIA DESCRIPTIVA DE INTERVENCION INTEGRAL',
    structure: [],
    formData: {},
    coverData: {
      projectData: {
        var_nombre_proyecto: 'MEJORAMIENTO Y AMPLIACION DEL SERVICIO DE AGUA POTABLE Y DISPOSICION SANITARIA DE EXCRETAS EN LOS SECTORES ALTO, MEDIO, BAJO, ANEXOS Y ZONAS DE EXPANSION DEL CENTRO POBLADO DE VICSO DEL DISTRITO DE ORCOTUNA PROVINCIA DE CONCEPCION DEPARTAMENTO DE JUNIN',
        var_cui: '2537787'
      }
    }
  });

  assert.doesNotMatch(tex, /\\begin\{titlepage\}/);
  assert.doesNotMatch(tex, /\\end\{titlepage\}/);
  assert.doesNotMatch(tex, /\\ClearShipoutPictureBG/);
  assert.match(tex, /\\begin\{document\}/);
  assert.match(tex, /\\pagenumbering\{arabic\}/);
});

test('generateDocumentLatex preserves rich text heading sizes from editor content', () => {
  const tex = generateDocumentLatex({
    documentName: 'Demo',
    structure: [
      {
        id: 'sec_1',
        isStructure: true,
        level: 1,
        title: 'Contenido',
        children: [
          {
            id: 'var_rich',
            isStructure: false,
            type: 'rich_text',
            label: 'Texto enriquecido',
            content: '<h1>Titulo libre</h1><p>Parrafo base.</p>'
          }
        ]
      }
    ],
    formData: {},
    coverData: {
      fontSize: 11
    }
  });

  assert.match(tex, /\\fontsize\{18\}\{22\}\\selectfont\\bfseries Titulo libre\\par/);
  assert.match(tex, /Parrafo base\./);
});

test('generateDocumentLatex enables first-line paragraph indentation', () => {
  const tex = generateDocumentLatex({
    documentName: 'Demo',
    structure: [],
    formData: {},
    coverData: {}
  });

  assert.match(tex, /\\usepackage\{indentfirst\}/);
  assert.match(tex, /\\raggedbottom/);
  assert.match(tex, /\\captionsetup\{skip=10pt,font=small,labelfont=bf\}/);
  assert.match(tex, /\\setlength\{\\parindent\}\{1\.5em\}/);
});

test('generateDocumentLatex uses progressive indentation for heading levels', () => {
  const tex = generateDocumentLatex({
    documentName: 'Demo',
    structure: [],
    formData: {},
    coverData: {
      fontSize: 11,
      lineHeight: 1.15
    }
  });

  assert.match(tex, /\\titlespacing\*\{\\section\}\{0pt\}\{1\.2em\}\{0\.6em\}/);
  assert.match(tex, /\\titlespacing\*\{\\subsection\}\{1em\}\{0\.9em\}\{0\.45em\}/);
  assert.match(tex, /\\titlespacing\*\{\\subsubsection\}\{2em\}\{0\.7em\}\{0\.35em\}/);
  assert.match(tex, /\\titlespacing\*\{\\paragraph\}\{3em\}\{0\.55em\}\{0\.25em\}/);
});
