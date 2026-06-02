import { apiListTemplates, apiSaveTemplate } from '../../api/client';
import { SYSTEM_TEMPLATES } from '../../data/systemTemplates';

function normalizeTemplateRecord(template) {
  if (!template || typeof template !== 'object') return null;

  const id = String(template.id || template.slug || '');
  const slug = String(template.slug || template.id || '');
  const name = String(template.name || template.slug || 'Plantilla');
  const data = Array.isArray(template.data) ? template.data : Array.isArray(template.structure) ? template.structure : [];

  if (!id || !slug) return null;

  return {
    id,
    slug,
    name,
    description: String(template.description || ''),
    data,
    isSystem: Boolean(template.isSystem || template.is_system)
  };
}

function createFallbackTemplates() {
  return SYSTEM_TEMPLATES.map((template) =>
    normalizeTemplateRecord({
      id: template.id,
      slug: template.slug || template.id,
      name: template.name,
      data: Array.isArray(template.data) ? template.data : template.structure,
      isSystem: true
    })
  ).filter(Boolean);
}

function createTemplateSlice(set, get) {
  return {
    templates: createFallbackTemplates(),
    templatesLoaded: false,

    setTemplates: (templates) => {
      const normalized = Array.isArray(templates) ? templates.map(normalizeTemplateRecord).filter(Boolean) : [];
      set({
        templates: normalized.length ? normalized : createFallbackTemplates(),
        templatesLoaded: true,
        templatesLoadError: null
      });
    },

    upsertTemplate: (template) => {
      const normalized = normalizeTemplateRecord(template);
      if (!normalized) return null;

      set((state) => ({
        templates: [normalized, ...state.templates.filter((item) => item.slug !== normalized.slug)],
        templatesLoadError: null
      }));

      return normalized;
    },

    loadTemplates: async () => {
      if (get().templatesLoaded) {
        return get().templates;
      }

      try {
        const payload = await apiListTemplates();
        const normalized = Array.isArray(payload?.templates)
          ? payload.templates.map(normalizeTemplateRecord).filter(Boolean)
          : [];
        const next = normalized.length ? normalized : createFallbackTemplates();
        set({
          templates: next,
          templatesLoaded: true,
          templatesLoadError: null
        });
        return next;
      } catch (error) {
        const fallback = createFallbackTemplates();
        const message = `No se pudieron cargar las plantillas guardadas: ${error?.message || 'error desconocido'}`;
        get().pushToast(message, 'warning');
        set({
          templates: fallback,
          templatesLoaded: true,
          templatesLoadError: message
        });
        return fallback;
      }
    },

    saveTemplate: async (template) => {
      try {
        const payload = await apiSaveTemplate(template);
        const saved = normalizeTemplateRecord(payload?.template);
        if (saved) {
          get().upsertTemplate(saved);
          get().pushToast('Plantilla guardada en base de datos.', 'success');
        }
        return saved;
      } catch (error) {
        get().pushToast(`No se pudo guardar la plantilla: ${error?.message || 'error desconocido'}`, 'error');
        throw error;
      }
    }
  };
}

export { createTemplateSlice };
