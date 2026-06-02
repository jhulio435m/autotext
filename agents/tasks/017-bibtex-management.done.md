# Tarea: Gestion de Bibliografia y Referencias (BibTeX)

**Modulo**: Editor / Exportacion / LaTeX
**Prioridad**: Alta
**Estado**: Pendiente

## Contexto

Los documentos tecnicos y academicos requieren una gestion rigurosa de citas y bibliografia. Actualmente el sistema genera documentos profesionales en LaTeX pero carece de un mecanismo para gestionar archivos `.bib` y referenciar entradas dentro del contenido de los bloques.

## Objetivos

- [ ] **Estructura de Datos**:
  - [ ] Backend: Agregar soporte en la base de datos para almacenar registros bibliograficos asociados a un proyecto o documento.
  - [ ] Backend: Permitir la importacion/exportacion de archivos `.bib` (BibTeX).
- [ ] **Interfaz de Usuario (Frontend)**:
  - [ ] Crear un gestor de referencias donde el usuario pueda añadir manual o via BibTeX sus fuentes.
  - [ ] Añadir un "Insertador de Citas" en el editor de texto (Rich Text) para buscar y seleccionar llaves de cita (ej: `\cite{autor2024}`).
- [ ] **Motor de Exportacion**:
  - [ ] Integrar `biblatex` o `natbib` en el motor de generacion de LaTeX.
  - [ ] Asegurar que el archivo `.bib` se incluya en el paquete de exportacion (ZIP) o se procese correctamente en la generacion de PDF.
- [ ] **Validacion**:
  - [ ] Advertir al usuario si hay citas en el texto que no existen en el archivo bibliografico.

## Criterios de Aceptacion

1. El usuario puede subir un archivo `.bib` y ver la lista de referencias en el sistema.
2. Es posible insertar una cita en un bloque de texto mediante un buscador.
3. El PDF generado incluye la seccion de "Bibliografía" con el formato correcto.
4. Las citas en el texto se vinculan correctamente a la bibliografia al exportar.
5. **REGLA DE CIERRE**: una vez verificado, renombrar este archivo a `017-bibtex-management.done.md`.
