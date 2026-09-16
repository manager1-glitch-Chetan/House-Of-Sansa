import { useEffect } from 'react'
import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Field, TextInput } from '@/components/common/Field'
import FileUpload from '@/components/common/FileUpload'

export default function PackingTab({ order, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'packing', onChanged)
  const { draft, setField, editMode } = ctx
  const disabled = !editMode

  useEffect(() => {
    if (!editMode) return
    if (!draft.pcs && order.quantity) setField('pcs', order.quantity)
    if (!draft.finalGoldWeight && order.stages.finalQc?.finalGoldWeight) setField('finalGoldWeight', order.stages.finalQc.finalGoldWeight)
    if (!draft.finalDiamondWeight && order.stages.finalQc?.finalDiamondWeight) setField('finalDiamondWeight', order.stages.finalQc.finalDiamondWeight)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode])

  return (
    <StageFrame ctx={ctx} stageKey="packing" submitStatus="Packed" onCancel={onCancel}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Pcs">
          <TextInput type="number" value={draft.pcs || order.quantity || ''} onChange={(e) => setField('pcs', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Final Gold Weight (g)">
          <TextInput type="number" step="0.01" value={draft.finalGoldWeight || ''} onChange={(e) => setField('finalGoldWeight', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Final Diamond Weight (ct)">
          <TextInput type="number" step="0.01" value={draft.finalDiamondWeight || ''} onChange={(e) => setField('finalDiamondWeight', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Tag No.">
          <TextInput value={draft.tagNo || ''} onChange={(e) => setField('tagNo', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Certificate No.">
          <TextInput value={draft.certificateNo || ''} onChange={(e) => setField('certificateNo', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Invoice No.">
          <TextInput value={draft.invoiceNo || ''} onChange={(e) => setField('invoiceNo', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Code No.">
          <TextInput value={draft.codeNo || ''} onChange={(e) => setField('codeNo', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="HUID No.">
          <TextInput value={draft.huidNo || ''} onChange={(e) => setField('huidNo', e.target.value)} disabled={disabled} />
        </Field>
      </div>

      <FileUpload label="Packing Images / Documents" value={draft.packingDocs || []} onChange={(v) => setField('packingDocs', v)} disabled={disabled} />
    </StageFrame>
  )
}
