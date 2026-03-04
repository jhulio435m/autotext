# Esquema Plane (resumen operativo)

Base inspeccionada: `plane`  
Schema: `public`  
Fecha de inspeccion: `2026-03-03`

## Tabla `projects` (principal para dashboard)

Columnas clave para consumir:
- `id` (uuid)
- `workspace_id` (uuid)
- `name` (varchar)
- `identifier` (varchar)
- `description` (text)
- `cover_image` (text)
- `cover_image_asset_id` (uuid)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

Columnas de control que debes respetar:
- `deleted_at` (timestamptz): borrado logico
- `archived_at` (timestamptz): archivado

Regla recomendada para proyectos activos:
- `deleted_at IS NULL AND archived_at IS NULL`

Conteo real observado:
- Total: `13`
- Eliminados (deleted_at no nulo): `7`
- Activos: `6`

## Tabla `file_assets` (assets, incluida portada)

Columnas utiles:
- `id` (uuid)
- `asset` (varchar)
- `workspace_id` (uuid)
- `project_id` (uuid)
- `entity_type` (varchar)
- `storage_metadata` (jsonb)
- `is_deleted` (bool)
- `deleted_at` (timestamptz)
- `is_archived` (bool)

Uso recomendado:
- Resolver metadata/archivo cuando tengas `cover_image_asset_id`.
- Filtrar `is_deleted = false` y `deleted_at IS NULL`.

## Tabla `workspaces`

Columnas utiles:
- `id` (uuid)
- `name` (varchar)
- `slug` (varchar)
- `logo` (text)
- `timezone` (varchar)
- `deleted_at` (timestamptz)

## Tabla `project_members`

Columnas utiles:
- `project_id` (uuid)
- `member_id` (uuid)
- `role` (smallint)
- `is_active` (bool)
- `deleted_at` (timestamptz)

## Qué usar y qué no (practico)

Usar para lista de proyectos:
- `projects.id, name, identifier, description, workspace_id, cover_image, cover_image_asset_id, created_at, updated_at`

No usar para mostrar proyectos activos:
- Registros con `projects.deleted_at IS NOT NULL`
- Registros con `projects.archived_at IS NOT NULL`

Si necesitas portadas:
- Primero `projects.cover_image` (ruta/url directa)
- Si requieres metadata extendida, unir con `file_assets` usando `cover_image_asset_id`

## Documentos Automatizables por proyecto

Tablas a usar:
- `issues` (documentos/entidades por proyecto)
- `issue_labels` (relacion many-to-many issue-label)
- `labels` (catálogo de etiquetas)

Filtro acordado:
- `LOWER(labels.name) = 'automatizable'`
- `issues.project_id = :projectId`
- `issues.deleted_at IS NULL`
- `issues.archived_at IS NULL`
- `issue_labels.deleted_at IS NULL`
- `labels.deleted_at IS NULL`

SQL base:

```sql
SELECT i.id, i.name, i.description_stripped, i.updated_at
FROM issues i
JOIN issue_labels il ON il.issue_id = i.id AND il.deleted_at IS NULL
JOIN labels l ON l.id = il.label_id AND l.deleted_at IS NULL
WHERE i.project_id = :project_id
  AND LOWER(l.name) = 'automatizable'
  AND i.deleted_at IS NULL
  AND i.archived_at IS NULL
ORDER BY i.updated_at DESC;
```
