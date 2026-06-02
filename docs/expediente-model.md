# Modelo base para expedientes tecnicos

## Objetivo

Dar soporte a expedientes tecnicos complejos sin depender de bloques genericos insuficientes.

## Capas del modelo

### 1. Plantilla documental

Define:

- estructura base;
- secciones opcionales;
- secciones repetibles;
- tipos de contenido esperados;
- reglas de numeracion y referencias.

### 2. Esquema de datos

Define:

- variables;
- listas;
- tablas simples;
- tablas avanzadas;
- campos calculados;
- dependencias entre secciones.

### 3. Composicion

Define:

- como se organiza el contenido en pantalla;
- como se muestra en preview;
- como se exporta a LaTeX.

### 4. Instancia del expediente

Define:

- valores reales del proyecto;
- tablas llenadas;
- imagenes y anexos;
- metadatos de version.

## Tipos de bloque recomendados

- `text`
- `rich_text`
- `template_text`
- `variable`
- `ai_text`
- `latex_graph`
- `image`
- `table`
- `advanced_table`
- `dataset_table`
- `reference`
- `computed_value`
- `annex_group`

## Modelo base de contenido

La primera separacion que conviene estabilizar es esta:

- `rich_text`: texto libre redactado directamente por el usuario.
- `template_text`: texto con redaccion fija y variables incrustadas.
- `variable`: dato reutilizable que puede aparecer en varias partes del expediente.

### `rich_text`

Usar cuando el tecnico necesita redactar sin una plantilla cerrada.

```json
{
  "type": "rich_text",
  "label": "Memoria descriptiva",
  "content": "Describe el contexto tecnico del proyecto.",
  "required": true
}
```

### `template_text`

Usar cuando existe una redaccion base con campos reutilizables.

```json
{
  "type": "template_text",
  "label": "Plazo contractual",
  "template": "El plazo de ejecucion sera de {{var_plazo_ejecucion}} dias calendario.",
  "templateMode": "inline",
  "required": true
}
```

### `variable`

Usar cuando el valor debe completarse una sola vez y reutilizarse en otras partes.

```json
{
  "type": "variable",
  "label": "Plazo de ejecucion",
  "variableKey": "var_plazo_ejecucion",
  "variableScope": "document",
  "inputType": "number",
  "inputUnit": "dias",
  "required": true
}
```

## Regla de uso en interfaz

- El arbol define estructura.
- `rich_text` se edita directo en el documento.
- `template_text` se edita como plantilla y se ve resuelto en preview.
- `variable` se completa desde panel de datos o formulario de variables.
- Las tablas e imagenes se editan en contexto con herramientas especializadas.

## Bloque `advanced_table`

Este tipo se usa para tablas:

- extensas;
- con celdas combinadas;
- con encabezados multiples;
- con orientacion vertical u horizontal;
- con exportacion mas robusta.

### Estructura de datos

```json
{
  "type": "advanced_table",
  "columnCount": 4,
  "columnHeaders": ["Item", "Descripcion", "Unidad", "Cantidad"],
  "columnAlign": ["L", "L", "C", "R"],
  "orientation": "portrait",
  "repeatHeader": true,
  "headerRows": 1
}
```

Valor asociado:

```json
{
  "orientation": "landscape",
  "repeatHeader": true,
  "headerRows": 2,
  "caption": "Cuadro de metrados",
  "source": "Levantamiento de campo",
  "rows": [
    [
      { "value": "Capitulo 1", "colSpan": 4, "rowSpan": 1 }
    ],
    [
      { "value": "1.1" },
      { "value": "Excavacion manual" },
      { "value": "m3" },
      { "value": "25.40" }
    ]
  ]
}
```

## Siguientes extensiones

- secciones repetibles por disciplina o componente;
- referencias cruzadas;
- numeracion automatica de tablas, figuras y anexos;
- bloques calculados;
- tablas de dataset vinculadas a registros;
- anexos estructurados.
