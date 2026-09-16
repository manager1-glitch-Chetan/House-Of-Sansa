import { useEffect } from 'react'
import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Field, Select } from '@/components/common/Field'
import { todayISO } from '@/lib/utils'

const DECISION_OPTIONS = ['Approved', 'Rejected', 'Hold']

export default function PlanningTab({ order, employees, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'planning', onChanged)
  const { draft, setField, editMode, save, user } = ctx
  const disabled = !editMode

  const approvers = employees.filter((e) => ['admin', 'management', 'production_manager'].includes(e.role))

  // Prefill everything that has an obvious default the moment the form opens.
  useEffect(() => {
    if (!editMode) return
    if (!draft.approvedBy) setField('approvedBy', user?.name || '')
    if (!draft.decision) setField('decision', 'Approved')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode])

  const handleSubmit = async () => {
    const decision = draft.decision || 'Approved'
    const res = await save('Submit', {
      status: decision,
      assignedPerson: user?.name || draft.assignedPerson,
      startDate: draft.startDate || todayISO(),
      completionDate: todayISO(),
    })
    if (res?.error) alert(res.error)
    return res
  }

  return (
    <StageFrame ctx={ctx} stageKey="planning" onCancel={onCancel} onSubmit={handleSubmit} hideAttachments>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Status">
          <Select value={draft.decision || 'Approved'} onChange={(e) => setField('decision', e.target.value)} options={DECISION_OPTIONS} disabled={disabled} />
        </Field>
        <Field label="Approved By">
          <Select value={draft.approvedBy || ''} onChange={(e) => setField('approvedBy', e.target.value)} options={approvers.map((a) => a.name)} disabled={disabled} />
        </Field>
      </div>
    </StageFrame>
  )
}
