import { useState } from 'react'
import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Field, TextInput, Select } from '@/components/common/Field'
import { todayISO } from '@/lib/utils'

export default function KarigarAssignTab({ order, masters, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'karigarAssign', onChanged)
  const { draft, setField, editMode, isTerminal, user } = ctx
  const disabled = !editMode
  const [errors, setErrors] = useState({})
  // Karigar Assign Date defaults to today until the stage is completed — usually
  // the piece is handed over the same day it's assigned. Still editable.
  const assignDate = draft.startDate || (isTerminal ? '' : todayISO())

  const validate = () => {
    const e = {}
    if (!draft.karigarName) e.karigarName = 'Karigar Name is required.'
    if (!assignDate) e.startDate = 'Karigar Assign Date is required.'
    if (!draft.targetDate) e.targetDate = 'Expected Date from Karigar is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return { error: 'Please fill in all required fields before submitting.' }
    const res = await ctx.save('Submit', {
      status: 'Completed',
      assignedPerson: draft.karigarName || user?.name || draft.assignedPerson,
      startDate: assignDate || todayISO(),
      completionDate: todayISO(),
    })
    if (res?.error) alert(res.error)
    return res
  }

  return (
    <StageFrame ctx={ctx} stageKey="karigarAssign" onCancel={onCancel} onSubmit={handleSubmit} hideAttachments>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Karigar Name" required error={errors.karigarName}>
          <Select
            value={draft.karigarName || ''}
            onChange={(e) => setField('karigarName', e.target.value)}
            options={(masters?.karigar || []).map((k) => k.name)}
            placeholder="Select karigar…"
            disabled={disabled}
          />
        </Field>
        <Field label="Karigar Assign Date" required error={errors.startDate} hint="Date the piece is handed over to the karigar">
          <TextInput type="date" value={assignDate} onChange={(e) => setField('startDate', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Expected Date from Karigar" required error={errors.targetDate} hint="Date the karigar is expected to deliver it back">
          <TextInput type="date" value={draft.targetDate || ''} onChange={(e) => setField('targetDate', e.target.value)} disabled={disabled} />
        </Field>
      </div>
    </StageFrame>
  )
}
