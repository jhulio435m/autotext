import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Upload, X, Search, FileJson } from 'lucide-react';
import useDocumentStore from '../store';

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function TemplateLibraryDialog({ open, onClose, onImport, onImportFile, onSaveCurrent, currentStructure = [] }) {
  const fileInputRef = useRef(null);
  const templates = useDocumentStore((state) => state.templates);
  const templatesLoadError = useDocumentStore((state) => state.templatesLoadError);
  const loadTemplates = useDocumentStore((state) => state.loadTemplates);
  const saveTemplate = useDocumentStore((state) => state.saveTemplate);
  const pushToast = useDocumentStore((state) => state.pushToast);
  
  const [selectedSlug, setSelectedSlug] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [confirmImportOpen, setConfirmImportOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setSearchTerm('');
    loadTemplates()
      .then((next) => {
        if (cancelled) return;
        setSelectedSlug(next[0]?.slug || '');
      })
      .catch(() => {
        if (!cancelled) {
          setSelectedSlug('');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadTemplates, open]);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.slug === selectedSlug) || null,
    [selectedSlug, templates]
  );

  const filteredTemplates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return templates;
    return templates.filter((template) =>
      `${template.name || ''} ${template.description || ''}`.toLowerCase().includes(query)
    );
  }, [searchTerm, templates]);

  const selectedCustomTemplate = selectedTemplate && !selectedTemplate.isSystem ? selectedTemplate : null;

  const handleSave = async ({ mode }) => {
    const trimmedName = templateName.trim();
    const slug = slugify(trimmedName);

    if (!currentStructure.length) {
      pushToast('No hay estructura para guardar.', 'warning');
      return;
    }

    if (mode === 'new') {
      if (!trimmedName) {
        pushToast('Ingresa un nombre para la nueva plantilla.', 'warning');
        return;
      }

      const existingTemplate = templates.find((template) => template.slug === slug);
      if (existingTemplate) {
        pushToast('Ya existe una plantilla con ese nombre. Usa "Sobrescribir seleccionada" o cambia el nombre.', 'warning');
        return;
      }
    }

    if (mode === 'overwrite' && !selectedCustomTemplate) {
      pushToast('Selecciona una plantilla personalizada para sobrescribirla.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const nextTemplate =
        mode === 'overwrite'
          ? {
              slug: selectedCustomTemplate.slug,
              name: trimmedName || selectedCustomTemplate.name,
              description: templateDescription.trim() || selectedCustomTemplate.description || '',
              data: currentStructure
            }
          : {
              slug,
              name: trimmedName,
              description: templateDescription.trim(),
              data: currentStructure
            };

      const savedTemplate = await saveTemplate(nextTemplate);
      setSelectedSlug(savedTemplate?.slug || nextTemplate.slug);
      onSaveCurrent?.(savedTemplate || null);
      setTemplateName('');
      setTemplateDescription('');
    } catch {
      // Error feedback is handled in the store action.
    } finally {
      setSaving(false);
    }
  };

  const handleImportClick = () => {
    if (!selectedTemplate) return;
    if (currentStructure.length) {
      setConfirmImportOpen(true);
      return;
    }
    onImport?.(selectedTemplate.data);
  };

  const handleConfirmImport = () => {
    if (selectedTemplate) {
      onImport?.(selectedTemplate.data);
    }
    setConfirmImportOpen(false);
  };

  if (!open) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200'>
      <div className='flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden'>
        
        {/* Header */}
        <div className='flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50'>
          <div>
            <h2 className='text-lg font-bold text-slate-800'>Biblioteca de plantillas</h2>
            <p className='text-xs text-slate-500 mt-0.5'>Guarda, carga y sobrescribe estructuras de documentos.</p>
          </div>
          <button 
            type='button' 
            onClick={onClose}
            className='p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors'
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className='flex-1 overflow-y-auto min-h-0 bg-slate-50/30 p-6'>
          <div className='grid gap-6 md:grid-cols-[40%_60%] h-full'>
            
            {/* Left Column: List */}
            <div className='flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden max-h-[500px]'>
              <div className='px-4 py-3 border-b border-slate-200 bg-slate-50/50'>
                <h3 className='text-sm font-semibold text-slate-800'>Plantillas disponibles</h3>
              </div>
              
              <div className='p-3 border-b border-slate-100'>
                <div className='relative'>
                  <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                  <input
                    type='text'
                    className='w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-md focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition'
                    placeholder='Buscar plantilla...'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {templatesLoadError && (
                <div className='mx-3 mt-3 p-3 flex items-start gap-2 text-sm text-rose-700 bg-rose-50 rounded-lg border border-rose-200'>
                  <AlertCircle className='w-4 h-4 shrink-0 mt-0.5' />
                  <p>{templatesLoadError}</p>
                </div>
              )}

              <div className='flex-1 overflow-y-auto p-2'>
                {filteredTemplates.map((template) => (
                  <button
                    key={template.slug}
                    type='button'
                    className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition flex flex-col gap-0.5 ${
                      selectedSlug === template.slug
                        ? 'bg-sky-50 text-sky-900 ring-1 ring-sky-200'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                    onClick={() => setSelectedSlug(template.slug)}
                  >
                    <span className='text-sm font-medium line-clamp-1 border-slate-200'>{template.name}</span>
                    <span className={`text-[11px] line-clamp-1 ${selectedSlug === template.slug ? 'text-sky-600' : 'text-slate-500'}`}>
                      {template.description || (template.isSystem ? 'Sistema' : 'Personalizada')}
                    </span>
                  </button>
                ))}
                
                {!loading && !templates.length && !templatesLoadError && (
                  <p className='p-4 text-center text-sm text-slate-500'>No hay plantillas guardadas.</p>
                )}
                {!loading && Boolean(searchTerm.trim()) && !filteredTemplates.length && (
                  <p className='p-4 text-center text-sm text-slate-500'>No hay resultados para esa búsqueda.</p>
                )}
              </div>
            </div>

            {/* Right Column: Actions */}
            <div className='flex flex-col gap-6'>
              
              {/* Selected info card */}
              <div className='rounded-xl border border-slate-200 bg-slate-50 p-5'>
                <h3 className='text-[15px] font-semibold text-slate-900'>
                  {selectedTemplate?.name || 'Sin selección'}
                </h3>
                <p className='text-sm text-slate-600 mt-1 mb-3'>
                  {selectedTemplate?.description || 'Selecciona una plantilla para importarla desde la base de datos.'}
                </p>
                {selectedTemplate && (
                  <div className='inline-flex items-center rounded-full bg-slate-200/60 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600'>
                    {selectedTemplate.data?.length || 0} nodos raíz • {selectedTemplate.isSystem ? 'Plantilla del sistema' : 'Plantilla personalizada'}
                  </div>
                )}
              </div>

              {/* Save section */}
              <div className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'>
                <h3 className='text-[13px] font-bold uppercase tracking-wider text-slate-800 mb-3'>
                  Guardar estructura actual
                </h3>
                <div className='space-y-3 mb-4'>
                  <div>
                    <label className='block text-xs font-semibold text-slate-600 mb-1'>Nombre de plantilla</label>
                    <input
                      type='text'
                      className='w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none'
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder='Ej: Documento estándar'
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-semibold text-slate-600 mb-1'>Descripción</label>
                    <input
                      type='text'
                      className='w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none'
                      value={templateDescription}
                      onChange={(e) => setTemplateDescription(e.target.value)}
                      placeholder='Ej: Estructura recomendada para oficios'
                    />
                  </div>
                </div>

                <div className='flex flex-wrap items-center gap-2'>
                  <button
                    type='button'
                    disabled={saving || !currentStructure.length || !templateName.trim()}
                    className='px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition'
                    onClick={() => handleSave({ mode: 'new' })}
                  >
                    Guardar como nueva
                  </button>
                  <button
                    type='button'
                    disabled={saving || !currentStructure.length || !selectedCustomTemplate}
                    className='px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-800 bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50 disabled:bg-slate-400 disabled:border-slate-400 transition'
                    onClick={() => handleSave({ mode: 'overwrite' })}
                  >
                    Sobrescribir seleccionada
                  </button>
                </div>
                {!selectedCustomTemplate && selectedTemplate?.isSystem && (
                  <p className='mt-3 text-xs text-amber-600 font-medium'>
                    Las plantillas del sistema no se pueden sobrescribir. Selecciona una propia o guarda una nueva.
                  </p>
                )}
              </div>

              {/* Import from file */}
              <div className='rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-5 flex flex-col items-start'>
                <h3 className='text-[13px] font-bold uppercase tracking-wider text-slate-800 mb-1'>Importar externa</h3>
                <p className='text-xs text-slate-500 mb-3'>Cargar desde un JSON local.</p>
                
                <button
                  type='button'
                  className='inline-flex items-center gap-2 text-sm font-semibold text-sky-600 hover:text-sky-700 transition'
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileJson className='w-4 h-4' />
                  Seleccionar archivo JSON
                </button>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='application/json,.json'
                  className='hidden'
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    onImportFile?.(file);
                    event.target.value = '';
                  }}
                />
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className='flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200'>
          <button
            type='button'
            className='px-4 py-2 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-200 transition'
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type='button'
            disabled={!selectedTemplate}
            onClick={handleImportClick}
            className='inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm'
          >
            <Upload className='w-4 h-4' />
            Importar plantilla
          </button>
        </div>

      </div>

      {/* Confirmation Modal */}
      {confirmImportOpen && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200'>
          <div className='bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200'>
            <h3 className='text-lg font-bold text-slate-900 mb-2'>Reemplazar estructura</h3>
            <p className='text-sm text-slate-600 mb-6'>
              {selectedTemplate
                ? `Importar "${selectedTemplate.name}" sobrescribirá por completo toda la estructura actual. ¿Deseas continuar?`
                : 'Importar esta plantilla eliminará todo lo actual.'}
            </p>
            <div className='flex items-center justify-end gap-2'>
              <button
                type='button'
                className='px-4 py-2 text-sm font-semibold text-slate-600 rounded-lg hover:bg-slate-100 transition'
                onClick={() => setConfirmImportOpen(false)}
              >
                Cancelar
              </button>
              <button
                type='button'
                className='px-4 py-2 text-sm font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition shadow-sm'
                onClick={handleConfirmImport}
              >
                Reemplazar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplateLibraryDialog;
