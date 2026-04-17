import { COVER_STYLE_OPTIONS, buildHtmlCoverDocument, buildHtmlCoverModel, normalizeCoverColor } from '../../utils/htmlCover';

function HtmlCoverGallery({ coverConfig, currentDocumentName, previewWidth, previewHeight }) {
  const activeStyle = COVER_STYLE_OPTIONS.find((item) => item.value === (coverConfig.coverStyle || 'editorial')) || COVER_STYLE_OPTIONS[0];
  const model = buildHtmlCoverModel(
    {
      documentName: currentDocumentName,
      coverData: coverConfig
    },
    (value) => String(value || '').trim()
  );
  const srcDoc = buildHtmlCoverDocument(model, { preview: true });
  const primaryColor = normalizeCoverColor(coverConfig.primaryColor);

  return (
    <section className='space-y-3'>
      <div className='flex items-end justify-between gap-4'>
        <div>
          <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400'>Caratulas HTML</p>
          <h3 className='mt-1 text-base font-semibold text-slate-900'>Preview de la caratula seleccionada</h3>
        </div>
      <div className='rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-500'>
          {activeStyle.label}
        </div>
      </div>
      <p className='text-sm text-slate-500'>{activeStyle.hint}</p>
      <article
        className='overflow-hidden rounded-lg bg-white shadow-lg'
        style={{
          width: previewWidth,
          height: previewHeight,
          minHeight: previewHeight
        }}
      >
        <iframe
          title={`cover-${activeStyle.value}`}
          srcDoc={srcDoc}
          className='h-full w-full border-0'
          style={{ display: 'block', backgroundColor: 'white' }}
          scrolling='no'
        />
      </article>
    </section>
  );
}

export default HtmlCoverGallery;
