# Task 024: Delete endpoints para proyectos y documentos

## Objetivo
Permitir eliminar proyectos y documentos via API con interfaz de usuario.

## Cambios

### Backend
- `server/routes/workspace.js` — Nuevo `DELETE /api/projects/:projectId` y `DELETE /api/documents/:projectId/:documentId`
  - Verifican ownership (user_id) antes de eliminar
  - Retornan 404 si no existe o no pertenece al usuario
  - CASCADE de BD maneja datos relacionados

### Frontend
- `src/api/client.js` — `apiDeleteProject()` y `apiDeleteDocument()`
- `src/components/ProjectCard.jsx` — Botón de eliminar con icono Trash2 (opcional via prop onDelete)
- `src/components/DocumentCard.jsx` — Botón de eliminar (solo documentos locales, no Plane issues)
- `src/pages/Dashboard/index.jsx` — ConfirmDialog antes de eliminar proyecto, llama a `removeProject` del store
- `src/pages/Project/index.jsx` — ConfirmDialog antes de eliminar documento, llama a `removeDocument` del store

## Verificación
- `npm test`: 92 tests pass
- `npm run build`: compila sin errores
