import { useEffect } from 'react'
import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Field, TextInput, Select } from '@/components/common/Field'
import { todayISO } from '@/lib/utils'

export default function RhodiumTab({ order, employees, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'rhodium', onChanged)
  const { draft, setField, editMode, user } = ctx
  const disabled = !editMode

  const approvers = employees.filter((e) => ['admin', 'management', 'production_manager'].includes(e.role))

  useEffect(() => {
    if (!editMode) return
    if (!draft.approvedBy) setField('approvedBy', user?.name || '')
    if (!draft.issueDate) setField('issueDate', todayISO())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode])

  return (
    <StageFrame ctx={ctx} stageKey="rhodium" submitStatus="Completed" onCancel={onCancel} hideRemarks hideAttachments>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Approved By">
          <Select value={draft.approvedBy || ''} onChange={(e) => setField('approvedBy', e.target.value)} options={approvers.map((a) => a.name)} disabled={disabled} />
        </Field>
        <Field label="Date">
          <TextInput type="date" value={draft.issueDate || ''} onChange={(e) => setField('issueDate', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Type">
          <Select value={draft.rhodiumType || ''} onChange={(e) => setField('rhodiumType', e.target.value)} options={['Prongs', 'Full']} disabled={disabled} />
        </Field>
      </div>
    </StageFrame>
  )
}
