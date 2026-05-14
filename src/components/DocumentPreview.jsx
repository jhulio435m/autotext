import DocumentSectionSidebar from './DocumentSectionSidebar';
import Preview from './Preview';

function DocumentPreview() {
  return (
    <section className='grid min-h-[calc(100vh-230px)] grid-cols-1 gap-3 xl:grid-cols-[320px_minmax(0,1fr)]'>
      <DocumentSectionSidebar />
      <div className='flex flex-col gap-3'>
        <Preview embedded={false} editableText={false} scrollContainerId='document-preview-scroll' />
      </div>
    </section>
  );
}

export default DocumentPreview;
