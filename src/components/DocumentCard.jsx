function DocumentCard({ doc, onOpen }) {
  return (
    <article className='plane-doc-card px-2.5 py-2'>
      <div className='flex items-center justify-between gap-3'>
        <h4 className='plane-doc-title min-w-0 truncate'>{doc.name}</h4>
        <button
          type='button'
          className='plane-doc-open-btn'
          onClick={onOpen}
        >
          Abrir
        </button>
      </div>
    </article>
  );
}

export default DocumentCard;
