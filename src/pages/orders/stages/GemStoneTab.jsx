import { useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Field, TextInput, Select } from '@/components/common/Field'
import { uid, todayISO } from '@/lib/utils'

function blankRow() {
  return { id: uid('gs'), type: '', shape: '', size: '', quality: '', colour: '', pcs: '', weight: '' }
}

const hasValue = (row) => row.type || row.shape || row.size || row.quality || row.colour || row.pcs || row.weight

export default function GemStoneTab({ order, employees, masters, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'gemStone', onChanged)
  const { draft, setField, editMode, save, user } = ctx
  const disabled = !editMode

  const approvers = employees.filter((e) => ['admin', 'management', 'production_manager'].includes(e.role))
  const particulars = draft.particulars?.length ? draft.particulars : [blankRow()]

  // Prefill an approver and a first blank row the moment the form opens.
  useEffect(() => {
    if (!editMode) return
    if (!draft.approvedBy) setField('approvedBy', user?.name || '')
    if (!draft.particulars || draft.particulars.length === 0) setField('particulars', [blankRow()])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode])

  const updateRow = (rowId, key, value) => setField('particulars', particulars.map((r) => (r.id === rowId ? { ...r, [key]: value } : r)))
  const addRow = () => setField('particulars', [...particulars, blankRow()])
  const removeRow = (rowId) => setField('particulars', particulars.length > 1 ? particulars.filter((r) => r.id !== rowId) : particulars)

  const handleSubmit = async () => {
    const res = await save('Submit', {
      status: 'Completed',
      assignedPerson: user?.name || draft.assignedPerson,
      startDate: draft.startDate || todayISO(),
      completionDate: todayISO(),
      particulars: particulars.filter(hasValue),
    })
    if (res?.error) alert(res.error)
    return res
  }

  return (
    <StageFrame ctx={ctx} stageKey="gemStone" onCancel={onCancel} onSubmit={handleSubmit} hideAttachments>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Gem Stone Requirement</h4>
          {!disabled && (
            <button type="button" onClick={addRow} className="btn-outline btn-sm inline-flex items-center gap-1">
              <Plus size={13} /> Add Gem Stone
            </button>
          )}
        </div>

        <div className="space-y-3">
          {particulars.map((row) => (
            <div key={row.id} className="grid grid-cols-2 gap-3 rounded-lg border border-hos-ink-100 p-3 sm:grid-cols-3 lg:grid-cols-7">
              <Field label="Type">
                <Select value={row.type} onChange={(e) => updateRow(row.id, 'type', e.target.value)} options={(masters.gemstoneType || []).map((m) => m.name)} disabled={disabled} />
              </Field>
              <Field label="Shape">
                <Select value={row.shape} onChange={(e) => updateRow(row.id, 'shape', e.target.value)} options={(masters.gemstoneShape || []).map((m) => m.name)} disabled={disabled} />
              </Field>
              <Field label="Size">
                <Select value={row.size} onChange={(e) => updateRow(row.id, 'size', e.target.value)} options={(masters.gemstoneSize || []).map((m) => m.name)} disabled={disabled} />
              </Field>
              <Field label="Quality">
                <Select value={row.quality} onChange={(e) => updateRow(row.id, 'quality', e.target.value)} options={(masters.gemstoneQuality || []).map((m) => m.name)} disabled={disabled} />
              </Field>
              <Field label="Colour">
                <Select value={row.colour} onChange={(e) => updateRow(row.id, 'colour', e.target.value)} options={(masters.gemstoneColour || []).map((m) => m.name)} disabled={disabled} />
              </Field>
              <Field label="Pcs">
                <TextInput type="number" min={0} value={row.pcs} onChange={(e) => updateRow(row.id, 'pcs', e.target.value)} disabled={disabled} />
              </Field>
              <div className="flex items-end gap-1.5">
                <Field label="Weight (ct)" className="flex-1">
                  <TextInput type="number" step="0.01" min={0} value={row.weight} onChange={(e) => updateRow(row.id, 'weight', e.target.value)} disabled={disabled} />
                </Field>
                {!disabled && particulars.length > 1 && (
                  <button type="button" onClick={() => removeRow(row.id)} title="Remove" className="mb-0.5 shrink-0 rounded p-2 text-hos-ink-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Field label="Approved By" className="max-w-xs">
          <Select value={draft.approvedBy || ''} onChange={(e) => setField('approvedBy', e.target.value)} options={approvers.map((a) => a.name)} disabled={disabled} />
        </Field>
      </div>
    </StageFrame>
  )
}
