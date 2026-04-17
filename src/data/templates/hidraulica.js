export const hidStructure = [
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
        type: 'variable',
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

export const hidraulicaTemplates = [
  {
    id: 'tpl_hid_base',
    slug: 'hidraulica-base',
    name: 'Base hidraulica',
    description: 'Plantilla mínima para memorias hidráulicas.',
    isSystem: true,
    data: hidStructure
  }
];
