# Frappe / ERPNext Stack (Docker)

Este directorio deja listo un backend ERPNext (sobre Frappe) para usarlo como base de una app tipo ERP.

## Requisitos

- Docker Desktop + Docker Compose plugin
- Al menos 6 GB RAM disponible para contenedores

## 1) Configuracion

```powershell
Copy-Item .\frappe\.env.example .\frappe\.env
```

Variables clave:

- `ERPNEXT_PORT`: puerto local del ERP (ej. `8088`)
- `FRAPPE_SITE_NAME`: nombre del sitio (ej. `autotext.localhost`)
- `DB_ROOT_PASSWORD`: password root MariaDB
- `SITE_ADMIN_PASSWORD`: password de `Administrator`

## 2) Levantar stack

Desde la raiz del repo:

```powershell
npm run erp:init
npm run erp:up
```

Acceso:

- URL: `http://localhost:<ERPNEXT_PORT>`
- Usuario: `Administrator`
- Password: `SITE_ADMIN_PASSWORD`

## 3) Comandos utiles

```powershell
npm run erp:logs
npm run erp:down
```

## 4) Estado actual

Este stack te da ERPNext funcional (Frappe backend + DB + workers + websocket + nginx).
La migracion de tus modulos actuales (`proyectos`, `documentos`, `editor`) a Doctypes de Frappe se puede hacer como siguiente fase.
