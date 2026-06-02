# Tarea: Historial de Versiones Visual y Comparacion (Diff)

**Modulo**: Datos / UX / Documentos
**Prioridad**: Media
**Estado**: Pendiente

## Contexto

El sistema ya realiza snapshots automaticos durante el guardado (autosave), pero no hay una forma amigable para que el usuario explore el historial, compare cambios o restaure una version anterior.

## Objetivos

- [ ] **Explorador de Historial**:
  - [ ] Frontend: Interfaz de timeline que muestre los hitos de guardado (manuales y automaticos).
  - [ ] Permitir ponerle "nombre" a una version especifica (ej: "Version para revision inicial").
- [ ] **Visualizador de Cambios (Diff)**:
  - [ ] Implementar una vista comparativa (lado a lado o unificada) para ver que texto o datos cambiaron entre dos versiones.
  - [ ] Soportar comparacion no solo de texto, sino de cambios en la estructura de bloques o variables.
- [ ] **Restauracion Segura**:
  - [ ] Funcionalidad para revertir el documento a un estado anterior, creando un nuevo snapshot del estado actual antes de sobreescribir.

## Criterios de Aceptacion

1. El usuario puede ver una lista de versiones pasadas con fecha y autor.
2. Es posible seleccionar dos versiones y ver las diferencias resaltadas (añadido/eliminado).
3. La restauracion de una version anterior funciona y no causa perdida de datos (se guarda snapshot del presente).
4. El sistema mantiene la integridad de las variables y datos estructurados al revertir.
5. **REGLA DE CIERRE**: una vez verificado, renombrar este archivo a `019-version-history-diff.done.md`.
