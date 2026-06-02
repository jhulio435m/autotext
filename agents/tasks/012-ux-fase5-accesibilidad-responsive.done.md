# Tarea: UI/UX Fase 5 - Accesibilidad y Responsive

**Estado**: Pendiente
**ID**: TASK-012
**Módulo**: Frontend / UI / UX

## 📝 Descripción
Implementar la Fase 5 del Plan UI/UX (`docs/ui-ux-plan.md`): accesibilidad, consistencia terminológica, limpieza visual, y ajuste responsive/móvil.

## 🎯 Objetivos de la Tarea
- [ ] **Accesibilidad**: Agregar atributos ARIA, roles, y soporte de teclado a componentes clave (TreePanel, DragDropCanvas, Preview).
  - Navegación por tab en el editor.
  - `aria-label` en botones de acción.
  - Roles semánticos en la estructura del documento.
- [ ] **Consistencia Terminológica**: Revisar toda la UI para asegurar que no aparezcan términos técnicos (`nodo`, `id`, `canvas`, `árbol`) al usuario final.
  - Usar `Sección`, `Contenido`, `Campo`, `Documento` según el plan UI/UX.
- [ ] **Limpieza Visual**: Reducir badges redundantes, simplificar la interfaz del editor.
  - Revisar `Prioridad media` del backlog: menús contextuales, reducción de badges.
- [ ] **Responsive / Móvil**: Ajustar el layout del editor y formulario para pantallas pequeñas.
  - Sidebar colapsable en móvil.
  - Preview apilable debajo del formulario.
  - Navegación táctil.

## 🛠️ Archivos Clave
- `src/components/TreePanel/`
- `src/components/DragDropCanvas/`
- `src/components/Preview/`
- `src/components/DocumentBuilder.jsx`
- `src/pages/Document/`
- `docs/ui-ux-plan.md`

## ✅ Criterios de Aceptación
1. El editor es navegable por teclado (Tab, Enter, Escape).
2. No hay términos técnicos visibles al usuario final (`nodo`, `id`, `árbol` en etiquetas UI).
3. El layout se adapta a pantallas < 768px (móvil) sin romper la funcionalidad principal.
4. `npm test` pasa correctamente.
5. **REGLA DE CIERRE**: Una vez verificado, renombrar a `012-ux-fase5-accesibilidad-responsive.done.md`.
