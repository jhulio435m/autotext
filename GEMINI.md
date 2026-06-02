# Instrucciones para Agentes Gemini

Este archivo contiene mandatos fundamentales que deben seguirse en este repositorio.

## 🤖 Directorio de Agentes
Consulta el archivo `agents/AGENTS.md` para entender la arquitectura del proyecto, las tecnologías utilizadas y el flujo de trabajo esperado.

## ✅ Flujo de Tareas y Git
Cuando trabajes en una tarea asignada en `agents/tasks/`:
1. **No toques `main`**: Antes de empezar, crea una rama descriptiva siguiendo el patrón `task/nombre-de-la-tarea`.
2. Completa la implementación y verifica los cambios con tests.
3. **Mandato Obligatorio**: Al finalizar la tarea, renombra el archivo de la tarea original para incluir el sufijo `.done`.
   - Comando sugerido: `mv agents/tasks/nombre-tarea.md agents/tasks/nombre-tarea.done.md`
4. Realiza los commits en tu rama y notifica cuando esté lista para revisión.

## 🛠️ Estándares de Código
- Mantén la consistencia con React 19 y Tailwind CSS 4.
- Usa los tests integrados de Node.js en `test/`.
