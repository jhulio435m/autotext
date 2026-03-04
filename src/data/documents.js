const geoMainStructure = [
  {
    id: 'sec_geo_001',
    isStructure: true,
    level: 1,
    title: 'Estudio Geotecnico',
    expanded: true,
    canvasExpanded: true,
    children: [
      {
        id: 'sec_geo_001_01',
        isStructure: true,
        level: 2,
        title: 'Introduccion',
        expanded: true,
        canvasExpanded: true,
        children: [
          {
            id: 'var_geo_text_intro',
            isStructure: false,
            type: 'text',
            label: 'Introduccion general',
            content: 'Redacta el contexto tecnico del proyecto.',
            required: true,
            promptIA: 'Resume el contexto geotecnico en tono tecnico formal.'
          },
          {
            id: 'var_geo_input_ubic',
            isStructure: false,
            type: 'input',
            label: 'Ubicacion del proyecto',
            required: true,
            inputType: 'text',
            inputPlaceholder: 'Ej: Km 42+300, Tramo Norte'
          }
        ]
      },
      {
        id: 'sec_geo_001_02',
        isStructure: true,
        level: 2,
        title: 'Resultados de ensayos',
        expanded: true,
        canvasExpanded: true,
        children: [
          {
            id: 'var_geo_table_cbr',
            isStructure: false,
            type: 'table',
            label: 'Tabla de resultados CBR',
            required: true,
            columnCount: 5,
            columnHeaders: ['Muestra', 'Prof. (m)', 'LL', 'LP', 'IP'],
            columnAlign: ['L', 'C', 'C', 'C', 'C'],
            tableStyle: 'booktabs',
            tableEnvironment: 'auto',
            hasCaption: true,
            hasSource: true,
            hasDescription: false,
            hasLabel: true
          },
          {
            id: 'var_geo_img_campo',
            isStructure: false,
            type: 'image',
            label: 'Registro fotografico de campo',
            required: true,
            width: 'half',
            float: true,
            hasCaption: true,
            hasSource: true,
            hasDescription: true,
            hasLabel: true
          }
        ]
      },
      {
        id: 'sec_geo_001_03',
        isStructure: true,
        level: 2,
        title: 'Modelo matematico',
        expanded: true,
        canvasExpanded: true,
        children: [
          {
            id: 'var_geo_math_sigma',
            isStructure: false,
            type: 'math',
            label: 'Ecuacion de esfuerzo vertical',
            required: true,
            mathType: 'align',
            content: '\\sigma_v = \\gamma \\cdot z',
            mathVariables: ['gamma', 'z'],
            hasLabel: true
          },
          {
            id: 'var_geo_input_fs',
            isStructure: false,
            type: 'input',
            label: 'Factor de seguridad',
            required: true,
            inputType: 'number',
            inputUnit: '-',
            inputMin: 1,
            inputMax: 5,
            inputPlaceholder: '1.5'
          }
        ]
      }
    ]
  }
];

const geoTemplateStructure = [
  {
    id: 'sec_geo_t_001',
    isStructure: true,
    level: 1,
    title: 'Informe base',
    expanded: true,
    canvasExpanded: true,
    children: [
      {
        id: 'var_geo_t_text',
        isStructure: false,
        type: 'text',
        label: 'Resumen ejecutivo',
        required: true,
        content: 'Sintetiza alcance, metodologia y conclusiones.'
      }
    ]
  }
];

const hidStructure = [
  {
    id: 'sec_hid_001',
    isStructure: true,
    level: 1,
    title: 'Memoria hidraulica',
    expanded: true,
    canvasExpanded: true,
    children: [
      {
        id: 'var_hid_input_q',
        isStructure: false,
        type: 'input',
        label: 'Caudal de diseno',
        required: true,
        inputType: 'number',
        inputUnit: 'm3/s',
        inputPlaceholder: '2.8'
      },
      {
        id: 'var_hid_text',
        isStructure: false,
        type: 'text',
        label: 'Criterio de diseno',
        required: false,
        content: 'Describe la metodologia hidrologica seleccionada.'
      }
    ]
  }
];

