# Tarea: Mejora de Experiencia de Usuario (Editor y Formulario)

**Estado**: Pendiente
**ID**: TASK-005
**Módulo**: Frontend / UI / UX

## 📝 Descripción
Implementar las mejoras de prioridad alta del Plan UI/UX. El objetivo es que el editor sea más intuitivo jerárquicamente y que el formulario de edición sea fácil de navegar en documentos largos.

## 🎯 Objetivos de la Tarea
- [ ] **Jerarquía Visual del Editor**:
    - Implementar indentación real basada en el `level` de la sección.
    - Añadir conectores visuales (líneas guía) entre padres e hijos.
    - Diferenciar visualmente Secciones de Bloques de contenido.
- [ ] **Navegación Lateral (Sidebar) en Formulario**:
    - Añadir una barra lateral en la vista de edición de documento que permita saltar rápidamente entre secciones.
    - Mostrar el progreso de completitud (checkmarks) en la barra lateral.
- [ ] **Unificación de Estados**:
    - Estandarizar el diseño de los estados `pendiente`, `obligatorio` y `completo` en todo el sistema.
- [ ] **Acciones Contextuales**:
    - Hacer que botones de "Agregar" o "Eliminar" aparezcan solo con `hover` para reducir ruido visual.

## ✅ Criterios de Aceptación
1.  Un usuario puede distinguir la estructura del documento de un vistazo.
2.  La navegación por secciones en el formulario elimina la necesidad de scroll excesivo.
3.  El lenguaje técnico (`nodo`, `id`) está oculto tras etiquetas amigables.
4.  **REGLA DE CIERRE**: Una vez verificado, renombrar a `005-ux-editor-hierarchy-sidebar.done.md`.
