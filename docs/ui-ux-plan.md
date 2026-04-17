# Plan UI/UX transversal

## Propósito

Este documento define una dirección de producto para evitar cambios aislados por componente.
La meta no es "mejorar botones" sino ordenar toda la experiencia alrededor de tareas reales del usuario.

El producto debe responder a tres preguntas:

- cómo estructuro un documento sin perderme;
- cómo completo el contenido sin conocer la lógica interna del sistema;
- cómo verifico el resultado y lo exporto con confianza.

## Problema actual

Hoy la experiencia presenta varios síntomas de fragmentación:

- la jerarquía del documento no siempre se lee de forma inmediata;
- el editor mezcla navegación, estructura, inserción y acciones de mantenimiento en el mismo plano visual;
- el formulario y el preview empezaron a integrarse, pero todavía no forman un flujo guiado completo;
- el lenguaje de la interfaz a veces responde a la implementación técnica y no al modelo mental del usuario;
- algunos controles aparecen solo después de seleccionar, lo que obliga a descubrir la interfaz por ensayo.

## Perfil de usuario

El usuario objetivo no es un desarrollador ni un editor técnico de LaTeX.
Es una persona que entiende documentos, secciones, tablas, imágenes, fórmulas y entregables.

Ese usuario espera:

- ver una estructura comprensible;
- identificar dónde está;
- saber qué falta;
- actuar sin memorizar pasos;
- confiar en que el resultado final refleja lo que completó.

## Objetivos de experiencia

### 1. Claridad estructural

La interfaz debe hacer evidente:

- qué elementos son secciones;
- qué elementos cuelgan de una sección;
- qué está dentro de qué;
- qué nivel de profundidad tiene cada cosa.

### 2. Acción contextual

Las acciones frecuentes deben aparecer:

- al pasar el cursor;
- al enfocarse con teclado;
- o de forma persistente cuando el contexto lo justifique.

No deben depender de descubrir una secuencia escondida.

### 3. Separación de tareas

Cada pantalla debe tener un propósito dominante:

- `Editor`: ordenar la estructura del documento;
- `Formulario`: completar contenido;
- `Preview`: validar resultado y exportar;
- `Carátula`: editar identidad visual y metadatos.

### 4. Consistencia

El mismo sistema visual debe repetirse en editor, formulario y preview:

- estados;
- profundidad;
- lenguaje;
- badges;
- validación;
- controles primarios y secundarios.

## Modelo de producto

### Flujo 1: estructurar

El usuario entra al editor para:

- crear secciones;
- reordenar subelementos;
- decidir qué tipo de contenido va dentro;
- entender rápidamente el árbol del documento.

### Flujo 2: completar

El usuario entra al formulario para:

- recorrer secciones;
- completar campos;
- detectar pendientes;
- ver al costado cómo cambia el documento.

### Flujo 3: revisar y exportar

El usuario revisa:

- carátula;
- tabla de contenidos;
- secciones llenas;
- pendientes o campos faltantes;
- exportación `.tex` y PDF.

## Principios

- La jerarquía del documento debe entenderse sin conocimiento técnico.
- Las acciones frecuentes deben aparecer por contexto, sin clic previo innecesario.
- Cada pantalla debe tener un propósito dominante.
- El mismo lenguaje visual debe repetirse en editor, formulario y preview.
- Reducir ruido: menos controles permanentes, más prioridad al contenido.
- No introducir patrones visuales diferentes para resolver el mismo problema.
- Cada mejora debe reforzar un flujo completo, no un detalle suelto.

## Sistema visual compartido

### A. Tipos de entidad

La UI debe diferenciar claramente:

- `Sección principal`
- `Subsección`
- `Contenido`
- `Campo obligatorio`
- `Elemento con IA`
- `Elemento con medios`

### B. Profundidad

La profundidad no debe depender solo de números.
Debe reflejarse en:

- indentación real;
- conectores verticales y horizontales;
- cambio sutil de fondo;
- menor ancho disponible según profundidad;
- texto contextual tipo `Dentro de ...`.

### C. Estados

Todos los paneles deben compartir la misma lógica de estados:

- `hover`
- `focus`
- `selected`
- `dragging`
- `drop target`
- `pending`
- `complete`
- `error`

### D. Jerarquía de acciones

Separar acciones por nivel:

- `primarias`: insertar, mover, completar, exportar;
- `secundarias`: renombrar, configurar propiedades avanzadas;
- `destructivas`: eliminar.

### E. Densidad

- navegación: compacta;
- edición: media;
- preview: amplia.

## Lenguaje del producto

### Términos recomendados

Usar:

- `Documento`
- `Sección`
- `Subsección`
- `Contenido`
- `Campo`
- `Vista previa`
- `Pendiente`
- `Obligatorio`
- `Dentro de`

### Términos a evitar o limitar

- `canvas`
- `nodo`
- `árbol` como etiqueta visible al usuario final;
- `bloque` si no aporta claridad;
- `estructura` cuando el usuario realmente espera `secciones del documento`.

## Arquitectura por pantalla

## 1. Editor

### Objetivo

Organizar la estructura del documento.

