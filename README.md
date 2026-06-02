# Autotext + Puente a DB remota (LAN/SSH)

Este proyecto ahora tiene:
- Frontend Vite/React (`src/`)
- API Node/Express (`server/index.js`)
- Modo puente para PostgreSQL remoto por SSH
- CI base de GitHub Actions (`.github/workflows/ci.yml`, `codeql.yml`)
- Hardening básico del servidor: CORS por allowlist, límites de payload, rate limiting en IA y autenticación con bcrypt/JWT revocable
## 1) Configurar variables de entorno

1. Copia `.env.example` a `.env` (frontend).
2. Copia `server/.env.example` a `server/.env` (backend).
3. Edita `server/.env` con estas dos familias de variables:
   - `PLANE_DB_*`: lectura de Plane en modo solo lectura.
   - `APP_DB_*`: persistencia propia de la app (`app_users`, `app_workspaces`, `app_documents`).
   - Variables de seguridad opcionales:
     - `ALLOW_ALL_CORS=false`
     - `REQUEST_BODY_LIMIT_MB=25`
     - `API_AUTH_ENABLED=true`
     - `JWT_EXPIRES_IN=30m`
     - `AUTH_BCRYPT_COST=12`
     - `AUTH_PASSWORD_MIN_LENGTH=12`
     - `AUTH_FAILED_LOGIN_MAX=5`
     - `AUTH_LOCKOUT_MS=900000`
     - `AUTH_SESSION_COOKIE_ENABLED=false`
     - `AUTH_SESSION_COOKIE_SECURE=false`
     - `INTEGRATION_PROFILE_WRITE_ENABLED=false`
     - `AI_REQUIRE_AUTH=true`
     - `AI_RATE_LIMIT_WINDOW_MS=60000`
     - `AI_RATE_LIMIT_MAX_REQUESTS=12`
4. Si quieres usar Plane API (sin leer directo de BD), define:
   - `PLANE_BASE_URL` (ej: `https://plane.urriburuleon.com`)
   - `PLANE_WORKSPACE_SLUG`
   - `PLANE_API_KEY`

Tambien puedes aplicar perfiles prearmados:

```bash
npm run profile:list
npm run profile:plane-db
```

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

Si estas por SSH y necesitas acceso remoto por IP:

```bash
npm run dev:full:public
```

## 4) Verificar puente o API de Plane

Con la API arriba y el tunel activo:

```bash
curl http://127.0.0.1:4000/api/bridge/health
```

```bash
curl "http://127.0.0.1:4000/api/bridge/tables?schema=public"
```

Si esos dos responden `ok: true`, el puente ya esta listo.

Nota:
- Este proyecto no escribe en la BD de Plane. Solo la usa como fuente externa de lectura.
- La persistencia propia de la app debe vivir en `APP_DB_*`.
- Los JSON dinamicos de documentos ahora viven en `app_documents` como filas `JSONB` por `usuario + proyecto + documento`, no como un blob unico.

Si configuraste `PLANE_WORKSPACE_SLUG` + `PLANE_API_KEY`, estos endpoints usan Plane API (`/api/v1/...`) en vez de leer desde tablas:

```bash
curl "http://127.0.0.1:4000/api/plane/projects?limit=50"
```

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
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/integration/status`
- `GET /api/bridge/health`
- `GET /api/bridge/tables?schema=public`
- `GET /api/plane/projects`
- `GET /api/plane/projects/:projectId/issues?label=Automatizable`

Esquema recomendado para integraciones:
- `docs/plane-db-schema.md`
- `docs/integration-plan.md`

## Opcional (mas adelante)

Si luego quieres activar endpoints de aplicacion:
- `BRIDGE_ONLY=false`
- `ENABLE_APP_ENDPOINTS=true`

## Seguridad de autenticacion

La autenticacion usa `bcryptjs` con costo configurable y minimo efectivo `12` (`AUTH_BCRYPT_COST=12`). El seed admin de `npm run db:init` valida la politica de contrasenas antes de crear o actualizar el usuario.

Politica actual:
- Longitud minima por defecto: `12` caracteres.
- Rechaza contrasenas iguales al email o al usuario del email.
- Rechaza contrasenas comunes desde `server/security/common-passwords.txt` (SecLists `10k-most-common.txt`) mas una lista interna minima.
- Migra automaticamente hashes bcrypt con costo menor al configurado cuando el login es exitoso.

Proteccion anti fuerza bruta:
- Rate limit separado por IP y por email normalizado.
- Bloqueo temporal por usuario tras `AUTH_FAILED_LOGIN_MAX` fallos consecutivos.
- Respuestas genericas para fallos de login, evitando enumeracion de usuarios.

Sesiones:
- El access token JWT incluye `iat`, `exp` y `jti`.
- Cada `jti` se guarda hasheado en `app_user_sessions`; `POST /api/auth/logout` revoca la sesion.
- El frontend mantiene bearer tokens por compatibilidad. Si el despliegue usa HTTPS estable, se puede activar cookie `HttpOnly` con `AUTH_SESSION_COOKIE_ENABLED=true` y `AUTH_SESSION_COOKIE_SECURE=true`.

Endpoints de cuenta:
- `GET /api/auth/me`: devuelve el usuario autenticado (`id`, `email`, `name`, `role`).
- `PUT /api/auth/me`: actualiza el nombre visible del usuario autenticado.
- `POST /api/auth/change-password`: valida la contrasena actual, aplica la politica de contrasenas a la nueva y revoca las otras sesiones activas del mismo usuario conservando la sesion actual.
