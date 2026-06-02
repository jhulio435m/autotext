import { FieldToggle, Field, Section, inputCls } from '../shared';
import SmartInput from '../../ui/SmartInput';

function mergeTableMeta(currentValue, patch) {
  return {
    ...(currentValue && typeof currentValue === 'object' ? currentValue : {}),
    ...patch
  };
}

export function TableProperties({ selectedNode, update, tableValue, updateTableValue }) {
  const rv = tableValue && typeof tableValue === 'object' ? tableValue : {};

  const hasCaption     = Boolean(selectedNode.hasCaption);
  const hasSource      = Boolean(selectedNode.hasSource);
  const hasDescription = Boolean(selectedNode.hasDescription);

  const visibleSource      = rv.source      || selectedNode.tableSource || '';
  const visibleDescription = rv.description || selectedNode.description || '';
  const selectedStyle       = rv.tableStyle  || selectedNode.tableStyle  || 'booktabs';
  const selectedOrientation = rv.orientation || selectedNode.orientation || 'portrait';

  return (
    <Section title='Tabla'>
      {/* Título = nombre del bloque = caption */}
      <FieldToggle
        label='Título'
        enabled={hasCaption}
        onToggle={() => update({ hasCaption: !hasCaption })}
      >
        <SmartInput
          value={selectedNode.label || ''}
          onChange={(val) => update({ label: val })}
          className={inputCls()}
          placeholder='Ej: Cuadro de datos técnicos'
        />
      </FieldToggle>

      {/* Fuente */}
      <FieldToggle
        label='Fuente'
        enabled={hasSource}
        onToggle={() => update({ hasSource: !hasSource })}
      >
        <SmartInput
          value={visibleSource}
          onChange={(val) => {
            update({ tableSource: val });
            updateTableValue?.(mergeTableMeta(rv, { source: val }));
          }}
          className={inputCls()}
          placeholder='Ej: Elaboración propia'
        />
      </FieldToggle>

      {/* Descripción */}
      <FieldToggle
        label='Descripción'
        enabled={hasDescription}
        onToggle={() => update({ hasDescription: !hasDescription })}
      >
        <SmartInput
          multiline
          rows={2}
          value={visibleDescription}
          onChange={(val) => {
            update({ description: val });
            updateTableValue?.(mergeTableMeta(rv, { description: val }));
          }}
          className={inputCls()}
          placeholder='Breve descripción de la tabla'
        />
      </FieldToggle>

      <div className='grid grid-cols-2 gap-2 pt-1'>
        <Field label='Estilo'>
          <select
            value={selectedStyle}
            onChange={(e) => {
              update({ tableStyle: e.target.value });
              updateTableValue?.(mergeTableMeta(rv, { tableStyle: e.target.value }));
            }}
            className={inputCls()}
          >
            <option value='booktabs'>Booktabs</option>
            <option value='grid'>Grid</option>
            <option value='compact'>Compact</option>
          </select>
        </Field>

        <Field label='Orientación'>
          <select
            value={selectedOrientation}
            onChange={(e) => {
              update({ orientation: e.target.value });
              updateTableValue?.(mergeTableMeta(rv, { orientation: e.target.value }));
            }}
            className={inputCls()}
          >
            <option value='portrait'>Automática</option>
            <option value='landscape'>Horizontal</option>
          </select>
        </Field>
      </div>
    </Section>
  );
}

export const AdvancedTableProperties = TableProperties;
