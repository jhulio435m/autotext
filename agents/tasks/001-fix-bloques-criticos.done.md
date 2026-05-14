# Tarea: Corrección de Errores Críticos en Bloques Reutilizables

**Estado**: Pendiente
**ID**: TASK-001
**Módulo**: Bloques Reutilizables / Store

## 📝 Descripción
Se han identificado fallos críticos en el módulo de Bloques Reutilizables que comprometen la integridad de los datos y la funcionalidad del sistema. Esta tarea se centra en estabilizar el comportamiento de los bloques tipo tabla e imagen.

## 🔍 Observaciones Técnicas (Ref: Informe 4.3)
1.  **Pérdida de información (4.3.1)**: Al crear múltiples bloques tipo tabla, el sistema sobrescribe la información de bloques anteriores.
2.  **Falta de independencia (4.3.2)**: Los bloques generan conflictos entre sí al ser modificados simultáneamente.
3.  **Inconsistencia de tipos (4.3.3)**: Los bloques de tipo imagen son interpretados erróneamente como tablas al ser insertados.

## 🎯 Objetivos de la Tarea
- [ ] Investigar la lógica de persistencia en `src/store/` y cómo se generan los IDs o claves de los bloques.
- [ ] Asegurar que cada bloque tenga un identificador único global (UUID) que no colisione.
- [ ] Corregir la lógica de renderizado/inserción para que los bloques de imagen mantengan su tipo y no se transformen en tablas.
- [ ] Verificar que la edición de un bloque no afecte a otros bloques existentes en la biblioteca o en el documento.

## 🛠️ Archivos Clave Potenciales
- `src/store/slices/` (especialmente lo relacionado con blocks o document)
- `src/components/ProjectDataEditor/BlocksTab.jsx`
- `src/components/DocumentBuilder.jsx`
- `src/utils/document.js`

## ✅ Criterios de Aceptación
1.  Crear 3 tablas diferentes en la biblioteca de bloques y verificar que cada una mantenga su propio contenido sin sobrescribirse.
2.  Insertar un bloque de imagen y confirmar que se visualiza como imagen y no como estructura de tabla.
3.  Modificar el contenido de un bloque "A" y asegurar que el bloque "B" no cambie.
4.  **REGLA DE CIERRE**: Una vez verificado, renombrar este archivo a `001-fix-bloques-criticos.done.md`.

---
**Nota para el agente**: Recuerda crear una rama `task/fix-bloques-criticos` antes de empezar.
