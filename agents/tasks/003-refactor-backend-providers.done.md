# Tarea: Estandarización de Proveedores de Datos (Backend)

**Estado**: Pendiente
**ID**: TASK-003
**Módulo**: Backend / Core / Infrastructure

## 📝 Descripción
Continuando con la refactorización arquitectónica (TASK-002), es necesario estandarizar cómo el sistema obtiene Issues y Proyectos de diferentes fuentes (Plane API, Plane DB, Local) bajo un "Contrato Único". El frontend no debe saber si los datos vienen de una API o de una base de datos.

## 🎯 Objetivos de la Tarea
- [ ] **Mapeo de Issues**: Refactorizar la lógica de obtención de issues en `server/providers/plane-db.js` y `server/services/plane-api.js` hacia `server/infrastructure/` y `server/core/plane-mapper.js`.
- [ ] **Abstracción de Proveedores**: Crear un servicio en `server/features/data-provider.js` (o similar) que actúe como punto único de consulta, decidiendo qué fuente usar según la configuración.
- [ ] **Contrato Único**: Asegurar que las respuestas de todos los proveedores tengan la misma estructura (normalizada en `core/`).
- [ ] **Limpieza**: Eliminar lógica redundante en las rutas y consolidar el uso de `core/plane-mapper.js`.

## ✅ Criterios de Aceptación
1.  Las rutas de Express (`/api/plane/projects`, `/api/plane/issues`) solo llaman al `dataProvider` y no contienen lógica de filtrado o mapeo.
2.  Existe una interfaz o patrón consistente para agregar nuevos proveedores (ej: Frappe) en el futuro.
3.  Los tests de integración (si existen) pasan correctamente.
4.  **REGLA DE CIERRE**: Una vez verificado, renombrar a `003-refactor-backend-providers.done.md`.
