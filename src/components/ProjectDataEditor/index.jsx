import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, CalendarDays, ChevronDown, ImagePlus, Palette, PanelTop } from 'lucide-react';
import useDocumentStore from '../../store';
import peruGeoCatalog from '../../data/peruGeoCatalog.json';
import { normalizeImageUrl } from './helpers';
import AutoTextarea from '../ui/AutoTextarea';
import {
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  PAGE_FORMAT_OPTIONS,
  PARAGRAPH_SPACING_OPTIONS,
  normalizePageSettings
} from '../../utils/pageConfig';
import VariablesTab from './VariablesTab';
import BlocksTab from './BlocksTab';

const EMPTY_PROJECT_CONFIG = Object.freeze({});
const MONTH_OPTIONS = Object.freeze([
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre'
]);
const YEAR_OPTIONS = Object.freeze(Array.from({ length: 11 }, (_, index) => String(2021 + index)));
/* Configuracion de caratula HTML desactivada temporalmente.
const COVER_STYLE_OPTIONS = Object.freeze([
  { value: 'editorial', label: 'Editorial', hint: 'Bloque central fuerte y acabado limpio.' },
  { value: 'architect', label: 'Arquitectonica', hint: 'Ficha tecnica lateral y foto dominante.' },
  { value: 'minimal', label: 'Minimal', hint: 'Sobria, limpia y sin depender de imagen.' },
  { value: 'institutional', label: 'Institucional', hint: 'Cabecera formal y tono sobrio.' },
  { value: 'blueprint', label: 'Blueprint', hint: 'Mas expresiva, tipo lamina visual.' },
  { value: 'folio', label: 'Folio', hint: 'Dossier vertical con ficha lateral.' }
]);
*/

const PROJECT_DATA_SECTIONS = [
  {
    id: 'datos',
    title: 'Datos base',
    fields: [
      { key: 'var_nombre_proyecto', label: 'Nombre del proyecto', required: true, type: 'textarea', rows: 3 },
      { key: 'var_cui', label: 'CUI', required: true },
      { key: 'var_centro_poblado', label: 'Centro poblado' },
      { key: 'var_distrito', label: 'Distrito', required: true },
      { key: 'var_provincia', label: 'Provincia', required: true },
      { key: 'var_departamento', label: 'Departamento', required: true }
    ]
  }
];

const DEFAULT_EXPANDED = Object.freeze({
  datos: true
});
const TOP_DATA_KEYS = new Set(['var_nombre_proyecto', 'var_cui', 'var_departamento', 'var_provincia', 'var_distrito', 'var_centro_poblado']);

