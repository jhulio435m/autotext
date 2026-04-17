import { Section, Field, inputCls } from '../shared';
import SmartInput from '../../ui/SmartInput';

export function TextProperties() {
  return null;
}

export function TemplateTextProperties({ selectedNode, update }) {
  return (
    <Section title='Texto plantilla'>

      <Field label='Modo'>
        <select
          value={selectedNode.templateMode || 'inline'}
          onChange={(event) => update({ templateMode: event.target.value })}
          className={inputCls()}
        >
          <option value='inline'>Redaccion integrada</option>
          <option value='statement'>Enunciado</option>
        </select>
      </Field>
    </Section>
  );
}

export function AiTextProperties({ selectedNode, update }) {
  return (
    <Section title='Texto IA'>
      <Field label='Prompt plantilla'>
        <SmartInput
          multiline
          rows={4}
          value={selectedNode.promptTemplate || ''}
          onChange={(val) => update({ promptTemplate: val })}
          className={inputCls()}
          placeholder='Usa variables como {{var_contexto}}'
        />
      </Field>

      <Field label='Variables de entrada'>
        <input
          value={(selectedNode.inputVariables || []).join(', ')}
          onChange={(event) => {
            const variables = event.target.value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean);
            update({ inputVariables: variables });
          }}
          className={inputCls()}
          placeholder='var_contexto, var_objetivo'
        />
      </Field>

      <Field label='Modo de generación'>
        <select
          value={selectedNode.generationMode || 'manual'}
          onChange={(event) => update({ generationMode: event.target.value })}
          className={inputCls()}
        >
          <option value='manual'>Manual</option>
          <option value='on_demand'>Bajo demanda</option>
        </select>
      </Field>
    </Section>
  );
}
