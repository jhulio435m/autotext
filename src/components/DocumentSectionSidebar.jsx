import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, CircleDot } from 'lucide-react';
import useDocumentStore from '../store';
import { buildSectionGuide, getCompletionState } from '../utils/section-guide';

function getToneClasses(tone, active) {
  if (tone === 'complete') {
    return active
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
      : 'border-emerald-200 bg-white text-emerald-700';
  }
  if (tone === 'progress') {
    return active
      ? 'border-sky-300 bg-sky-50 text-sky-800'
      : 'border-sky-200 bg-white text-sky-700';
  }
  if (tone === 'pending') {
    return active
      ? 'border-amber-300 bg-amber-50 text-amber-800'
      : 'border-amber-200 bg-white text-amber-700';
  }
  return active
    ? 'border-slate-300 bg-slate-50 text-slate-800'
    : 'border-slate-200 bg-white text-slate-600';
}

function ToneIcon({ tone }) {
  if (tone === 'complete') return <CheckCircle2 className='h-4 w-4' />;
  if (tone === 'progress') return <CircleDot className='h-4 w-4' />;
  return <Circle className='h-4 w-4' />;
}

function DocumentSectionSidebar({ scrollContainerId = 'document-builder-scroll' }) {
  const structure = useDocumentStore((state) => state.structure);
  const formData = useDocumentStore((state) => state.formData);
  const [activeSectionId, setActiveSectionId] = useState('');

  const sections = useMemo(() => buildSectionGuide(structure, formData), [formData, structure]);
  const overall = useMemo(() => {
    return sections.reduce(
      (acc, section) => ({
        required: acc.required + section.required,
        completed: acc.completed + section.completed
      }),
      { required: 0, completed: 0 }
    );
  }, [sections]);

  useEffect(() => {
    if (!sections.length) return undefined;

    const root = document.getElementById(scrollContainerId);
    const targets = sections
      .map((section) => document.getElementById(`preview-section-${section.id}`))
      .filter(Boolean);

    if (!targets.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveSectionId(visible[0].target.id.replace('preview-section-', ''));
        }
      },
      {
        root,
        threshold: [0.2, 0.45, 0.7]
      }
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [scrollContainerId, sections]);

  return (
    <aside className='hidden min-h-[calc(100vh-230px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] xl:flex'>
      <div className='border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4'>
        <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400'>Recorrido</p>
        <h3 className='mt-1 text-sm font-semibold text-slate-900'>Secciones del documento</h3>
        <p className='mt-2 text-xs leading-5 text-slate-500'>
          Navega por secciones largas sin perder el progreso de campos obligatorios.
        </p>
        <div className='mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600'>
          <span className='font-semibold text-slate-800'>{overall.completed}</span> de{' '}
          <span className='font-semibold text-slate-800'>{overall.required}</span> campos obligatorios completos
        </div>
      </div>

      <div className='flex-1 overflow-auto p-3'>
        <div className='space-y-2'>
          {sections.map((section) => {
            const state = getCompletionState(section);
            const active = activeSectionId === section.id;

            return (
              <button
                key={section.id}
                type='button'
                onClick={() => {
                  setActiveSectionId(section.id);
                  document.getElementById(`preview-section-${section.id}`)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                  });
                }}
                className={`w-full rounded-2xl border px-3 py-3 text-left transition ${getToneClasses(state.tone, active)}`}
                style={{ marginLeft: `${section.depth * 10}px`, width: `calc(100% - ${section.depth * 10}px)` }}
              >
                <div className='flex items-start gap-3'>
                  <div className='mt-0.5 shrink-0'>
                    <ToneIcon tone={state.tone} />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2'>
                      <span className='text-[11px] font-bold uppercase tracking-[0.16em] text-current/80'>
                        {section.prefix.join('.')}
                      </span>
                      <span className='rounded-full bg-current/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-current'>
                        {state.label}
                      </span>
                    </div>
                    <p className='mt-1 truncate text-sm font-semibold'>{section.title}</p>
                    <p className='mt-1 text-xs text-current/80'>
                      {section.completed}/{section.required} obligatorios
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export default DocumentSectionSidebar;
