# Tarea: UI/UX Fase 4 - Preview Integrado y Exportación

**Estado**: Pendiente
**ID**: TASK-010
**Módulo**: Frontend / Preview / Export

## 📝 Descripción
Implementar la Fase 4 del Plan UI/UX (`docs/ui-ux-plan.md`): preview plenamente integrado como resultado del formulario, exportación contextual, e indicadores de pendientes enlazados a secciones.

## 🎯 Objetivos de la Tarea
- [ ] **Preview Integrado**: Hacer que el preview en el formulario muestre el documento completo en tiempo real, heredando la lógica de estados del formulario.
- [ ] **Indicadores de Pendientes**: En el preview, señalar de qué sección vienen los campos vacíos o incompletos, con enlaces para saltar a la sección correspondiente.
- [ ] **Exportación Contextual**: Agregar botones de exportación (TEX/PDF) en el preview del formulario, no solo en la vista avanzada.
- [ ] **Ruta de Preview**: Habilitar la ruta `/proyecto/:id/documento/:docId/preview` (actualmente redirige al constructor).

## 🛠️ Archivos Clave
- `src/components/Preview/index.jsx`
- `src/components/DocumentBuilder.jsx`
- `src/components/DocumentSectionSidebar.jsx`
- `src/routes/index.jsx`
- `docs/ui-ux-plan.md`

## ✅ Criterios de Aceptación
1. El preview en modo formulario muestra el documento completo sincronizado.
2. Los campos pendientes en el preview tienen indicadores que enlazan a la sección en el formulario.
3. Se puede exportar TEX/PDF directamente desde la vista de formulario.
4. La ruta `/preview` muestra el documento en modo revisión.
5. `npm test` pasa correctamente.
6. **REGLA DE CIERRE**: Una vez verificado, renombrar a `010-ux-fase4-preview-integrado.done.md`.
