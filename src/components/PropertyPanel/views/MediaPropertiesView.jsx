import { FieldToggle, Field, Section, inputCls } from '../shared';
import SmartInput from '../../ui/SmartInput';

export function ImageProperties({ selectedNode, update }) {
  const hasCaption     = Boolean(selectedNode.hasCaption);
  const hasSource      = Boolean(selectedNode.hasSource);
  const hasDescription = Boolean(selectedNode.hasDescription);

  return (
    <Section title='Imagen'>
      <Field label='Ancho'>
        <select
          value={selectedNode.width || 'full'}
          onChange={(e) => update({ width: e.target.value })}
          className={inputCls()}
        >
          <option value='full'>Completo</option>
          <option value='half'>Medio</option>
          <option value='third'>Tercio</option>
        </select>
      </Field>

      <FieldToggle label='Título' enabled={hasCaption} onToggle={() => update({ hasCaption: !hasCaption })}>
        <SmartInput value={selectedNode.label || ''} onChange={(val) => update({ label: val })} className={inputCls()} placeholder='Título visible en el documento' />
      </FieldToggle>

      {/* Fuente */}
      <FieldToggle label='Fuente' enabled={hasSource} onToggle={() => update({ hasSource: !hasSource })}>
        <SmartInput value={selectedNode.imageSource || ''} onChange={(val) => update({ imageSource: val })} className={inputCls()} placeholder='Ej: Elaboración propia' />
      </FieldToggle>

      {/* Descripción */}
      <FieldToggle label='Descripción' enabled={hasDescription} onToggle={() => update({ hasDescription: !hasDescription })}>
        <SmartInput multiline rows={2} value={selectedNode.description || ''} onChange={(val) => update({ description: val })} className={inputCls()} placeholder='Breve descripción de la imagen' />
      </FieldToggle>

      <label className='flex items-center gap-2 rounded-md px-1 py-1 text-[12px] text-slate-500 transition hover:bg-slate-50 cursor-pointer mt-1'>
        <input
          type='checkbox'
          checked={Boolean(selectedNode.float)}
          onChange={(e) => update({ float: e.target.checked })}
          className='rounded border-slate-300'
        />
        Usar float (figure)
      </label>
    </Section>
  );
}

export function LatexGraphProperties({ selectedNode, update }) {
  const hasCaption     = Boolean(selectedNode.hasCaption);
  const hasSource      = Boolean(selectedNode.hasSource);
  const hasDescription = Boolean(selectedNode.hasDescription);

  return (
    <Section title='Fórmula'>
      <Field label='Tipo'>
        <select
          value={selectedNode.mathType || 'block'}
          onChange={(e) => update({ mathType: e.target.value })}
          className={inputCls()}
        >
          <option value='inline'>Inline</option>
          <option value='block'>Bloque</option>
          <option value='align'>Alineado</option>
        </select>
      </Field>

      <FieldToggle label='Título' enabled={hasCaption} onToggle={() => update({ hasCaption: !hasCaption })}>
        <SmartInput value={selectedNode.label || ''} onChange={(val) => update({ label: val })} className={inputCls()} placeholder='Título de la fórmula' />
      </FieldToggle>

      {/* Fuente */}
      <FieldToggle label='Fuente' enabled={hasSource} onToggle={() => update({ hasSource: !hasSource })}>
        <SmartInput value={selectedNode.mathSource || ''} onChange={(val) => update({ mathSource: val })} className={inputCls()} placeholder='Ej: Elaboración propia' />
      </FieldToggle>

      {/* Descripción */}
      <FieldToggle label='Descripción' enabled={hasDescription} onToggle={() => update({ hasDescription: !hasDescription })}>
        <SmartInput multiline rows={2} value={selectedNode.description || ''} onChange={(val) => update({ description: val })} className={inputCls()} placeholder='Breve descripción de la fórmula' />
      </FieldToggle>
    </Section>
  );
}
