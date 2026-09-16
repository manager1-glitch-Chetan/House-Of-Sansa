import { useEffect } from 'react'
import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Field, TextInput, Select } from '@/components/common/Field'
import { todayISO } from '@/lib/utils'

export default function CamRptTab({ order, employees, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'camRpt', onChanged)
  const { draft, setField, editMode, user } = ctx
  const disabled = !editMode

  const approvers = employees.filter((e) => ['admin', 'management', 'production_manager'].includes(e.role))

  // Prefill everything that has an obvious default the moment the form opens.
  useEffect(() => {
    if (!editMode) return
    if (!draft.approvedBy) setField('approvedBy', user?.name || '')
    if (!draft.rptDate) setField('rptDate', todayISO())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode])

  return (
    <StageFrame ctx={ctx} stageKey="camRpt" submitStatus="Completed" onCancel={onCancel} hideAttachments>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Approved By">
          <Select value={draft.approvedBy || ''} onChange={(e) => setField('approvedBy', e.target.value)} options={approvers.map((a) => a.name)} disabled={disabled} />
        </Field>
        <Field label="Date">
          <TextInput type="date" value={draft.rptDate || ''} onChange={(e) => setField('rptDate', e.target.value)} disabled={disabled} />
        </Field>
      </div>
    </StageFrame>
  )
}
