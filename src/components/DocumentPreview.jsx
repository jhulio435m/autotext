import DocumentSectionSidebar from './DocumentSectionSidebar';
import Preview from './Preview';

function DocumentPreview() {
  return (
    <section className='grid flex-1 min-h-0 grid-cols-1 gap-3 xl:grid-cols-[260px_minmax(0,1fr)] 2xl:grid-cols-[300px_minmax(0,1fr)]'>
      <DocumentSectionSidebar />
      <div className='flex flex-col gap-3'>
        <Preview embedded={false} editableText={false} scrollContainerId='document-preview-scroll' />
      </div>
    </section>
  );
}

export default DocumentPreview;
