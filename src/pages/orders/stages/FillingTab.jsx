import { useEffect } from 'react'
import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Field, Select } from '@/components/common/Field'

export default function FillingTab({ order, employees, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'filling', onChanged)
  const { draft, setField, editMode, user } = ctx
  const disabled = !editMode

  const approvers = employees.filter((e) => ['admin', 'management', 'production_manager'].includes(e.role))

  useEffect(() => {
    if (!editMode) return
    if (!draft.approvedBy) setField('approvedBy', user?.name || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode])

  return (
    <StageFrame ctx={ctx} stageKey="filling" submitStatus="Completed" onCancel={onCancel} hideAttachments>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Approved By">
          <Select value={draft.approvedBy || ''} onChange={(e) => setField('approvedBy', e.target.value)} options={approvers.map((a) => a.name)} disabled={disabled} />
        </Field>
      </div>
    </StageFrame>
  )
}
