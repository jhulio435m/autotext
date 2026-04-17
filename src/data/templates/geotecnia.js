export const geoTemplateStructure = [
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

export const geotecniaTemplates = [
  {
    id: 'tpl_geo_base',
    slug: 'geotecnia-base',
    name: 'Base geotecnica',
    description: 'Plantilla mínima para informes geotécnicos.',
    isSystem: true,
    data: geoTemplateStructure
  }
];
