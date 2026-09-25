import { useEffect } from 'react'
import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Field, TextInput, Select } from '@/components/common/Field'
import { todayISO } from '@/lib/utils'
import { logMaterialTransaction } from '@/lib/db'
import { useConfirm } from '@/components/common/ConfirmDialog'

const n = (v) => Number(v) || 0

export default function CastingTab({ order, masters, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'casting', onChanged)
  const { draft, setField, editMode, save, user } = ctx
  const disabled = !editMode
  const confirm = useConfirm()

  // Casting in a different purity than the customer ordered is a real
  // change to the piece — it needs a reason, which is saved on the stage
  // (and so shows in its history). Orders.updateStage enforces it too.
  const orderPurity = order.gold?.purity || ''
  const purityChanged = !!orderPurity && !!draft.goldPurity && draft.goldPurity !== orderPurity

  const askPurityReason = (value) =>
    confirm({
      title: 'Gold Purity Change',
      message: `This order was booked in ${orderPurity} ${(order.gold?.type || 'gold').toLowerCase()}. You selected ${value} for casting. Please give a reason for changing the purity.`,
      requireReason: true,
      reasonPlaceholder: `e.g. Customer asked for ${value} on call, confirmed by sales`,
      confirmLabel: 'Change Purity',
    })

  const onPurityChange = async (value) => {
    if (!orderPurity || !value || value === orderPurity) {
      setField('goldPurity', value)
      setField('purityChangeReason', '')
      return
    }
    const reason = await askPurityReason(value)
    if (!reason) return // cancelled — the select stays on the previous purity
    setField('goldPurity', value)
    setField('purityChangeReason', reason)
  }

  useEffect(() => {
    if (!editMode) return
    if (!draft.goldPurity && order.gold?.purity) setField('goldPurity', order.gold.purity)
    if (!draft.goldColour && order.gold?.colour) setField('goldColour', order.gold.colour)
    if (!draft.sizeOfArticle && order.size) setField('sizeOfArticle', order.size)
    if (!draft.plannedPcs && order.quantity) setField('plannedPcs', order.quantity)
    if (!draft.castingDate) setField('castingDate', todayISO())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode])

  const goodPcs = Math.max(0, n(draft.castedPcs) - n(draft.rejectedPcs))

  const handleSubmit = async () => {
    // A purity that differs without a saved reason (e.g. set before this
    // popup existed) asks for the reason here instead of failing the save.
    let purityChangeReason = purityChanged ? draft.purityChangeReason || '' : ''
    if (purityChanged && !purityChangeReason.trim()) {
      purityChangeReason = await askPurityReason(draft.goldPurity)
      if (!purityChangeReason) return { cancelled: true }
      setField('purityChangeReason', purityChangeReason)
    }
    const res = await save('Submit', {
      status: 'Completed',
      assignedPerson: user?.name || draft.assignedPerson,
      startDate: draft.startDate || todayISO(),
      completionDate: todayISO(),
      purityChangeReason,
    })
    if (res?.ok && n(draft.goldWeight)) {
      logMaterialTransaction({
        orderId: order.id,
        orderNumber: order.orderNumber,
        material: 'gold',
        stage: 'casting',
        user,
        type: 'Final',
        weight: n(draft.goldWeight),
        remarks: `Casting Date: ${draft.castingDate || todayISO()}`,
      })
    } else if (res?.error) alert(res.error)
    return res
  }

  return (
    <StageFrame ctx={ctx} stageKey="casting" onCancel={onCancel} onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Casting Date">
            <TextInput type="date" value={draft.castingDate || ''} onChange={(e) => setField('castingDate', e.target.value)} disabled={disabled} />
          </Field>
          <Field
            label="Purity"
            hint={orderPurity ? (purityChanged ? `Changed from ${orderPurity} — ${draft.purityChangeReason || 'reason needed'}` : `As per order (${orderPurity})`) : undefined}
          >
            <Select value={draft.goldPurity || ''} onChange={(e) => onPurityChange(e.target.value)} options={(masters.goldPurity || []).map((m) => m.name)} disabled={disabled} />
          </Field>
          <Field label="Gold Colour">
            <Select value={draft.goldColour || ''} onChange={(e) => setField('goldColour', e.target.value)} options={(masters.goldColour || []).map((m) => m.name)} disabled={disabled} />
          </Field>
          <Field label="Size of Article">
            <TextInput value={draft.sizeOfArticle || ''} onChange={(e) => setField('sizeOfArticle', e.target.value)} disabled={disabled} />
          </Field>
          <Field label="Planned Pcs">
            <TextInput type="number" value={draft.plannedPcs || ''} onChange={(e) => setField('plannedPcs', e.target.value)} disabled={disabled} />
          </Field>
          <Field label="Casted Pcs">
            <TextInput type="number" value={draft.castedPcs || ''} onChange={(e) => setField('castedPcs', e.target.value)} disabled={disabled} />
          </Field>
          <Field label="Gold Weight (g)">
            <TextInput type="number" step="0.01" value={draft.goldWeight || ''} onChange={(e) => setField('goldWeight', e.target.value)} disabled={disabled} />
          </Field>
          <Field label="Rejected Pcs">
            <TextInput type="number" value={draft.rejectedPcs || ''} onChange={(e) => setField('rejectedPcs', e.target.value)} disabled={disabled} />
          </Field>
        </div>

        <div className="rounded-lg bg-hos-ink-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Good Pcs (Casted − Rejected)</div>
          <div className="text-lg font-bold text-hos-ink-900">{goodPcs}</div>
        </div>
      </div>
    </StageFrame>
  )
}
