import { useEffect } from 'react'
import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Field, TextInput, Select } from '@/components/common/Field'
import FileUpload from '@/components/common/FileUpload'
import { todayISO } from '@/lib/utils'

export default function CadTab({ order, employees, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'cad', onChanged)
  const { draft, setField, editMode, save, user } = ctx
  const disabled = !editMode

  const designers = employees.filter((e) => e.role === 'cad_designer')
  const approvers = employees.filter((e) => ['admin', 'management', 'production_manager'].includes(e.role))

  // Prefill from whatever Planning already decided, so nothing is retyped.
  useEffect(() => {
    if (!editMode) return
    if (!draft.designerName) setField('designerName', order.stages.planning?.designerName || (designers.length === 1 ? designers[0].name : ''))
    if (!draft.cadVersion) setField('cadVersion', order.stages.planning?.cadVersion || 'V1')
    if ((!draft.cadAttachment || draft.cadAttachment.length === 0) && order.stages.planning?.cadAttachment?.length) {
      setField('cadAttachment', order.stages.planning.cadAttachment)
    }
    if (!draft.approvedBy) setField('approvedBy', user?.name || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode])

  const handleSubmit = async () => {
    const res = await save('Submit', {
      status: 'Approved',
      assignedPerson: draft.designerName || user?.name || draft.assignedPerson,
      startDate: draft.startDate || todayISO(),
      completionDate: todayISO(),
    })
    if (res?.error) alert(res.error)
    return res
  }

  return (
    <StageFrame ctx={ctx} stageKey="cad" onCancel={onCancel} onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Designer Name">
          <Select value={draft.designerName || ''} onChange={(e) => setField('designerName', e.target.value)} options={designers.map((d) => d.name)} disabled={disabled} />
        </Field>
        <Field label="CAD Version">
          <TextInput value={draft.cadVersion || ''} onChange={(e) => setField('cadVersion', e.target.value)} disabled={disabled} />
        </Field>
        <FileUpload label="CAD Attachment" value={draft.cadAttachment || []} onChange={(v) => setField('cadAttachment', v)} disabled={disabled} multiple={false} />
        <Field label="Approved By">
          <Select value={draft.approvedBy || ''} onChange={(e) => setField('approvedBy', e.target.value)} options={approvers.map((a) => a.name)} disabled={disabled} />
        </Field>
      </div>
    </StageFrame>
  )
}