### Qué debe dominar visualmente

- la jerarquía;
- la posición del elemento actual;
- la posibilidad de insertar contenido o moverlo.

### Qué no debe dominar

- configuración avanzada;
- badges excesivos;
- controles técnicos permanentes;
- iconografía redundante.

### Diseño recomendado

- panel izquierdo: índice estructural resumido;
- panel central: estructura editable principal;
- panel derecho: propiedades del elemento.

### Criterios de aceptación

- un usuario debe distinguir secciones y subelementos en menos de 3 segundos;
- los hijos deben leerse como contenidos dentro del padre;
- las acciones rápidas deben aparecer con hover/focus, sin clic previo;
- arrastrar y soltar debe mostrar claramente arriba, dentro y abajo.

## 2. Formulario

### Objetivo

Completar el documento sin pensar en la implementación.

### Diseño recomendado

- columna izquierda: guía de secciones y progreso;
- columna central: formulario de la sección activa;
- columna derecha: preview sincronizado.

### Reglas

- mostrar agrupación por sección;
- mostrar pendientes por sección;
- permitir saltar a una sección;
- priorizar contexto y validación sobre densidad de controles.

### Criterios de aceptación

- el usuario sabe qué parte del documento está completando;
- puede ver qué falta sin recorrer todo;
- puede validar el impacto de su edición en el preview sin cambiar de pantalla.

## 3. Preview

### Objetivo

Ver el resultado del documento y exportarlo.

### Reglas

- el preview no debe sentirse como un modo aislado;
- debe heredar la lógica del formulario;
- debe señalar de qué sección vienen los vacíos;
- debe concentrar exportación e impresión.

### Criterios de aceptación

- el usuario identifica el documento final sin entender LaTeX;
- exportar TEX o PDF se percibe como un paso final, no técnico.

## 4. Carátula

### Objetivo

Editar metadatos e identidad visual.

### Reglas

- el preview de carátula debe ser inmediato;
- los campos deben leerse como datos de documento, no como configuración abstracta;
- mantener consistencia de lenguaje y validación con el resto del sistema.

## Backlog priorizado

## Prioridad alta

- consolidar el sistema visual de jerarquía del editor;
- agregar guía lateral por secciones al formulario;
- unificar estados `pendiente`, `obligatorio`, `completo`;
- limpiar lenguaje técnico visible al usuario;
- hacer que las acciones frecuentes aparezcan por hover/focus.

## Prioridad media

- consolidar menús contextuales para acciones secundarias;
- reducir badges redundantes;
- mejorar comportamiento móvil del formulario con preview;
- mostrar origen de pendientes en preview.

## Prioridad baja

- microanimaciones de navegación entre secciones;
- atajos de teclado visibles;
- personalización de densidad;
- mejoras estéticas de carátula y exportación.

## Plan de implementación

## Fase 1: Base visual

Entregables:

- reglas de profundidad;
- reglas de estados;
- tokens para badges;
- reglas de acciones visibles.

Resultado esperado:

- todas las pantallas comparten el mismo lenguaje visual.

## Fase 2: Editor

Entregables:

- jerarquía estructural estable;
- acciones rápidas por hover/focus;
- simplificación de controles secundarios;
- panel derecho más legible.

Resultado esperado:

- el editor se siente como un constructor de documento, no como un listado técnico.

## Fase 3: Formulario

Entregables:

- guía lateral por secciones;
- progreso por secciones;
- preview integrado;
- validación contextual.

Resultado esperado:

- el usuario completa el documento guiado por la estructura.

## Fase 4: Preview y exportación

Entregables:

- preview plenamente integrado;
- exportación contextual;
- indicadores de pendientes enlazados a secciones.

Resultado esperado:

- revisar y exportar se vuelve un flujo natural.

## Fase 5: Pulido

Entregables:

- accesibilidad;
- consistencia terminológica;
- limpieza visual;
- ajuste móvil y responsive.

## Riesgos

- mejorar un panel sin alinear el resto del sistema puede volver a fragmentar la experiencia;
- introducir demasiados badges o ayudas visuales puede volver a ensuciar el editor;
- mezclar estructura y edición de contenido en la misma capa visual puede reducir claridad;
- resolver solo desktop sin revisar móvil puede romper el flujo del formulario.

## Reglas de trabajo

- no hacer cambios nuevos sin mapear a qué flujo pertenecen;
- evitar cambios de UI solo porque "se ven mejor";
- cada iteración debe incluir verificación real con build;
- documentar cambios de criterio visual en este archivo.

## Criterios de aceptación globales

- un usuario no técnico entiende dónde está parado;
- un usuario no técnico distingue estructura de contenido;
- un usuario no técnico identifica qué falta;
- la exportación se siente como el final del flujo;
- el producto mantiene coherencia visual entre editor, formulario, preview y carátula.

## Próxima secuencia recomendada

1. terminar de consolidar el sistema visual del editor;
2. convertir el formulario en flujo guiado por secciones;
3. reforzar el preview integrado como resultado del formulario;
4. limpiar lenguaje y estados comunes;
5. pulir responsive, accesibilidad y exportación.
