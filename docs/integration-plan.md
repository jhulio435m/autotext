# Plan de Integracion del Proyecto (Autotext + Plane)

## Objetivo
Unificar el proyecto para que pueda operar en 3 modos de forma controlada, con el menor cambio de codigo:

- `local`: demo/local sin dependencias externas.
- `plane-db`: lectura de Plane desde PostgreSQL.
- `plane-api`: lectura de Plane via API v1 + API key.

Nota: El modo `frappe` fue eliminado del proyecto (directorio frappe/, perfiles de entorno, funciones backend, tests y documentación).

## Estado actual implementado

### Fase 1 - Base de integración
- Perfiles de entorno listos en `env/profiles/` (local, plane-db, plane-api).
- Script de conmutacion `scripts/use-profile.sh`.
- Endpoint de diagnostico `GET /api/integration/status`.
- Scripts npm para conmutar perfil y correr en modo publico (SSH/LAN).
- Estandarizacion de configuraciones por perfil.
- Diagnostico rapido de proveedores (DB/Plane API).
- Arranque publico para acceso remoto por IP.

### Fase 2 - UI de integración
- Selector visual de modo en Dashboard para `local`, `plane-db` y `plane-api`.
- Banner de salud en el header con estado resumido del modo activo.
- Validaciones visibles por modo y advertencia de reinicio pendiente tras aplicar perfil.
- Monitoreo de proveedores en frontend con polling sobre `/api/integration/status` y `/api/integration/profiles`.
- `Dashboard`: tarjeta de integración para seleccionar perfil, aplicar cambio y ver validaciones.
- `Header`: badge persistente con modo activo y salud resumida.
- `Monitoreo`: tarjetas de estado para Plane DB, Plane API y App DB.

### Fase 3 - Arquitectura de capas (TASK-002/003)
- Capa `server/core` con mappers de datos (`plane-mapper.js`).
- Capa `server/infrastructure` con clientes de API y repositorios.
- Capa `server/features` con orquestación (`data-provider.js`, `sync/sync-projects.js`).
- Adaptadores: `PlaneDbProvider`, `PlaneApiProvider`.
- Contrato único de respuesta para frontend.
- Test de contrato por proveedor.
- `sync-projects.js` ahora soporta ambos proveedores (DB y API) detectando el modo activo.

### Fase 4 - Resiliencia (TASK-009)
- Circuit breaker implementado en `server/infrastructure/circuit-breaker.js` (threshold 3, reset 30s).
- Retry con exponential backoff (1s, 2s, 4s, 3 intentos) en `fetchPlaneApiJson`.
- Logging estructurado en JSON en `server/infrastructure/logger.js`.
- Tests unitarios para circuit breaker y logger.

### Fase 5 - Pendiente
- Pipeline de despliegue por entorno (dev/staging/prod) basado en perfiles.
- Checklist operativo y runbook de incidentes.

## Correcciones técnicas aplicadas

### Schema-drift (TASK-006)
- Se agregaron 6 tablas faltantes a `server/db/schema.sql`: `app_document_nodes`, `app_document_values`, `app_project_blocks`, `app_block_table_columns`, `app_block_table_rows`, `app_block_table_cells`.
- Script de migración: `server/scripts/migrate-006-schema-drift.js`.

### Tests (TASK-008)
- Tests unitarios para `workspace-store.js` (antes 0% coverage): 9 tests cubriendo loadWorkspaceState, loadDocumentState, saveWorkspaceState y sparse save protection.

### Preview integrado (TASK-010)
- Ruta `/preview` ahora muestra vista de solo lectura del documento.
- Botón "Vista previa" en el header entre Constructor y Datos.

### AI generation (TASK-011)
- Reemplazado mock con `setTimeout` por llamada real a `/api/ai/generate`.

## Nota operativa

- Cambiar perfil desde la UI persiste los archivos de entorno via `POST /api/integration/profile`.
- El backend responde `restartRequired`; por eso la interfaz deja explícito que hay que reiniciar `dev:web` y `dev:api` para completar la conmutación.

## Operacion diaria recomendada

1. Elegir perfil:
   - `npm run profile:plane-db`
   - `npm run profile:plane-api`
2. Levantar app remota:
   - `npm run dev:full:public`
3. Verificar salud:
   - `curl http://127.0.0.1:4000/api/integration/status`

## Riesgos y mitigacion

- Riesgo: credenciales faltantes en `plane-api`.
  - Mitigacion: `integration/status` reporta campos faltantes.
- Riesgo: cambios de esquema en Plane DB.
  - Mitigacion: mantener `plane-api` como fallback.
- Riesgo: CORS/puertos en acceso SSH/LAN.
  - Mitigacion: usar `dev:full:public` + reglas firewall.
