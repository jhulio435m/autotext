import { Field, Section, inputCls } from './shared';

const TEXT_TYPES = ['text', 'rich_text', 'template_text', 'ai_text'];

function BlockBaseProperties({ selectedNode, update }) {
  const isTextBlock = TEXT_TYPES.includes(selectedNode.type);

  if (isTextBlock) return null; // label not needed for text blocks

  return (
    <>
      <Section title='Contenido'>
        <Field label='Etiqueta'>
          <input
            value={selectedNode.label || ''}
            onChange={(event) => update({ label: event.target.value })}
            className={inputCls()}
          />
        </Field>
      </Section>
    </>
  );
}

export default BlockBaseProperties;
