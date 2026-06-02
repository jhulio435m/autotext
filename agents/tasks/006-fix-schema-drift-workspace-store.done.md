# Tarea: Corregir Schema-Drift en workspace-store.js

**Estado**: Pendiente
**ID**: TASK-006
**Módulo**: Backend / DB / Core

## 📝 Descripción
El archivo `server/workspace-store.js` referencia tablas que **no existen** en `server/db/schema.sql`. Esto causará errores en runtime al ejecutar funciones como `syncDocumentNodes()`, `syncDocumentValues()` y `syncProjectBlock()`. Es necesario sincronizar el schema de BD con el código.

## 🔍 Tablas Referenciadas pero No Existentes
- `app_document_nodes`
- `app_document_values`
- `app_project_blocks`
- `app_block_table_columns`
- `app_block_table_rows`
- `app_block_table_cells`

## 🎯 Objetivos de la Tarea
- [ ] Investigar el uso de cada tabla faltante en `server/workspace-store.js`.
- [ ] Agregar las tablas faltantes a `server/db/schema.sql`.
- [ ] Crear un script de migración en `server/scripts/migrate-006-schema-drift.js` para añadir las tablas a la BD existente.
- [ ] Verificar que las funciones que usan estas tablas no fallen con la BD actualizada.
- [ ] Ejecutar los tests existentes para confirmar que no se rompe nada.

## 🛠️ Archivos Clave
- `server/workspace-store.js`
- `server/db/schema.sql`
- `server/scripts/init-db.js`

## ✅ Criterios de Aceptación
1. Todas las tablas referenciadas en `workspace-store.js` existen en `schema.sql`.
2. El script de migración `migrate-006-schema-drift.js` se ejecuta sin errores.
3. `npm test` pasa correctamente.
4. **REGLA DE CIERRE**: Una vez verificado, renombrar a `006-fix-schema-drift-workspace-store.done.md`.
