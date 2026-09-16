import { useEffect } from 'react'
import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Field, TextInput, Select } from '@/components/common/Field'
import FileUpload from '@/components/common/FileUpload'

const CHECKLIST_ITEMS = ['Size Check', 'Diamond Setting Check', 'Prong Check', 'Polishing', 'Finishing', 'Rhodium Check']

export default function FinalQcTab({ order, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'finalQc', onChanged)
  const { draft, setField, editMode } = ctx
  const disabled = !editMode

  useEffect(() => {
    if (!draft.checklist || draft.checklist.length === 0) {
      setField('checklist', CHECKLIST_ITEMS.map((item) => ({ item, result: 'NA', remarks: '' })))
    }
    if (!editMode) return
    if (!draft.finalPcs && order.quantity) setField('finalPcs', order.quantity)
    if (!draft.finalGoldWeight && (order.stages.packing?.finalGoldWeight || order.stages.casting?.finalGoldWeight || order.gold?.estimatedWeight)) {
      setField('finalGoldWeight', order.stages.packing?.finalGoldWeight || order.stages.casting?.finalGoldWeight || order.gold?.estimatedWeight)
    }
    if (!draft.finalDiamondPcs && order.diamond?.pcs) setField('finalDiamondPcs', order.diamond.pcs)
    if (!draft.finalDiamondWeight && order.diamond?.weight) setField('finalDiamondWeight', order.diamond.weight)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode])

  const setChecklistRow = (item, key, value) => {
    setField(
      'checklist',
      (draft.checklist || []).map((r) => (r.item === item ? { ...r, [key]: value } : r))
    )
  }

  const failCount = (draft.checklist || []).filter((r) => r.result === 'Fail').length

  return (
    <StageFrame ctx={ctx} stageKey="finalQc" submitStatus="Approved" onCancel={onCancel}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Final Pcs">
          <TextInput type="number" value={draft.finalPcs || order.quantity || ''} onChange={(e) => setField('finalPcs', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Final Gold Weight (g)">
          <TextInput type="number" step="0.01" value={draft.finalGoldWeight || ''} onChange={(e) => setField('finalGoldWeight', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Final Diamond Pcs">
          <TextInput type="number" value={draft.finalDiamondPcs || ''} onChange={(e) => setField('finalDiamondPcs', e.target.value)} disabled={disabled} />
        </Field>
        <Field label="Final Diamond Weight (ct)">
          <TextInput type="number" step="0.01" value={draft.finalDiamondWeight || ''} onChange={(e) => setField('finalDiamondWeight', e.target.value)} disabled={disabled} />
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Final Jewellery Checklist</h4>
          {failCount > 0 && <span className="text-xs font-semibold text-red-600">{failCount} item(s) failed</span>}
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-hos-ink-50 text-left text-xs font-semibold uppercase text-hos-ink-500">
              <tr>
                <th className="px-3 py-2">Checklist Item</th>
                <th className="px-3 py-2 w-32">Result</th>
                <th className="px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hos-ink-100">
              {(draft.checklist || []).map((row) => (
                <tr key={row.item}>
                  <td className="px-3 py-2">{row.item}</td>
                  <td className="px-3 py-2">
                    <Select value={row.result} onChange={(e) => setChecklistRow(row.item, 'result', e.target.value)} options={['Pass', 'Fail', 'NA']} disabled={disabled} />
                  </td>
                  <td className="px-3 py-2">
                    <input className="input" value={row.remarks} onChange={(e) => setChecklistRow(row.item, 'remarks', e.target.value)} disabled={disabled} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <FileUpload label="QC Images" value={draft.qcImages || []} onChange={(v) => setField('qcImages', v)} disabled={disabled} />
    </StageFrame>
  )
}
