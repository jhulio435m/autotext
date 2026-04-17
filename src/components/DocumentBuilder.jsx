import Preview from './Preview';

function DocumentBuilder() {
  return (
    <section className='min-h-[calc(100vh-230px)]'>
      <Preview embedded={false} editableText />
    </section>
  );
}

export default DocumentBuilder;
