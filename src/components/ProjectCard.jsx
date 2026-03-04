function ProjectCard({ project, onOpen, onEdit }) {
  const hasCoverImage = Boolean(project.coverImageUrl);
  const cardHeroStyle = hasCoverImage
    ? {
        backgroundImage: `url(${project.coverImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : {};

  return (
    <article className='soft-panel animate-fade-up p-4'>
      <div className={`mb-4 h-24 rounded-md ${hasCoverImage ? '' : 'project-cover-fallback'}`} style={cardHeroStyle} />

      <div className='flex items-center justify-between gap-3'>
        <h3 className='line-clamp-2 text-base font-bold text-slate-900'>{project.name}</h3>
        {onEdit ? (
          <button type='button' className='btn-ghost' onClick={onEdit}>
            Editar
          </button>
        ) : null}
      </div>

      <div className='mt-4 flex items-center justify-end gap-2'>
        <button type='button' className='btn-primary' onClick={onOpen}>
          Abrir proyecto
        </button>
      </div>
    </article>
  );
}

export default ProjectCard;
