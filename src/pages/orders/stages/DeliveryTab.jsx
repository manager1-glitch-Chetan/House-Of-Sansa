import { useEffect } from 'react'
import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Field, TextInput } from '@/components/common/Field'
import FileUpload from '@/components/common/FileUpload'
import { todayISO } from '@/lib/utils'

export default function DeliveryTab({ order, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'delivery', onChanged)
  const { draft, setField, editMode } = ctx
  const disabled = !editMode

  useEffect(() => {
    if (!editMode) return
    if (!draft.pcs && order.quantity) setField('pcs', order.quantity)
    if (!draft.invoiceNo && order.stages.packing?.invoiceNo) setField('invoiceNo', order.stages.packing.invoiceNo)
    if (!draft.dispatchDate) setField('dispatchDate', todayISO())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode])

  return (
    <StageFrame ctx={ctx} stageKey="delivery" submitStatus="Delivered" onCancel={onCancel}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Dispatch Date">
          <TextInput type="date" value={draft.dispatchDate || ''} onChange={(e) => setField('dispatchDate', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Pcs">
          <TextInput type="number" value={draft.pcs || order.quantity || ''} onChange={(e) => setField('pcs', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Invoice No.">
          <TextInput value={draft.invoiceNo || ''} onChange={(e) => setField('invoiceNo', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Courier / Transporter">
          <TextInput value={draft.courierTransporter || ''} onChange={(e) => setField('courierTransporter', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Tracking No.">
          <TextInput value={draft.trackingNo || ''} onChange={(e) => setField('trackingNo', e.target.value)} disabled={disabled} />
        </Field>
      </div>
      <FileUpload label="POD (Proof of Delivery)" value={draft.pod || []} onChange={(v) => setField('pod', v)} disabled={disabled} />
    </StageFrame>
  )
}
