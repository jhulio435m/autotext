import DocumentSectionSidebar from './DocumentSectionSidebar';
import Preview from './Preview';
import DocumentToolsPanel from './DocumentToolsPanel';

function DocumentBuilder() {
  return (
    <section className='grid flex-1 min-h-0 grid-cols-1 gap-3 xl:grid-cols-[320px_minmax(0,1fr)_360px] 2xl:grid-cols-[360px_minmax(0,1fr)_380px]'>
      <DocumentSectionSidebar />
      <Preview embedded={false} editableText scrollContainerId='document-builder-scroll' />
      <DocumentToolsPanel />
    </section>
  );
}

export default DocumentBuilder;
