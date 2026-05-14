# Tarea: Corregir AI Mock y Reactivar HtmlCoverGallery

**Estado**: Pendiente
**ID**: TASK-011
**Módulo**: Frontend / UI / AI

## 📝 Descripción
Dos issues menores pero importantes: (1) El botón "Generar con IA" en FormField usa un `setTimeout` mock en vez de llamar realmente a la API; (2) La galería de carátulas HTML está comentada/desactivada pero el código existe.

## 🎯 Objetivos de la Tarea
- [ ] **Fix AI Generation Mock**: Reemplazar el `setTimeout` simulado en `src/components/FormField.jsx` con una llamada real a `POST /api/ai/generate`.
- [ ] **Reactivar HtmlCoverGallery**: 
  - Descomentar las secciones de carátula HTML en `src/components/Preview/index.jsx` y `src/components/ProjectDataEditor/index.jsx`.
  - Verificar que `HtmlCoverGallery.jsx` funciona correctamente.
  - Probar que los estilos de carátula (editorial, minimal, institucional, etc.) se renderizan bien.

## 🛠️ Archivos Clave
- `src/components/FormField.jsx`
- `src/components/Preview/index.jsx`
- `src/components/Preview/HtmlCoverGallery.jsx`
- `src/components/ProjectDataEditor/index.jsx`
- `src/api/client.js`

## ✅ Criterios de Aceptación
1. El botón "Generar con IA" en FormField llama a la API real (`/api/ai/generate`) y muestra el resultado.
2. La galería de carátulas HTML está visible y funcional en Preview y ProjectDataEditor.
3. `npm test` pasa correctamente.
4. **REGLA DE CIERRE**: Una vez verificado, renombrar a `011-fix-ai-mock-html-cover.done.md`.
