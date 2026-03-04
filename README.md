# Autotext + Puente a DB remota (LAN/SSH)

Este proyecto ahora tiene:
- Frontend Vite/React (`src/`)
- API Node/Express (`server/index.js`)
- Modo puente para PostgreSQL remoto por SSH
- Stack ERPNext/Frappe en Docker (`frappe/`)

## Frappe/ERPNext (app tipo ERP)

Si quieres operar como ERP (backend Frappe completo), usa:

```powershell
Copy-Item .\frappe\.env.example .\frappe\.env
npm run erp:init
npm run erp:up
```

Acceso por defecto:

- URL: `http://localhost:8088`
- Usuario: `Administrator`
- Password: el valor `SITE_ADMIN_PASSWORD` de `frappe/.env`

Referencia:

- `frappe/README.md`

## 1) Configurar variables de entorno

1. Copia `.env.example` a `.env` (frontend).
2. Copia `server/.env.example` a `server/.env` (backend).
3. Edita `server/.env` con credenciales reales de PostgreSQL.

## 2) Abrir tunel SSH hacia tu servidor Linux

Mantén una terminal abierta:

```powershell
powershell -ExecutionPolicy Bypass -File server\scripts\open-tunnel.ps1
```

Script por defecto:
- SSH: `yeul@100.115.3.37`
- Tunel: `localhost:5432 -> 127.0.0.1:5432` en el Linux

Si tu PostgreSQL usa otro puerto remoto:

```powershell
powershell -ExecutionPolicy Bypass -File server\scripts\open-tunnel.ps1 -RemotePort 5433
```

## 3) Ejecutar API en modo puente

Opcion A (una sola terminal):

```bash
npm run dev:full
```

Opcion B (dos terminales):

```bash
npm run dev:api
```

```bash
npm run dev:web
```

Frontend: `http://127.0.0.1:5173`  
API: `http://127.0.0.1:4000`

## 4) Verificar puente

Con la API arriba y el tunel activo:

```bash
curl http://127.0.0.1:4000/api/bridge/health
```

```bash
curl "http://127.0.0.1:4000/api/bridge/tables?schema=public"
```

Si esos dos responden `ok: true`, el puente ya esta listo.

Lectura de proyectos de Plane (solo puente):

```bash
curl "http://127.0.0.1:4000/api/plane/projects"
```

Opcionales:
- `?schema=public`
- `?limit=100`
- `?workspaceId=<id>` (si existe columna `workspace_id`)
- `?includeDeleted=true` (incluye borrado logico)
- `?includeArchived=true` (incluye archivados)

Por defecto el endpoint excluye:
- `deleted_at IS NOT NULL`
- `archived_at IS NOT NULL`

## 5) Frontend (por ahora sin endpoints de negocio)

Por defecto el frontend queda en modo local:
- `VITE_USE_API_AUTH=false`
- `VITE_USE_API_WORKSPACE=false`
- `VITE_USE_PLANE_PROJECTS=false`
- `VITE_USE_PLANE_PROJECT_ISSUES=false`

Cuando definamos endpoints, se activan en `.env`.

## Endpoints

- `GET /api/health`
- `GET /api/bridge/health`
- `GET /api/bridge/tables?schema=public`
- `GET /api/plane/projects`
- `GET /api/plane/projects/:projectId/issues?label=Automatizable`

Esquema recomendado para integraciones:
- `docs/plane-db-schema.md`

## Opcional (mas adelante)

Si luego quieres activar endpoints de aplicacion:
- `BRIDGE_ONLY=false`
- `ENABLE_APP_ENDPOINTS=true`