export const SYSTEM_TEMPLATES = [
  {
    id: 'tpl_geotecnia',
    name: 'Geotecnica',
    structure: geoTemplateStructure
  },
  {
    id: 'tpl_estructural',
    name: 'Estructural',
    structure: [
      {
        id: 'sec_est_001',
        isStructure: true,
        level: 1,
        title: 'Memoria estructural',
        expanded: true,
        canvasExpanded: true,
        children: []
      }
    ]
  },
  {
    id: 'tpl_hidraulica',
    name: 'Hidraulica',
    structure: hidStructure
  },
  {
    id: 'tpl_ambiental',
    name: 'Ambiental',
    structure: [
      {
        id: 'sec_amb_001',
        isStructure: true,
        level: 1,
        title: 'Plan de manejo ambiental',
        expanded: true,
        canvasExpanded: true,
        children: []
      }
    ]
  }
];

export const MOCK_DOCUMENTS = {
  proj_geo_2026: [
    {
      id: 'doc_geo_001',
      name: 'Estudio Geotecnico Principal',
      type: 'Informe Tecnico',
      description: 'Documento principal del proyecto geotecnico.',
      version: 'v1.2',
      updatedAt: '2026-03-01T14:20:00.000Z',
      structure: geoMainStructure,
      formData: {
        var_geo_text_intro: 'El proyecto se ubica sobre una terraza aluvial de baja pendiente.',
        var_geo_input_ubic: 'Km 42+300 Tramo Norte',
        var_geo_table_cbr: {
          rows: [['M-1', '0.50', '42', '21', '21']],
          caption: 'Resultados de limites de Atterberg',
          source: 'Laboratorio XYZ 2026'
        },
        var_geo_input_fs: 1.8
      }
    },
    {
      id: 'doc_geo_002',
      name: 'Informe de Ensayos CBR',
      type: 'Especificacion',
      description: 'Informe complementario de laboratorio.',
      version: 'v0.3',
      updatedAt: '2026-02-27T09:10:00.000Z',
      structure: geoTemplateStructure,
      formData: {}
    }
  ],
  proj_hid_2026: [
    {
      id: 'doc_hid_001',
      name: 'Memoria de Drenaje Superficial',
      type: 'Memoria Descriptiva',
      description: 'Memoria del sistema de drenaje.',
      version: 'v1.0',
      updatedAt: '2026-02-28T10:05:00.000Z',
      structure: hidStructure,
      formData: {
        var_hid_input_q: 2.8
      }
    }
  ]
};

export const DEFAULT_COVERS = {
  proj_geo_2026: {
    companyName: 'GeoAndes Consultores',
    slogan: 'Geotecnia aplicada a infraestructura',
    title: 'Estudio Geotecnico Tramo Norte',
    subtitle: 'Informe final de diseno',
    docCode: 'GEO-2026-001',
    version: '1.2',
    date: '2026-03-01',
    format: 'A4',
    orientation: 'portrait',
    font: 'serif',
    primaryColor: '#1e3a8a',
    responsibles: [
      { id: 'resp_001', nombre: 'Ing. Juan Perez', cargo: 'Supervisor de Obra', firma: null }
    ],
    logo: ''
  },
  proj_hid_2026: {
    companyName: 'Hidrovia Ingenieria',
    slogan: 'Soluciones hidraulicas sostenibles',
    title: 'Memoria Hidraulica Quebrada Sur',
    subtitle: 'Drenaje y control de erosiones',
    docCode: 'HID-2026-004',
    version: '1.0',
    date: '2026-02-28',
    format: 'Carta',
    orientation: 'portrait',
    font: 'serif',
    primaryColor: '#312e81',
    responsibles: [
      { id: 'resp_101', nombre: 'Ing. Maria Vega', cargo: 'Especialista Hidraulica', firma: null }
    ],
    logo: ''
  }
};
