# Guía para Agentes de IA - Autotext

Bienvenido al proyecto **Autotext**. Esta guía describe la arquitectura, tecnologías y el flujo de trabajo para agentes de IA que colaboren en este repositorio.

## 🏗️ Estructura del Proyecto

- `/src`: Frontend desarrollado con React 19 y Vite.
  - `/components`: Componentes UI reutilizables.
  - `/pages`: Vistas principales de la aplicación.
  - `/store`: Gestión de estado con Zustand.
- `/server`: Backend desarrollado con Node.js y Express 5.
  - `/routes`: Endpoints de la API.
  - `/services`: Lógica de negocio y servicios externos.
  - `/db`: Esquemas y scripts de base de datos.
- `/docs`: Documentación técnica detallada y planes de integración.
- `/scripts`: Scripts de utilidad para despliegue y configuración.
- `/agents`: Directorio dedicado a la coordinación de agentes de IA.

## 🛠️ Tecnologías Principales

- **Frontend**: React 19, Vite, Tailwind CSS 4, Zustand, Tiptap (Editor de texto), KaTeX (Matemáticas).
- **Backend**: Node.js, Express 5, PostgreSQL.
- **Testing**: Node.js test runner integrado (`node --test`).
- **Infraestructura**: Docker, Cloudflare Tunnels para exposición pública.

## 🔄 Flujo de Trabajo (Git & Tareas)

1. **Gestión de Tareas**: Las tareas se asignan mediante archivos Markdown en el directorio `agents/tasks/`.
2. **Creación de Rama**: El agente **NUNCA** debe trabajar directamente en la rama `main`. Debe crear una rama nueva para cada tarea.
   - Formato: `task/[nombre-de-la-tarea]` o `fix/[bug-id]`.
   - Comando: `git checkout -b task/nombre-tarea`
3. **Ejecución**: El agente debe leer la tarea, investigar el código y realizar los cambios necesarios siguiendo las mejores prácticas del proyecto.
4. **Pruebas**: Siempre ejecutar los tests relevantes antes de dar por terminada una tarea (`npm test`).
5. **Finalización y Documentación**: Una vez que la tarea ha sido completada y verificada, el agente **DEBE** actualizar cualquier documentación técnica relevante en el directorio `/docs` para reflejar los cambios realizados. Finalmente, debe renombrar el archivo de la tarea agregando el sufijo `.done`.
   - Ejemplo: `agents/tasks/fix-bug.md` -> `agents/tasks/fix-bug.done.md`.
6. **Commits y PRs**:
   - Realizar commits descriptivos.
   - Si el agente tiene permisos, puede subir la rama; de lo contrario, debe indicar que los cambios están listos para ser revisados y fusionados.

## 📋 Reglas de Oro

- **Seguridad**: Nunca expongas credenciales o claves de API.
- **Calidad**: Mantén la consistencia de estilos y patrones de diseño existentes.
- **Validación**: No des por terminada una tarea sin verificar que los cambios funcionan como se espera.
- **Documentación**: Mantén los archivos en `/docs` siempre actualizados. Si cambias la arquitectura o añades una funcionalidad, la documentación debe reflejarlo inmediatamente.
