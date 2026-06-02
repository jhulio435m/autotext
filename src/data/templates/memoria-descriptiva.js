export const memoriaDescriptivaStructure = [
  {
    id: 'sec_mem_desc_001',
    isStructure: true,
    level: 1,
    title: 'Memoria descriptiva',
    expanded: true,
    canvasExpanded: true,
    children: [
      {
        id: 'sec_mem_desc_001_1',
        isStructure: true,
        level: 2,
        title: 'Nombre del proyecto',
        expanded: true,
        canvasExpanded: true,
        children: [
          {
            id: 'var_mem_desc_nombre_proyecto',
            isStructure: false,
            type: 'variable',
            label: 'Nombre del proyecto',
            variableKey: 'var_nombre_proyecto',
            variableScope: 'document',
            required: true,
            inputType: 'textarea',
            inputPlaceholder: 'Nombre completo del proyecto'
          },
          {
            id: 'tpl_mem_desc_nombre_proyecto',
            isStructure: false,
            type: 'template_text',
            label: 'Encabezado del proyecto',
            required: true,
            template: '"{{var_nombre_proyecto}}"'
          }
        ]
      },
      {
        id: 'sec_mem_desc_001_2',
        isStructure: true,
        level: 2,
        title: 'Ubicacion politica',
        expanded: true,
        canvasExpanded: true,
        children: [
          {
            id: 'var_mem_desc_departamento',
            isStructure: false,
            type: 'variable',
            label: 'Departamento',
            variableKey: 'var_departamento',
            variableScope: 'document',
            required: true,
            inputType: 'text'
          },
          {
            id: 'var_mem_desc_provincia',
            isStructure: false,
            type: 'variable',
            label: 'Provincia',
            variableKey: 'var_provincia',
            variableScope: 'document',
            required: true,
            inputType: 'text'
          },
          {
            id: 'var_mem_desc_distrito',
            isStructure: false,
            type: 'variable',
            label: 'Distrito',
            variableKey: 'var_distrito',
            variableScope: 'document',
            required: true,
            inputType: 'text'
          },
          {
            id: 'var_mem_desc_direccion',
            isStructure: false,
            type: 'variable',
            label: 'Direccion',
            variableKey: 'var_direccion',
            variableScope: 'document',
            required: true,
            inputType: 'text'
          }
        ]
      },
      {
        id: 'sec_mem_desc_001_3',
        isStructure: true,
        level: 2,
        title: 'Descripcion del proyecto',
        expanded: true,
        canvasExpanded: true,
        children: [
          {
            id: 'var_mem_desc_tipo_proyecto',
            isStructure: false,
            type: 'variable',
            label: 'Tipo de proyecto',
            variableKey: 'var_tipo_proyecto',
            variableScope: 'document',
            required: true,
            inputType: 'select',
            inputOptions: ['Publico', 'Privado']
          },
          {
            id: 'var_mem_desc_nivel_gobierno',
            isStructure: false,
            type: 'variable',
            label: 'Nivel de gobierno',
            variableKey: 'var_nivel_gobierno',
            variableScope: 'document',
            required: true,
            inputType: 'select',
            inputOptions: ['Nacional', 'Regional', 'Local']
          },
          {
            id: 'var_mem_desc_cui',
            isStructure: false,
            type: 'variable',
            label: 'CUI o Codigo SNIP',
            variableKey: 'var_cui',
            variableScope: 'document',
            required: true,
            inputType: 'text',
            inputPlaceholder: 'Ej: 2643848'
          },
          {
            id: 'txt_mem_desc_antecedentes',
            isStructure: false,
            type: 'rich_text',
            label: 'Antecedentes',
            required: true,
            content: 'Describe los antecedentes del proyecto, la problematica actual y la necesidad de intervencion.'
          },
          {
            id: 'txt_mem_desc_objetivo',
            isStructure: false,
            type: 'rich_text',
            label: 'Objetivo del proyecto',
            required: true,
            content: 'Explica el objetivo principal del proyecto y el beneficio esperado para la poblacion.'
          },
          {
            id: 'txt_mem_desc_tipo_obra',
            isStructure: false,
            type: 'rich_text',
            label: 'Tipo de obra',
            required: true,
            content: 'Describe el tipo de obra y las actividades a desarrollarse durante la ejecucion.'
          }
        ]
      },
      {
        id: 'sec_mem_desc_001_4',
        isStructure: true,
        level: 2,
        title: 'Descripcion tecnica del proyecto',
        expanded: true,
        canvasExpanded: true,
        children: [
          {
            id: 'var_mem_desc_area',
            isStructure: false,
            type: 'variable',
            label: 'Area',
            variableKey: 'var_area',
            variableScope: 'document',
            required: true,
            inputType: 'number',
            inputUnit: 'm2'
          },
          {
            id: 'var_mem_desc_perimetro',
            isStructure: false,
            type: 'variable',
            label: 'Perimetro o servidumbre',
            variableKey: 'var_perimetro',
            variableScope: 'document',
            required: true,
            inputType: 'number',
            inputUnit: 'm'
          },
          {
            id: 'tpl_mem_desc_geodesia',
            isStructure: false,
            type: 'template_text',
            label: 'Especificaciones geodesicas',
            required: true,
            template: 'Sistema de coordenadas: {{var_sistema_coordenadas}}\nSistema de proyeccion cartografica: {{var_sistema_proyeccion}}\nDatum: {{var_datum}}\nZona de proyeccion: {{var_zona_proyeccion}}\nCuadricula UTM: {{var_cuadricula_utm}}'
          },
          {
            id: 'var_mem_desc_sistema_coordenadas',
            isStructure: false,
            type: 'variable',
            label: 'Sistema de coordenadas',
            variableKey: 'var_sistema_coordenadas',
            variableScope: 'document',
            required: true,
            inputType: 'text',
            inputPlaceholder: 'Planas'
          },
          {
            id: 'var_mem_desc_sistema_proyeccion',
            isStructure: false,
            type: 'variable',
            label: 'Sistema de proyeccion cartografica',
            variableKey: 'var_sistema_proyeccion',
            variableScope: 'document',
            required: true,
            inputType: 'text',
            inputPlaceholder: 'Universal Transversal Mercator - UTM'
          },
          {
            id: 'var_mem_desc_datum',
            isStructure: false,
            type: 'variable',
            label: 'Datum',
            variableKey: 'var_datum',
            variableScope: 'document',
            required: true,
            inputType: 'text',
            inputPlaceholder: 'World Geodetic System 1984, Datum WGS84'
          },
          {
            id: 'var_mem_desc_zona',
            isStructure: false,
            type: 'variable',
            label: 'Zona de proyeccion',
            variableKey: 'var_zona_proyeccion',
            variableScope: 'document',
            required: true,
            inputType: 'text',
            inputPlaceholder: '18S'
          },
          {
            id: 'var_mem_desc_cuadricula',
            isStructure: false,
            type: 'variable',
            label: 'Cuadricula UTM',
            variableKey: 'var_cuadricula_utm',
            variableScope: 'document',
            required: true,
            inputType: 'text',
            inputPlaceholder: 'L'
          },
          {
            id: 'tbl_mem_desc_datos_tecnicos',
            isStructure: false,
            type: 'advanced_table',
            label: 'Cuadro de datos tecnicos',
            required: true,
            columnCount: 5,
            columnHeaders: ['Progresiva', 'Lado', 'Distancia (m)', 'Coordenada Este (X)', 'Coordenada Norte (Y)'],
            columnAlign: ['L', 'L', 'R', 'R', 'R'],
            tableStyle: 'booktabs',
            orientation: 'portrait',
            repeatHeader: true,
            headerRows: 1,
            hasCaption: true,
            hasSource: true,
            hasDescription: true,
            hasLabel: true
          }
        ]
      },
      {
        id: 'sec_mem_desc_001_5',
        isStructure: true,
        level: 2,
        title: 'Acceso',
        expanded: true,
        canvasExpanded: true,
        children: [
          {
            id: 'txt_mem_desc_acceso',
            isStructure: false,
            type: 'rich_text',
            label: 'Descripcion del acceso',
            required: true,
            content: 'Describe el recorrido de acceso hacia la ubicacion del proyecto.'
          }
        ]
      },
      {
        id: 'sec_mem_desc_001_6',
        isStructure: true,
        level: 2,
        title: 'Colindancias',
        expanded: true,
        canvasExpanded: true,
        children: [
          {
            id: 'var_mem_desc_col_norte',
            isStructure: false,
            type: 'variable',
            label: 'Colindancia norte',
            variableKey: 'var_colindancia_norte',
            variableScope: 'document',
            required: true,
            inputType: 'textarea'
          },
          {
            id: 'var_mem_desc_col_sur',
            isStructure: false,
            type: 'variable',
            label: 'Colindancia sur',
            variableKey: 'var_colindancia_sur',
            variableScope: 'document',
            required: true,
            inputType: 'textarea'
          },
          {
            id: 'var_mem_desc_col_este',
            isStructure: false,
            type: 'variable',
            label: 'Colindancia este',
            variableKey: 'var_colindancia_este',
            variableScope: 'document',
            required: true,
            inputType: 'textarea'
          },
          {
            id: 'var_mem_desc_col_oeste',
            isStructure: false,
            type: 'variable',
            label: 'Colindancia oeste',
            variableKey: 'var_colindancia_oeste',
            variableScope: 'document',
            required: true,
            inputType: 'textarea'
          }
        ]
      },
      {
        id: 'sec_mem_desc_001_7',
        isStructure: true,
        level: 2,
        title: 'Planos',
        expanded: true,
        canvasExpanded: true,
        children: [
          {
            id: 'var_mem_desc_plano_numero',
            isStructure: false,
            type: 'variable',
            label: 'Numero de plano',
            variableKey: 'var_numero_plano',
            variableScope: 'document',
            required: true,
            inputType: 'text',
            inputPlaceholder: 'Ej: Lamina 1'
          },
          {
            id: 'var_mem_desc_plano_descripcion',
            isStructure: false,
            type: 'variable',
            label: 'Descripcion del plano',
            variableKey: 'var_descripcion_plano',
            variableScope: 'document',
            required: true,
            inputType: 'text',
            inputPlaceholder: 'Ej: Plano perimetrico del area a certificar'
          },
          {
            id: 'img_mem_desc_plano_referencia',
            isStructure: false,
            type: 'image',
            label: 'Plano o croquis de referencia',
            required: false,
            width: 'full',
            float: true,
            hasCaption: true,
            hasSource: true,
            hasDescription: true,
            hasLabel: true
          }
        ]
      }
    ]
  }
];

export const memoriaDescriptivaTemplates = [
  {
    id: 'tpl_mem_desc_base',
    slug: 'memoria-descriptiva-base',
    name: 'Memoria descriptiva base',
    description: 'Plantilla base para memorias descriptivas de proyectos de infraestructura y equipamiento.',
    isSystem: true,
    data: memoriaDescriptivaStructure
  }
];