function ProjectDataEditor({ projectId, docId }) {
  const document = useDocumentStore((state) => (state.documents[projectId] || []).find((item) => item.id === docId) || null);
  const project = useDocumentStore((state) => state.projects.find((item) => item.id === projectId) || null);
  const coverConfig = useDocumentStore((state) => state.coverConfig[projectId] || EMPTY_PROJECT_CONFIG);
  
  const updateCoverConfig = useDocumentStore((state) => state.updateCoverConfig);
  const updateDocumentCover = useDocumentStore((state) => state.updateDocumentCover);
  const updateDocumentProjectData = useDocumentStore((state) => state.updateDocumentProjectData);
  const updatePreviewFormDataBulk = useDocumentStore((state) => state.updatePreviewFormDataBulk);

  const [draft, setDraft] = useState({});
  const [metaDraft, setMetaDraft] = useState({});
  const [expanded, setExpanded] = useState(DEFAULT_EXPANDED);
  const [activeTab, setActiveTab] = useState('base');
  const lastSavedSnapshotRef = useRef('');

  const projectData = coverConfig.projectData || EMPTY_PROJECT_CONFIG;
  const documentProjectData = document?.coverData?.projectData || EMPTY_PROJECT_CONFIG;

  useEffect(() => {
    const nextDraft = {};
    PROJECT_DATA_SECTIONS.forEach((section) => {
      section.fields.forEach((field) => {
        nextDraft[field.key] = projectData[field.key] ?? documentProjectData[field.key] ?? '';
      });
    });
    setDraft(nextDraft);
  }, [documentProjectData, projectData, projectId, docId]);

  useEffect(() => {
    const pageSettings = normalizePageSettings({
      ...coverConfig,
      ...document?.coverData
    });
    setMetaDraft({
      companyName: coverConfig.companyName || document?.coverData?.companyName || projectData.var_entidad || '',
      logo: coverConfig.logo || document?.coverData?.logo || '',
      month: coverConfig.month || document?.coverData?.month || '',
      year: coverConfig.year || document?.coverData?.year || '',
      primaryColor: coverConfig.primaryColor || '#006399',
      // coverStyle: coverConfig.coverStyle || document?.coverData?.coverStyle || 'editorial',
      format: pageSettings.format,
      orientation: pageSettings.orientation,
      font: pageSettings.fontKey,
      fontSize: pageSettings.fontSize,
      lineHeight: pageSettings.lineHeight,
      paragraphSpacing: pageSettings.paragraphSpacing,
      marginTop: pageSettings.marginTop,
      marginRight: pageSettings.marginRight,
      marginBottom: pageSettings.marginBottom,
      marginLeft: pageSettings.marginLeft,
      showHeaderFooter: pageSettings.showHeaderFooter,
      includeToc: pageSettings.includeToc
    });
  }, [coverConfig, docId, document?.coverData, projectData.var_entidad, projectId]);

  if (!document) {
    return <p className='rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600'>Documento no encontrado.</p>;
  }

  const setField = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const setMetaField = (key, value) => {
    setMetaDraft((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const nextProjectData = {
      ...draft,
      var_entidad: metaDraft.companyName || ''
    };
    const nextCoverPatch = {
      ...metaDraft,
      coverPhoto: project?.coverImageUrl || ''
    };
    const snapshot = JSON.stringify({
      projectId,
      docId,
      projectData: nextProjectData,
      cover: nextCoverPatch
    });

    if (snapshot === lastSavedSnapshotRef.current) return undefined;

    const timer = window.setTimeout(() => {
      lastSavedSnapshotRef.current = snapshot;

      updateCoverConfig(projectId, {
        ...nextCoverPatch,
        projectData: nextProjectData
      });
      if (docId) {
        updateDocumentCover(projectId, docId, nextCoverPatch);
        updateDocumentProjectData(projectId, docId, nextProjectData);
      }
      updatePreviewFormDataBulk(nextProjectData);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [docId, draft, metaDraft, project?.coverImageUrl, projectId, updateCoverConfig, updateDocumentCover, updateDocumentProjectData, updatePreviewFormDataBulk]);

  const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100';
  const colorValue = metaDraft.primaryColor || '#006399';
  const selectCls = `${inputCls} appearance-none pr-8`;
  const pageSettings = useMemo(() => normalizePageSettings(metaDraft), [metaDraft]);
  const departments = peruGeoCatalog;
  const selectedDepartment = useMemo(
    () => departments.find((department) => department.name === (draft.var_departamento || '')) || null,
    [departments, draft.var_departamento]
  );
  const provinceOptions = selectedDepartment?.provinces || [];
  const selectedProvince = useMemo(
    () => provinceOptions.find((province) => province.name === (draft.var_provincia || '')) || null,
    [provinceOptions, draft.var_provincia]
  );
  const districtOptions = selectedProvince?.districts || [];
  const projectDataSections = useMemo(
    () =>
      PROJECT_DATA_SECTIONS.map((section) => ({
        ...section,
        fields: section.fields.filter((field) => !TOP_DATA_KEYS.has(field.key))
      })).filter((section) => section.fields.length > 0),
    []
  );

  useEffect(() => {
    if (draft.var_departamento && !selectedDepartment) {
      setField('var_departamento', '');
      setField('var_provincia', '');
      setField('var_distrito', '');
      return;
    }
    if (draft.var_provincia && !selectedProvince) {
      setField('var_provincia', '');
      setField('var_distrito', '');
      return;
    }
    if (draft.var_distrito && !districtOptions.some((district) => district.name === draft.var_distrito)) {
      setField('var_distrito', '');
    }
  }, [districtOptions, draft.var_departamento, draft.var_distrito, draft.var_provincia, selectedDepartment, selectedProvince]);

  return (
    <div className='flex h-full flex-col'>
      <div className='mb-6 flex border-b border-slate-200'>
        <button
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === 'base'
              ? 'border-sky-500 text-sky-700'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('base')}
        >
          Datos base
        </button>
        <button
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === 'variables'
              ? 'border-sky-500 text-sky-700'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('variables')}
        >
          Variables
        </button>
        <button
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-medium transition-colors ${
            activeTab === 'blocks'
              ? 'border-sky-500 text-sky-700'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('blocks')}
        >
          Bloques reutilizables
        </button>
      </div>

      <div className='flex-1'>
        {activeTab === 'base' ? (
          <section className='space-y-4'>
            <div className='grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]'>
              <aside className='space-y-4 xl:sticky xl:top-4 xl:self-start'>
                <section className='overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]'>
            <div className='border-b border-slate-200 px-5 py-4'>
              <p className='flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400'>
                <PanelTop className='h-3.5 w-3.5' />
                Resumen visual
              </p>
              <h2 className='mt-1 text-base font-semibold text-slate-900'>Identidad del expediente</h2>
            </div>
            <div className='space-y-5 p-5'>
              <div className='rounded-[20px] border border-slate-200 bg-slate-50 p-4'>
                <div className='flex items-start gap-4'>
                  <div
                    className='flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-sm'
                    style={{ boxShadow: `inset 0 0 0 1px ${colorValue}22` }}
                  >
                    {normalizeImageUrl(metaDraft.logo) ? (
                      <img src={normalizeImageUrl(metaDraft.logo)} alt='Logo del proyecto' className='h-full w-full object-contain' />
                    ) : (
                      <div
                        className='h-full w-full rounded-xl'
                        style={{ background: `linear-gradient(135deg, ${colorValue}, ${colorValue}99)` }}
                      />
                    )}
                  </div>
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold text-slate-900'>{draft.var_nombre_proyecto || 'Nombre del proyecto pendiente'}</p>
                    <p className='mt-1 text-sm leading-5 text-slate-500'>{metaDraft.companyName || 'Entidad sin nombre'}</p>
                    <div className='mt-2 flex flex-wrap gap-2 text-xs text-slate-500'>
                      <span className='rounded-full border border-slate-200 bg-white px-2.5 py-1'>{draft.var_cui || 'CUI pendiente'}</span>
                      <span className='rounded-full border border-slate-200 bg-white px-2.5 py-1'>{metaDraft.month || 'Mes'} {metaDraft.year || 'Año'}</span>
                      <span className='rounded-full border border-slate-200 bg-white px-2.5 py-1'>{pageSettings.format} {pageSettings.orientation === 'landscape' ? 'horizontal' : 'vertical'}</span>
                      <span className='rounded-full border border-slate-200 bg-white px-2.5 py-1'>{pageSettings.fontLabel} {pageSettings.fontSize} pt</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className='mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400'>Color principal</p>
                <div className='flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3'>
                  <div className='h-12 w-12 rounded-2xl border border-white shadow-sm' style={{ backgroundColor: colorValue }} />
                  <div className='min-w-0'>
                    <p className='text-sm font-medium text-slate-800'>{colorValue}</p>
                    <p className='text-xs text-slate-500'>Usado en portada, preview y PDF.</p>
                  </div>
                </div>
              </div>

              {/* Selector de caratula HTML desactivado temporalmente.
              <div>
                <p className='mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400'>Caratula HTML</p>
                <div className='relative'>
                  <select
                    value={metaDraft.coverStyle || 'editorial'}
                    onChange={(event) => setMetaField('coverStyle', event.target.value)}
                    className={selectCls}
                  >
                    {COVER_STYLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <ChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                </div>
                <p className='mt-2 text-xs text-slate-500'>
                  {COVER_STYLE_OPTIONS.find((option) => option.value === (metaDraft.coverStyle || 'editorial'))?.hint}
                </p>
              </div>
              */}

              <div>
                <p className='mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400'>Portada desde Plane</p>
                {project?.coverImageUrl ? (
                  <img src={project.coverImageUrl} alt='Portada del proyecto' className='h-64 w-full rounded-[20px] border border-slate-200 object-cover' />
                ) : (
                  <div className='flex h-64 items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-400'>
                    Este proyecto no tiene foto de portada en Plane.
                  </div>
                )}
              </div>
            </div>
          </section>
        </aside>

        <div className='space-y-4'>
          <section className='overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]'>
            <div className='border-b border-slate-200 px-5 py-4'>
              <h2 className='flex items-center gap-2 text-base font-semibold text-slate-900'>
                <Building2 className='h-4 w-4 text-slate-500' />
                Configuración general del expediente
              </h2>
              <p className='mt-1 text-sm text-slate-500'>Campos globales que definen la identidad visual y los datos de cabecera.</p>
            </div>
            <div className='space-y-4 bg-slate-50 p-5'>
              <div className='grid gap-3 xl:grid-cols-12'>
                <label className='block rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm xl:col-span-7'>
                  <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Nombre del proyecto</span>
                  <AutoTextarea
                    minRows={1}
                    value={draft.var_nombre_proyecto ?? ''}
                    onChange={(event) => setField('var_nombre_proyecto', event.target.value)}
                    className={`${inputCls} leading-6`}
                  />
                </label>

                <div className='space-y-3 xl:col-span-3'>
                  <label className='block rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm'>
                    <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Entidad</span>
                    <div className='relative'>
                      <div className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'>
                        <Building2 className='h-4 w-4' />
                      </div>
                      <input
                        type='text'
                        value={metaDraft.companyName ?? ''}
                        onChange={(event) => setMetaField('companyName', event.target.value)}
                        className={`${inputCls} pl-10`}
                      />
                    </div>
                  </label>

                  <label className='block rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm'>
                    <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>CUI</span>
                    <input
                      type='text'
                      value={draft.var_cui ?? ''}
                      onChange={(event) => setField('var_cui', event.target.value)}
                      className={inputCls}
                    />
                  </label>
                </div>

                <div className='space-y-3 xl:col-span-2'>
                  <label className='block rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm'>
                    <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Mes</span>
                    <div className='relative'>
                      <div className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'>
                        <CalendarDays className='h-4 w-4' />
                      </div>
                      <select
                        value={metaDraft.month ?? ''}
                        onChange={(event) => setMetaField('month', event.target.value)}
                        className={`${selectCls} pl-10 pr-9`}
                      >
                        <option value=''>Mes</option>
                        {MONTH_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                    </div>
                  </label>

                  <label className='block rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm'>
                    <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Año</span>
                    <div className='relative'>
                      <div className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'>
                        <CalendarDays className='h-4 w-4' />
                      </div>
                      <select
                        value={metaDraft.year ?? ''}
                        onChange={(event) => setMetaField('year', event.target.value)}
                        className={`${selectCls} pl-10 pr-9`}
                      >
                        <option value=''>Año</option>
                        {YEAR_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                    </div>
                  </label>
                </div>
              </div>

              <div className='grid gap-3 xl:grid-cols-12'>
                <div className='rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm xl:col-span-10'>
                  <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Identidad visual</span>
                  <div className='grid gap-4 md:grid-cols-[116px_minmax(0,1fr)] md:items-center'>
                    <div className='flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2'>
                      {normalizeImageUrl(metaDraft.logo) ? (
                        <img src={normalizeImageUrl(metaDraft.logo)} alt='Logo del proyecto' className='h-full w-full object-contain' />
                      ) : (
                        <div className='flex h-full w-full items-center justify-center rounded-lg border border-dashed border-slate-300 text-center text-xs text-slate-400'>
                          Sin logo
                        </div>
                      )}
                    </div>
                    <div className='grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-end'>
                      <label className='block'>
                        <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Logo</span>
                        <input
                          type='file'
                          accept='image/*'
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => setMetaField('logo', reader.result);
                            reader.readAsDataURL(file);
                          }}
                          className='w-full text-xs text-slate-600'
                        />
                        <p className='mt-2 flex items-center gap-2 text-xs text-slate-500'>
                          <ImagePlus className='h-3.5 w-3.5' />
                          Logo cuadrado o transparente.
                        </p>
                      </label>
                      <label className='block'>
                        <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Color principal</span>
                        <div className='flex items-center gap-3'>
                          <div className='flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500'>
                            <Palette className='h-4 w-4' />
                          </div>
                          <input
                            type='color'
                            value={metaDraft.primaryColor ?? '#006399'}
                            onChange={(event) => setMetaField('primaryColor', event.target.value)}
                            className='h-11 w-14 rounded-xl border border-slate-200 bg-white p-1'
                          />
                          <span className='text-sm font-medium text-slate-700'>{metaDraft.primaryColor ?? '#006399'}</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className='grid gap-3 xl:grid-cols-12'>
                <div className='rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm xl:col-span-12'>
                  <div className='mb-4'>
                    <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Configuracion de pagina</span>
                    <p className='text-sm text-slate-500'>Define formato, tipografia, margenes y elementos de salida para TEX y PDF.</p>
                  </div>

                  <div className='grid gap-4 xl:grid-cols-12'>
                    <label className='block xl:col-span-2'>
                      <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Formato</span>
                      <div className='relative'>
                        <select
                          value={metaDraft.format ?? 'A4'}
                          onChange={(event) => setMetaField('format', event.target.value)}
                          className={selectCls}
                        >
                          {PAGE_FORMAT_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <ChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                      </div>
                    </label>

                    <label className='block xl:col-span-2'>
                      <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Orientacion</span>
                      <div className='relative'>
                        <select
                          value={metaDraft.orientation ?? 'portrait'}
                          onChange={(event) => setMetaField('orientation', event.target.value)}
                          className={selectCls}
                        >
                          <option value='portrait'>Vertical</option>
                          <option value='landscape'>Horizontal</option>
                        </select>
                        <ChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                      </div>
                    </label>

                    <label className='block xl:col-span-3'>
                      <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Fuente</span>
                      <div className='relative'>
                        <select
                          value={metaDraft.font ?? 'termes'}
                          onChange={(event) => setMetaField('font', event.target.value)}
                          className={selectCls}
                        >
                          {FONT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        <ChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                      </div>
                    </label>

                    <label className='block xl:col-span-2'>
                      <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Tamano fuente</span>
                      <div className='relative'>
                        <select
                          value={metaDraft.fontSize ?? 12}
                          onChange={(event) => setMetaField('fontSize', Number(event.target.value))}
                          className={selectCls}
                        >
                          {FONT_SIZE_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option} pt</option>
                          ))}
                        </select>
                        <ChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                      </div>
                    </label>

                    <label className='block xl:col-span-2'>
                      <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Interlineado</span>
                      <div className='relative'>
                        <select
                          value={metaDraft.lineHeight ?? 1.15}
                          onChange={(event) => setMetaField('lineHeight', Number(event.target.value))}
                          className={selectCls}
                        >
                          {LINE_HEIGHT_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option.toFixed(2).replace(/\.00$/, '')}</option>
                          ))}
                        </select>
                        <ChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                      </div>
                    </label>

                    <label className='block xl:col-span-1'>
                      <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Parrafo</span>
                      <div className='relative'>
                        <select
                          value={metaDraft.paragraphSpacing ?? 0.55}
                          onChange={(event) => setMetaField('paragraphSpacing', Number(event.target.value))}
                          className={selectCls}
                        >
                          {PARAGRAPH_SPACING_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option} em</option>
                          ))}
                        </select>
                        <ChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                      </div>
                    </label>
                  </div>

                  <div className='mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
                    {[
                      ['marginTop', 'Margen superior'],
                      ['marginRight', 'Margen derecho'],
                      ['marginBottom', 'Margen inferior'],
                      ['marginLeft', 'Margen izquierdo']
                    ].map(([key, label]) => (
                      <label key={key} className='block'>
                        <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>{label}</span>
                        <div className='relative'>
                          <input
                            type='number'
                            min='10'
                            max='45'
                            step='1'
                            value={metaDraft[key] ?? 25}
                            onChange={(event) => setMetaField(key, Number(event.target.value))}
                            className={`${inputCls} pr-12`}
                          />
                          <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400'>mm</span>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className='mt-4 grid gap-3 md:grid-cols-2'>
                    <label className='flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'>
                      <input
                        type='checkbox'
                        checked={metaDraft.showHeaderFooter !== false}
                        onChange={(event) => setMetaField('showHeaderFooter', event.target.checked)}
                        className='mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200'
                      />
                      <span>
                        <span className='block text-sm font-medium text-slate-800'>Mostrar cabecera y pie</span>
                        <span className='block text-xs text-slate-500'>Aplica la banda superior, nombre del proyecto y numeracion de paginas.</span>
                      </span>
                    </label>

                    <label className='flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3'>
                      <input
                        type='checkbox'
                        checked={metaDraft.includeToc !== false}
                        onChange={(event) => setMetaField('includeToc', event.target.checked)}
                        className='mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200'
                      />
                      <span>
                        <span className='block text-sm font-medium text-slate-800'>Incluir indice</span>
                        <span className='block text-xs text-slate-500'>Genera la tabla de contenido antes del cuerpo del documento exportado.</span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              <div className='grid gap-3 xl:grid-cols-12'>
                <label className='block rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm xl:col-span-3'>
                  <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Departamento</span>
                  <div className='relative'>
                    <div className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'>
                      <CalendarDays className='h-4 w-4' />
                    </div>
                    <select
                      value={draft.var_departamento ?? ''}
                      onChange={(event) => {
                        const nextDepartment = event.target.value;
                        setField('var_departamento', nextDepartment);
                        setField('var_provincia', '');
                        setField('var_distrito', '');
                      }}
                      className={`${selectCls} pl-10`}
                    >
                      <option value=''>Seleccionar</option>
                      {departments.map((department) => (
                        <option key={department.code} value={department.name}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                  </div>
                </label>

                <label className='block rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm xl:col-span-3'>
                  <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Provincia</span>
                  <div className='relative'>
                    <div className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'>
                      <CalendarDays className='h-4 w-4' />
                    </div>
                    <select
                      value={draft.var_provincia ?? ''}
                      onChange={(event) => {
                        setField('var_provincia', event.target.value);
                        setField('var_distrito', '');
                      }}
                      className={`${selectCls} pl-10`}
                      disabled={!selectedDepartment}
                    >
                      <option value=''>Seleccionar</option>
                      {provinceOptions.map((province) => (
                        <option key={`${selectedDepartment?.code || 'dep'}-${province.code}`} value={province.name}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                  </div>
                </label>

                <label className='block rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm xl:col-span-3'>
                  <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Distrito</span>
                  <div className='relative'>
                    <div className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400'>
                      <CalendarDays className='h-4 w-4' />
                    </div>
                    <select
                      value={draft.var_distrito ?? ''}
                      onChange={(event) => setField('var_distrito', event.target.value)}
                      className={`${selectCls} pl-10`}
                      disabled={!selectedProvince}
                    >
                      <option value=''>Seleccionar</option>
                      {districtOptions.map((district) => (
                        <option key={`${selectedProvince?.code || 'prov'}-${district.code}`} value={district.name}>
                          {district.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className='pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                  </div>
                </label>

                <label className='block rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm xl:col-span-3'>
                  <span className='mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>Centro poblado</span>
                  <input
                    type='text'
                    value={draft.var_centro_poblado ?? ''}
                    onChange={(event) => setField('var_centro_poblado', event.target.value)}
                    className={inputCls}
                  />
                </label>
              </div>
            </div>
          </section>

          <div className='space-y-4'>
            {projectDataSections.map((section) => {
              const open = expanded[section.id] ?? false;
              return (
                <section key={section.id} className='overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)]'>
                  <button
                    type='button'
                    onClick={() => setExpanded((prev) => ({ ...prev, [section.id]: !open }))}
                    className='flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50'
                  >
                    <div>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400'>Sección</p>
                      <h2 className='mt-1 text-base font-semibold text-slate-900'>{section.title}</h2>
                      <p className='mt-1 text-sm text-slate-500'>{section.fields.length} campos para completar el expediente base.</p>
                    </div>
                    <span className='flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-400'>
                      <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </span>
                  </button>

                  {open ? (
                    <div className='grid gap-4 border-t border-slate-200 bg-slate-50 p-5 md:grid-cols-2'>
                      {section.fields.map((field) => {
                        const value = draft[field.key] ?? '';
                        const isTextArea = field.type === 'textarea';
                        const wide = isTextArea ? 'md:col-span-2' : '';

                        return (
                          <label key={field.key} className={`block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${wide}`}>
                            <span className='mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500'>
                              {field.label}
                            </span>
                            {isTextArea ? (
                              <AutoTextarea
                                minRows={1}
                                value={value}
                                onChange={(event) => setField(field.key, event.target.value)}
                                className={inputCls}
                              />
                            ) : (
                              <input
                                type={field.type === 'number' ? 'number' : 'text'}
                                value={value}
                                onChange={(event) => setField(field.key, field.type === 'number' ? event.target.value : event.target.value)}
                                className={inputCls}
                              />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </section>
        ) : activeTab === 'variables' ? (
          <VariablesTab projectId={projectId} docId={docId} />
        ) : (
          <BlocksTab projectId={projectId} docId={docId} />
        )}
      </div>
    </div>
  );
}

export default ProjectDataEditor;
