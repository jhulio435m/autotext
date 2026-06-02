import { Edit2, ExternalLink, Trash2 } from 'lucide-react';

function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return 'PR';
  return parts.map((part) => part[0]?.toUpperCase() || '').join('');
}

function formatUpdatedAt(value) {
  if (!value) return 'Sin fecha';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function ProjectCard({ project, onOpen, onEdit, onDelete }) {
  const hasCoverImage = Boolean(project.coverImageUrl);
  const accentColor = project.accentColor || '#3b82f6';
  const sourceLabel = project.source === 'plane' ? 'Plane' : 'Local';
  const initials = getInitials(project.name);

  return (
    <article className='group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300 hover:shadow-[0_10px_30px_rgba(15,23,42,0.08)]'>
      <div className='relative'>
        <div className='absolute inset-x-0 top-0 h-px bg-slate-100' />
        <div className='h-28 overflow-hidden border-b border-slate-200 bg-slate-50'>
          {hasCoverImage ? (
            <img
              src={project.coverImageUrl}
              alt={project.name}
              className='h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]'
            />
          ) : (
            <div
              className='flex h-full items-end justify-between px-4 py-3'
              style={{
                background: `linear-gradient(135deg, ${accentColor}18 0%, #f8fafc 45%, ${accentColor}33 100%)`
              }}
            >
              <div className='rounded-lg border border-white/70 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600 backdrop-blur-sm'>
                {sourceLabel}
              </div>
              <div className='grid size-10 place-items-center rounded-xl border border-white/70 bg-white/80 text-sm font-semibold text-slate-700 backdrop-blur-sm'>
                {initials}
              </div>
            </div>
          )}
        </div>
        <span className='absolute left-0 top-0 h-full w-1' style={{ backgroundColor: accentColor }} />
      </div>

      <div className='space-y-4 p-4'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0 space-y-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <span className='inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600'>
                {project.code || 'Sin código'}
              </span>
              <span className='text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400'>{sourceLabel}</span>
            </div>
            <h3 className='line-clamp-2 text-[15px] font-semibold leading-5 tracking-[-0.01em] text-slate-900'>
              {project.name}
            </h3>
          </div>
        </div>

        <p className='line-clamp-3 min-h-[60px] text-sm leading-5 text-slate-500'>
          {project.description || 'Sin descripción disponible para este proyecto.'}
        </p>

        <div className='flex items-center justify-between gap-3 border-t border-slate-100 pt-3'>
          <div className='min-w-0'>
            <p className='text-[11px] uppercase tracking-[0.14em] text-slate-400'>Actualizado</p>
            <p className='truncate text-xs font-medium text-slate-600'>{formatUpdatedAt(project.updatedAt)}</p>
          </div>

          <div className='flex items-center gap-2'>
            {onEdit ? (
              <button
                type='button'
                onClick={onEdit}
                className='inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50'
              >
                <Edit2 className='w-4 h-4' />
                Editar
              </button>
            ) : null}
            <button
              type='button'
              onClick={onOpen}
              className='inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800'
            >
              <ExternalLink className='w-4 h-4' />
              Abrir
            </button>
            {onDelete ? (
              <button
                type='button'
                onClick={onDelete}
                className='inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50'
              >
                <Trash2 className='w-4 h-4' />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

export default ProjectCard;
