import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Field, TextInput } from '@/components/common/Field'
import { todayISO } from '@/lib/utils'

export default function KarigarAssignTab({ order, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'karigarAssign', onChanged)
  const { draft, setField, editMode, user } = ctx
  const disabled = !editMode

  const handleSubmit = async () => {
    const res = await ctx.save('Submit', {
      status: 'Completed',
      assignedPerson: draft.karigarName || user?.name || draft.assignedPerson,
      startDate: draft.startDate || todayISO(),
      completionDate: todayISO(),
    })
    if (res?.error) alert(res.error)
    return res
  }

  return (
    <StageFrame ctx={ctx} stageKey="karigarAssign" onCancel={onCancel} onSubmit={handleSubmit} hideAttachments>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Karigar Name">
          <TextInput value={draft.karigarName || ''} onChange={(e) => setField('karigarName', e.target.value)} placeholder="Enter karigar's name" disabled={disabled} />
        </Field>
        <Field label="Delivery Date" hint="Date the piece is handed over to the karigar">
          <TextInput type="date" value={draft.startDate || ''} onChange={(e) => setField('startDate', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Expected Delivery Date" hint="Date the karigar is expected to deliver it back">
          <TextInput type="date" value={draft.targetDate || ''} onChange={(e) => setField('targetDate', e.target.value)} disabled={disabled} />
        </Field>
      </div>
    </StageFrame>
  )
}
