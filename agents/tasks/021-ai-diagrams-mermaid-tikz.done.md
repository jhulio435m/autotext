# Tarea: Generacion de Diagramas Asistida por IA (Mermaid/TikZ)

**Modulo**: IA / Editor / UI
**Prioridad**: Media
**Estado**: Pendiente

## Contexto

Los documentos tecnicos dependen criticamente de diagramas de flujo, arquitectura y diagramas de secuencia. Generarlos manualmente es lento; la IA puede acelerar este proceso generando el codigo fuente del diagrama a partir de descripciones.

## Objetivos

- [ ] **Generador de Codigo de Diagramas**:
  - [ ] Backend: Prompt especializado que reciba una descripcion y devuelva codigo Mermaid.js (para web) o TikZ (para LaTeX).
  - [ ] Frontend: Bloque especial de "Diagrama" que permite ingresar un prompt.
- [ ] **Previsualizacion Viva**:
  - [ ] Integrar la libreria Mermaid.js en el editor para renderizar el diagrama mientras se edita el codigo.
- [ ] **Exportacion Profesional**:
  - [ ] Al exportar a LaTeX, convertir el diagrama a codigo TikZ o generar una imagen (SVG/PNG) de alta calidad para incluir en el PDF.

## Criterios de Aceptacion

1. El usuario puede escribir "Genera un diagrama de flujo de un proceso de aprobacion" y obtener un diagrama visual.
2. El codigo del diagrama es editable manualmente despues de la generacion.
3. Los diagramas se ven correctamente en la "Vista Previa" del documento.
4. El PDF generado contiene el diagrama con resolucion profesional.
5. **REGLA DE CIERRE**: una vez verificado, renombrar este archivo a `021-ai-diagrams-mermaid-tikz.done.md`.
