import { useEffect, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import useDocumentStore from '../store';

const EMPTY_COVER = Object.freeze({});

const fonts = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans Serif' },
  { value: 'monospace', label: 'Monospace' }
];

function normalizeImageUrl(rawValue) {
  const value = String(rawValue || '').trim();
  if (!value) return '';
  if (/^(data:|blob:|https?:\/\/)/i.test(value)) return value;
  if (value.startsWith('//')) return `http:${value}`;
  if (/^(?:\d{1,3}(?:\.\d{1,3}){3}|[A-Za-z0-9.-]+\.[A-Za-z]{2,})(?::\d+)?\//.test(value)) {
    return `http://${value}`;
  }
  return value;
}

function CoverEditor({ projectId }) {
  const projectCoverConfig = useDocumentStore((state) => state.coverConfig[projectId]);
  const updateCoverConfig = useDocumentStore((state) => state.updateCoverConfig);
  const pushToast = useDocumentStore((state) => state.pushToast);
  const coverConfig = projectCoverConfig || EMPTY_COVER;

  const [draft, setDraft] = useState(coverConfig);

  useEffect(() => {
    setDraft(coverConfig);
  }, [coverConfig]);

  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const updateResponsible = (id, patch) => {
    const list = (draft.responsibles || []).map((item) => (item.id === id ? { ...item, ...patch } : item));
    setField('responsibles', list);
  };

  const addResponsible = () => {
    const list = [...(draft.responsibles || []), { id: `resp_${nanoid(6)}`, nombre: '', cargo: '', firma: null }];
    setField('responsibles', list);
  };

  const removeResponsible = (id) => {
    setField('responsibles', (draft.responsibles || []).filter((item) => item.id !== id));
  };

  const inputCls = 'w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400';

  const previewFont = useMemo(() => {
    if (draft.font === 'sans-serif') return 'Avenir Next, Segoe UI, sans-serif';
    if (draft.font === 'monospace') return 'Consolas, monospace';
    return 'Palatino Linotype, Georgia, serif';
  }, [draft.font]);
  const logoUrl = useMemo(() => normalizeImageUrl(draft.logo), [draft.logo]);

  return (
    <section className='grid gap-4 xl:grid-cols-[35%_65%]'>
      <div className='soft-panel animate-fade-up space-y-4 p-4'>
        <h3 className='text-sm font-bold uppercase tracking-wide text-slate-700'>Configuracion de caratula</h3>

        <div className='space-y-2'>
          <p className='text-xs font-semibold uppercase text-slate-500'>Identidad</p>
          <input
            type='file'
            accept='image/*'
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setField('logo', reader.result);
              reader.readAsDataURL(file);
            }}
            className='w-full text-xs'
          />
          <input value={draft.companyName || ''} onChange={(event) => setField('companyName', event.target.value)} placeholder='Nombre empresa' className={inputCls} />
          <input value={draft.slogan || ''} onChange={(event) => setField('slogan', event.target.value)} placeholder='Slogan' className={inputCls} />
        </div>

        <div className='space-y-2'>
          <p className='text-xs font-semibold uppercase text-slate-500'>Documento</p>
          <input value={draft.title || ''} onChange={(event) => setField('title', event.target.value)} placeholder='Titulo' className={inputCls} />
          <input value={draft.subtitle || ''} onChange={(event) => setField('subtitle', event.target.value)} placeholder='Subtitulo' className={inputCls} />
          <input value={draft.docCode || ''} onChange={(event) => setField('docCode', event.target.value)} placeholder='Codigo documento' className={inputCls} />
          <div className='grid grid-cols-2 gap-2'>
            <input value={draft.version || ''} onChange={(event) => setField('version', event.target.value)} placeholder='Version' className={inputCls} />
            <input type='date' value={draft.date || ''} onChange={(event) => setField('date', event.target.value)} className={inputCls} />
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <select value={draft.format || 'A4'} onChange={(event) => setField('format', event.target.value)} className={inputCls}>
              <option value='A4'>A4</option>
              <option value='Carta'>Carta</option>
            </select>
            <select value={draft.orientation || 'portrait'} onChange={(event) => setField('orientation', event.target.value)} className={inputCls}>
              <option value='portrait'>Vertical</option>
              <option value='landscape'>Horizontal</option>
            </select>
          </div>
        </div>

        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <p className='text-xs font-semibold uppercase text-slate-500'>Responsables</p>
            <button type='button' className='btn-ghost px-2 py-1 text-xs' onClick={addResponsible}>+ Agregar</button>
          </div>
          <div className='space-y-2'>
            {(draft.responsibles || []).map((item) => (
              <div key={item.id} className='rounded-lg border border-slate-200 bg-white p-2'>
                <div className='grid gap-1'>
                  <input value={item.nombre || ''} onChange={(event) => updateResponsible(item.id, { nombre: event.target.value })} placeholder='Nombre' className={inputCls} />
                  <input value={item.cargo || ''} onChange={(event) => updateResponsible(item.id, { cargo: event.target.value })} placeholder='Cargo' className={inputCls} />
                </div>
                <button type='button' className='mt-1 text-xs text-rose-600' onClick={() => removeResponsible(item.id)}>Eliminar</button>
              </div>
            ))}
          </div>
        </div>

        <div className='space-y-2'>
          <p className='text-xs font-semibold uppercase text-slate-500'>Estilo</p>
          <div className='flex items-center gap-2'>
            <input type='color' value={draft.primaryColor || '#006399'} onChange={(event) => setField('primaryColor', event.target.value)} />
            <select value={draft.font || 'serif'} onChange={(event) => setField('font', event.target.value)} className={inputCls}>
              {fonts.map((font) => (
                <option key={font.value} value={font.value}>{font.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type='button'
          className='btn-primary w-full px-3 py-2 text-sm'
          onClick={() => {
            updateCoverConfig(projectId, draft);
            pushToast('Caratula guardada.', 'success');
          }}
        >
          Guardar caratula
        </button>
      </div>

      <div className='soft-panel animate-fade-up p-6'>
        <div
          className='mx-auto min-h-[620px] max-w-3xl rounded-xl border border-slate-300 bg-white p-8 shadow-inner'
          style={{ fontFamily: previewFont, color: draft.primaryColor || '#1e3a8a' }}
        >
          <div className='border-b border-slate-200 pb-6 text-center'>
            {logoUrl ? (
              <img src={logoUrl} alt='logo' className='mx-auto mb-3 h-16 object-contain' />
            ) : (
              <div className='mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded bg-slate-100 text-xs text-slate-500'>LOGO</div>
            )}
            <h2 className='text-xl font-bold'>{draft.companyName || 'Nombre de Empresa'}</h2>
            <p className='text-sm text-slate-500'>{draft.slogan || 'Slogan tecnico'}</p>
          </div>

          <div className='py-10 text-center'>
            <h1 className='text-4xl font-black'>{draft.title || 'TITULO DEL DOCUMENTO'}</h1>
            <p className='mt-3 text-lg text-slate-600'>{draft.subtitle || 'Subtitulo del documento'}</p>
          </div>

          <div className='grid grid-cols-2 gap-4 text-sm'>
            <p><strong>Empresa:</strong> {draft.companyName || '---'}</p>
            <p><strong>Codigo:</strong> {draft.docCode || '---'}</p>
            <p><strong>Fecha:</strong> {draft.date || '---'}</p>
            <p><strong>Version:</strong> {draft.version || '---'}</p>
            <p><strong>Formato:</strong> {draft.format || 'A4'}</p>
            <p><strong>Orientacion:</strong> {(draft.orientation || 'portrait') === 'portrait' ? 'Vertical' : 'Horizontal'}</p>
          </div>

          <div className='mt-10'>
            <h3 className='mb-2 text-sm font-semibold uppercase text-slate-500'>Responsables</h3>
            <div className='space-y-2'>
              {(draft.responsibles || []).map((item) => (
                <div key={item.id} className='rounded-md border border-slate-200 p-2 text-sm text-slate-700'>
                  <p className='font-semibold'>{item.nombre || 'Nombre'}</p>
                  <p>{item.cargo || 'Cargo'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CoverEditor;
