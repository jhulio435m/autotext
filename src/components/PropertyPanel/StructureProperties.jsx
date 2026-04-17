import { Field, Section, inputCls } from './shared';

function StructureProperties({ selectedNode, update }) {
  return (
    <Section title='Sección'>
      <Field label='Título'>
        <textarea
          rows={2}
          value={selectedNode.title || ''}
          onChange={(event) => update({ title: event.target.value })}
          className={inputCls()}
        />
      </Field>

      <Field label='Nivel LaTeX'>
        <input
          type='number'
          min={1}
          max={5}
          value={selectedNode.level || 1}
          onChange={(event) => update({ level: Number(event.target.value) || 1 })}
          className={inputCls()}
        />
      </Field>

      <Field label='Estilo del título'>
        <select
          value={selectedNode.sectionTextMode || 'block'}
          onChange={(event) => update({ sectionTextMode: event.target.value === 'inline' ? 'inline' : 'block' })}
          className={inputCls()}
        >
          <option value='block'>Bloque</option>
          <option value='inline'>Inline</option>
        </select>
      </Field>
    </Section>
  );
}

export default StructureProperties;
