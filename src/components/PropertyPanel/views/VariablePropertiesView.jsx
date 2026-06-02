import { Field, Section, inputCls } from '../shared';

export function VariableProperties({ selectedNode, update }) {
  const parseOptionalNumber = (raw) => {
    if (raw === '') return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return (
    <Section title='Campo'>
      <Field label='Tipo de entrada'>
        <select
          value={selectedNode.inputType || 'text'}
          onChange={(event) => update({ inputType: event.target.value })}
          className={inputCls()}
        >
          <option value='text'>Texto</option>
          <option value='textarea'>Texto largo</option>
          <option value='number'>Número</option>
          <option value='date'>Fecha</option>
          <option value='select'>Opción múltiple</option>
          <option value='boolean'>Si / No</option>
        </select>
      </Field>

      <Field label='Clave reutilizable'>
        <input
          value={selectedNode.variableKey || selectedNode.id || ''}
          onChange={(event) => update({ variableKey: event.target.value })}
          className={inputCls()}
          placeholder='var_plazo_ejecucion'
        />
      </Field>

      <Field label='Alcance'>
        <select
          value={selectedNode.variableScope || 'document'}
          onChange={(event) => update({ variableScope: event.target.value })}
          className={inputCls()}
        >
          <option value='document'>Documento</option>
          <option value='section'>Sección</option>
          <option value='block'>Bloque</option>
        </select>
      </Field>

      <Field label='Placeholder'>
        <input
          value={selectedNode.inputPlaceholder || ''}
          onChange={(event) => update({ inputPlaceholder: event.target.value })}
          className={inputCls()}
          placeholder='Placeholder'
        />
      </Field>

      {selectedNode.inputType === 'number' ? (
        <div className='grid grid-cols-3 gap-2'>
          <input
            value={selectedNode.inputUnit || ''}
            onChange={(event) => update({ inputUnit: event.target.value })}
            className={inputCls()}
            placeholder='Unidad'
          />
          <input
            type='number'
            value={selectedNode.inputMin ?? ''}
            onChange={(event) => update({ inputMin: parseOptionalNumber(event.target.value) })}
            className={inputCls()}
            placeholder='Min'
          />
          <input
            type='number'
            value={selectedNode.inputMax ?? ''}
            onChange={(event) => update({ inputMax: parseOptionalNumber(event.target.value) })}
            className={inputCls()}
            placeholder='Max'
          />
        </div>
      ) : null}

      {selectedNode.inputType === 'select' ? (
        <Field label='Opciones'>
          <input
            value={(selectedNode.inputOptions || []).join(', ')}
            onChange={(event) => {
              const options = event.target.value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
              update({ inputOptions: options });
            }}
            className={inputCls()}
            placeholder='Opciones separadas por coma'
          />
        </Field>
      ) : null}
    </Section>
  );
}
