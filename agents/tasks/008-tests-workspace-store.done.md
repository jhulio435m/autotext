# Tarea: Tests para workspace-store.js

**Estado**: Pendiente
**ID**: TASK-008
**Módulo**: Backend / Testing

## 📝 Descripción
`server/workspace-store.js` es el módulo más grande del backend (307 líneas) con lógica crítica de CRUD de proyectos, documentos, y sincronización de datos. Sin embargo, tiene **0% de cobertura de tests**. Hay que crear tests unitarios que cubran todas las funciones principales.

## 🎯 Objetivos de la Tarea
- [ ] Identificar todas las funciones exportadas de `workspace-store.js`.
- [ ] Crear mocks para las dependencias de BD (`appPool.query`, etc.).
- [ ] Escribir tests unitarios en `test/workspace-store.test.js` para cada función:
  - CRUD de proyectos (`getProjects`, `addProject`, `updateProject`, `removeProject`)
  - CRUD de documentos (`getDocuments`, `addDocument`, `updateDocumentMeta`, `removeDocument`)
  - Sincronización (`syncDocumentNodes`, `syncDocumentValues`, `syncProjectBlock`)
  - Locks y versionado
- [ ] Asegurar que los tests corran con `node --test`.

## 🛠️ Archivos Clave
- `server/workspace-store.js`
- `test/` (directorio de tests existentes)

## ✅ Criterios de Aceptación
1. Cada función pública de `workspace-store.js` tiene al menos un test.
2. Los tests usan mocks para la BD, no requieren BD real.
3. `npm test` pasa correctamente.
4. **REGLA DE CIERRE**: Una vez verificado, renombrar a `008-tests-workspace-store.done.md`.
