# Tarea: Implementar Sincronización vía Plane API

**Estado**: Pendiente
**ID**: TASK-007
**Módulo**: Backend / Features / Sync

## 📝 Descripción
Actualmente `server/features/sync/sync-projects.js` solo funciona en modo Plane DB (`getProjectsFromPlaneDb`). Cuando el sistema opera en modo `plane-api`, la sincronización de proyectos no funciona. Hay que implementar una variante que use Plane API para la sincronización.

## 🎯 Objetivos de la Tarea
- [ ] Implementar `getProjectsFromPlaneApi()` en `server/infrastructure/plane-api-provider.js` (o función equivalente) para obtener proyectos desde la API REST de Plane.
- [ ] Modificar `server/features/sync/sync-projects.js` para que acepte ambos proveedores (DB y API), usando el patrón strategy similar a `data-provider.js`.
- [ ] Resolver covers de proyectos desde Plane API (seguir redirecciones de assets).
- [ ] Crear tests unitarios para `sync-projects.js` con mock de proveedores.
- [ ] Verificar que la sincronización funciona en ambos modos.

## 🛠️ Archivos Clave
- `server/features/sync/sync-projects.js`
- `server/infrastructure/plane-api-provider.js`
- `server/infrastructure/plane-client.js`
- `server/features/data-provider.js`

## ✅ Criterios de Aceptación
1. `syncProjectsFromPlane()` funciona en modo `plane-api` (no solo DB).
2. Los proyectos sincronizados desde API mantienen covers e información completa.
3. El `data-provider` puede indicar qué proveedor de sync usar.
4. `npm test` pasa correctamente.
5. **REGLA DE CIERRE**: Una vez verificado, renombrar a `007-plane-api-sync-provider.done.md`.
