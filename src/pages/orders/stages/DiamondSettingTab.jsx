import { useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Field, TextInput, Select, TextArea } from '@/components/common/Field'
import FileUpload from '@/components/common/FileUpload'
import { uid, todayISO, diamondReturnErrors } from '@/lib/utils'
import { logMaterialTransaction } from '@/lib/db'

const n = (v) => Number(v) || 0

// ---------------------------------------------------------------------------
// Diamond Issue rows — one per diamond type issued for setting (e.g. Round
// 2.0mm + Pear 1.5mm on the same piece). Saved as `diamondIssues`, with the
// flat `issuedPcs` / `issuedWeight` kept as their totals so reconciliation,
// reports and Final QC keep reading the same fields.
// ---------------------------------------------------------------------------
function blankIssueRow() {
  return { id: uid('di'), shape: '', size: '', quality: '', colour: '', pcs: '', weight: '', beforeSettingImage: [] }
}

const EMPTY_ISSUE_ROW = { ...blankIssueRow(), id: 'di_empty' }

const hasIssueValue = (row) => row.shape || row.size || row.quality || row.colour || row.pcs || row.weight || row.beforeSettingImage?.length

// Records saved before multiple rows existed keep one diamond in flat
// fields — surface that as row 1 so nothing entered earlier is lost.
function issueRowsFrom(record) {
  if (record.diamondIssues?.length) return record.diamondIssues
  const legacy = {
    id: 'di_legacy',
    shape: record.shape || '',
    size: record.size || '',
    quality: record.quality || '',
    colour: record.colour || '',
    pcs: record.issuedPcs || '',
    weight: record.issuedWeight || '',
    beforeSettingImage: record.beforeSettingImage || [],
  }
  return hasIssueValue(legacy) ? [legacy] : []
}

function issueTotals(rows) {
  return {
    pcs: rows.reduce((sum, r) => sum + n(r.pcs), 0),
    weight: Math.round(rows.reduce((sum, r) => sum + n(r.weight), 0) * 1000) / 1000,
  }
}

const describeIssue = (row) => [row.shape, row.size, row.quality, row.colour].filter(Boolean).join(' ')

export default function DiamondSettingTab({ order, masters, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'diamondSetting', onChanged)
  const { draft, setField, patchDraft, editMode, save, user } = ctx
  const disabled = !editMode

  const rowsOrEmpty = (record) => {
    const rows = issueRowsFrom(record)
    return rows.length ? rows : [EMPTY_ISSUE_ROW]
  }
  const issues = rowsOrEmpty(draft)
  const issuedTotals = issueTotals(issues)
  // Shown live under Returned PCS / Weight; the same check blocks saving.
  const returnErrors = editMode ? diamondReturnErrors({ ...draft, issuedPcs: issuedTotals.pcs, issuedWeight: issuedTotals.weight }) : {}

  // Every row change goes through the latest draft (a Before Setting Image
  // upload finishes asynchronously), and moves the totals with the rows so
  // the generic "In Progress" save (StageFrame) stores correct issuedPcs /
  // issuedWeight too, not just Submit.
  const changeIssues = (fn) =>
    patchDraft((d) => {
      const rows = fn(rowsOrEmpty(d))
      const totals = issueTotals(rows)
      return { diamondIssues: rows, issuedPcs: totals.pcs, issuedWeight: totals.weight }
    })
  const updateIssue = (rowId, key, value) => changeIssues((rows) => rows.map((r) => (r.id === rowId ? { ...r, [key]: value } : r)))
  const addIssue = () => changeIssues((rows) => [...rows, blankIssueRow()])
  const removeIssue = (rowId) => changeIssues((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== rowId) : rows))

  // The Gem Stone stage (right after CAM/RPT) records what this design
  // needs before casting — pull that requirement in as the starting point
  // for what actually gets issued for setting.
  const gemRequirement = order.stages.gemStone?.particulars || []
  const gemRequiredPcs = gemRequirement.reduce((s, p) => s + (Number(p.pcs) || 0), 0)
  const gemRequiredWeight = gemRequirement.reduce((s, p) => s + (Number(p.weight) || 0), 0)

  useEffect(() => {
    if (!editMode) return
    // First diamond row starts from what was planned on the New Order form.
    if (!draft.diamondIssues?.length) {
      changeIssues((rows) => (rows[0] === EMPTY_ISSUE_ROW ? [{ ...blankIssueRow(), pcs: order.diamond?.pcs || '', weight: order.diamond?.weight || '' }] : rows))
    }
    if (!draft.gemstoneIssuedPcs && gemRequiredPcs) setField('gemstoneIssuedPcs', gemRequiredPcs)
    if (!draft.gemstoneIssuedWeight && gemRequiredWeight) setField('gemstoneIssuedWeight', gemRequiredWeight)
    if (gemRequirement.length === 1) {
      const only = gemRequirement[0]
      if (!draft.gemstoneType && only.type) setField('gemstoneType', only.type)
      if (!draft.gemstoneShape && only.shape) setField('gemstoneShape', only.shape)
      if (!draft.gemstoneSize && only.size) setField('gemstoneSize', only.size)
      if (!draft.gemstoneQuality && only.quality) setField('gemstoneQuality', only.quality)
      if (!draft.gemstoneColour && only.colour) setField('gemstoneColour', only.colour)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode])

  const handleSubmit = async () => {
    const issueRows = issues.filter(hasIssueValue)
    const totals = issueTotals(issueRows)
    const returnError = Object.values(diamondReturnErrors({ ...draft, issuedPcs: totals.pcs, issuedWeight: totals.weight }))[0]
    if (returnError) {
      alert(returnError)
      return { error: returnError }
    }
    const res = await save('Submit', {
      status: 'Completed',
      assignedPerson: user?.name || draft.assignedPerson,
      startDate: draft.startDate || todayISO(),
      completionDate: todayISO(),
      diamondIssues: issueRows,
      issuedPcs: totals.pcs,
      issuedWeight: totals.weight,
    })
    if (res?.ok) {
      const stamp = { orderId: order.id, orderNumber: order.orderNumber, stage: 'diamondSetting', user }
      // One ledger line per diamond type, so the ledger shows what was issued.
      issueRows.forEach((row) => {
        if (n(row.pcs) || n(row.weight)) {
          logMaterialTransaction({ ...stamp, material: 'diamond', type: 'Issued', qty: n(row.pcs), weight: n(row.weight), remarks: [describeIssue(row), draft.issueRemarks].filter(Boolean).join(' — ') })
        }
      })
      if (n(draft.usedPcs) || n(draft.usedWeight)) logMaterialTransaction({ ...stamp, material: 'diamond', type: 'Consumed', qty: n(draft.usedPcs), weight: n(draft.usedWeight), remarks: draft.consumptionRemarks })
      if (n(draft.returnedPcs) || n(draft.returnedWeight)) logMaterialTransaction({ ...stamp, material: 'diamond', type: 'Returned', qty: n(draft.returnedPcs), weight: n(draft.returnedWeight) })
      if (n(draft.brokenLostPcs) || n(draft.brokenLostWeight)) logMaterialTransaction({ ...stamp, material: 'diamond', type: 'Broken/Lost', qty: n(draft.brokenLostPcs), weight: n(draft.brokenLostWeight) })

      if (n(draft.gemstoneIssuedPcs) || n(draft.gemstoneIssuedWeight)) logMaterialTransaction({ ...stamp, material: 'gemstone', type: 'Issued', qty: n(draft.gemstoneIssuedPcs), weight: n(draft.gemstoneIssuedWeight), remarks: draft.gemstoneIssueRemarks })
      if (n(draft.gemstoneUsedPcs) || n(draft.gemstoneUsedWeight)) logMaterialTransaction({ ...stamp, material: 'gemstone', type: 'Consumed', qty: n(draft.gemstoneUsedPcs), weight: n(draft.gemstoneUsedWeight), remarks: draft.gemstoneConsumptionRemarks })
      if (n(draft.gemstoneReturnedPcs) || n(draft.gemstoneReturnedWeight)) logMaterialTransaction({ ...stamp, material: 'gemstone', type: 'Returned', qty: n(draft.gemstoneReturnedPcs), weight: n(draft.gemstoneReturnedWeight) })
      if (n(draft.gemstoneBrokenLostPcs) || n(draft.gemstoneBrokenLostWeight)) logMaterialTransaction({ ...stamp, material: 'gemstone', type: 'Broken/Lost', qty: n(draft.gemstoneBrokenLostPcs), weight: n(draft.gemstoneBrokenLostWeight) })
    } else if (res?.error) alert(res.error)
    return res
  }

  return (
    <StageFrame ctx={ctx} stageKey="diamondSetting" onCancel={onCancel} onSubmit={handleSubmit} hideRemarks>
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Diamond Issue</h4>
            {!disabled && (
              <button type="button" onClick={addIssue} className="btn-outline btn-sm inline-flex items-center gap-1">
                <Plus size={13} /> Add Diamond
              </button>
            )}
          </div>
          <div className="space-y-3">
            {issues.map((row, idx) => (
              <div key={row.id} className="rounded-lg border border-hos-ink-100 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-hos-ink-600">Diamond {idx + 1}</span>
                  {!disabled && issues.length > 1 && (
                    <button type="button" onClick={() => removeIssue(row.id)} title="Remove this diamond" className="shrink-0 rounded p-1.5 text-hos-ink-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  <Field label="Shape">
                    <Select value={row.shape || ''} onChange={(e) => updateIssue(row.id, 'shape', e.target.value)} options={(masters.diamondShape || []).map((m) => m.name)} disabled={disabled} />
                  </Field>
                  <Field label="Size">
                    <Select value={row.size || ''} onChange={(e) => updateIssue(row.id, 'size', e.target.value)} options={(masters.diamondSize || []).map((m) => m.name)} disabled={disabled} />
                  </Field>
                  <Field label="Quality">
                    <Select value={row.quality || ''} onChange={(e) => updateIssue(row.id, 'quality', e.target.value)} options={(masters.diamondQuality || []).map((m) => m.name)} disabled={disabled} />
                  </Field>
                  <Field label="Colour">
                    <Select value={row.colour || ''} onChange={(e) => updateIssue(row.id, 'colour', e.target.value)} options={(masters.diamondColour || []).map((m) => m.name)} disabled={disabled} />
                  </Field>
                  <Field label="Issued PCs">
                    <TextInput type="number" min={0} value={row.pcs || ''} onChange={(e) => updateIssue(row.id, 'pcs', e.target.value)} disabled={disabled} />
                  </Field>
                  <Field label="Issued Weight (CT)">
                    <TextInput type="number" step="0.01" min={0} value={row.weight || ''} onChange={(e) => updateIssue(row.id, 'weight', e.target.value)} disabled={disabled} />
                  </Field>
                  <FileUpload label="Before Setting Image" value={row.beforeSettingImage || []} onChange={(v) => updateIssue(row.id, 'beforeSettingImage', v)} disabled={disabled} multiple={false} />
                </div>
              </div>
            ))}
          </div>
          {issues.length > 1 && (
            <p className="mt-2 text-sm text-hos-ink-600">
              Total issued: <span className="font-semibold text-hos-ink-900">{issuedTotals.pcs} pcs · {issuedTotals.weight} ct</span>
            </p>
          )}
          <Field label="Remarks" className="mt-3">
            <TextArea rows={2} value={draft.issueRemarks || ''} onChange={(e) => setField('issueRemarks', e.target.value)} disabled={disabled} />
          </Field>
        </div>

        <div className="border-t border-hos-ink-100 pt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Diamond Consumption</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Used Pcs">
              <TextInput type="number" value={draft.usedPcs || ''} onChange={(e) => setField('usedPcs', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Used Weight (CT)">
              <TextInput type="number" step="0.01" value={draft.usedWeight || ''} onChange={(e) => setField('usedWeight', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Returned PCS" error={returnErrors.returnedPcs} hint={editMode ? `Max ${issuedTotals.pcs} (issued)` : undefined}>
              <TextInput type="number" min={0} max={issuedTotals.pcs} value={draft.returnedPcs || ''} onChange={(e) => setField('returnedPcs', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Returned Weight (CT)" error={returnErrors.returnedWeight} hint={editMode ? `Max ${issuedTotals.weight} ct (issued)` : undefined}>
              <TextInput type="number" step="0.01" min={0} max={issuedTotals.weight} value={draft.returnedWeight || ''} onChange={(e) => setField('returnedWeight', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Broken / Lost PCS">
              <TextInput type="number" value={draft.brokenLostPcs || ''} onChange={(e) => setField('brokenLostPcs', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Broken / Lost Weight (CT)">
              <TextInput type="number" step="0.01" value={draft.brokenLostWeight || ''} onChange={(e) => setField('brokenLostWeight', e.target.value)} disabled={disabled} />
            </Field>
            <FileUpload label="After Setting Image" value={draft.afterSettingImage || []} onChange={(v) => setField('afterSettingImage', v)} disabled={disabled} multiple={false} />
          </div>
          <Field label="Remarks" className="mt-3">
            <TextArea rows={2} value={draft.consumptionRemarks || ''} onChange={(e) => setField('consumptionRemarks', e.target.value)} disabled={disabled} />
          </Field>
        </div>

        <div className="border-t border-hos-ink-100 pt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Gem Stone Issue</h4>
          {gemRequirement.length > 0 && (
            <p className="mb-3 text-xs text-hos-ink-400">
              Requirement from Gem Stone stage: {gemRequirement.map((g) => `${g.type || 'Stone'} ${g.pcs || 0}pc/${g.weight || 0}ct`).join(', ')}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Type">
              <Select value={draft.gemstoneType || ''} onChange={(e) => setField('gemstoneType', e.target.value)} options={(masters.gemstoneType || []).map((m) => m.name)} disabled={disabled} />
            </Field>
            <Field label="Shape">
              <Select value={draft.gemstoneShape || ''} onChange={(e) => setField('gemstoneShape', e.target.value)} options={(masters.gemstoneShape || []).map((m) => m.name)} disabled={disabled} />
            </Field>
            <Field label="Size">
              <Select value={draft.gemstoneSize || ''} onChange={(e) => setField('gemstoneSize', e.target.value)} options={(masters.gemstoneSize || []).map((m) => m.name)} disabled={disabled} />
            </Field>
            <Field label="Quality">
              <Select value={draft.gemstoneQuality || ''} onChange={(e) => setField('gemstoneQuality', e.target.value)} options={(masters.gemstoneQuality || []).map((m) => m.name)} disabled={disabled} />
            </Field>
            <Field label="Colour">
              <Select value={draft.gemstoneColour || ''} onChange={(e) => setField('gemstoneColour', e.target.value)} options={(masters.gemstoneColour || []).map((m) => m.name)} disabled={disabled} />
            </Field>
            <Field label="Issued PCs">
              <TextInput type="number" value={draft.gemstoneIssuedPcs || ''} onChange={(e) => setField('gemstoneIssuedPcs', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Issued Weight (CT)">
              <TextInput type="number" step="0.01" value={draft.gemstoneIssuedWeight || ''} onChange={(e) => setField('gemstoneIssuedWeight', e.target.value)} disabled={disabled} />
            </Field>
            <FileUpload label="Before Setting Image" value={draft.gemstoneBeforeSettingImage || []} onChange={(v) => setField('gemstoneBeforeSettingImage', v)} disabled={disabled} multiple={false} />
          </div>
          <Field label="Remarks" className="mt-3">
            <TextArea rows={2} value={draft.gemstoneIssueRemarks || ''} onChange={(e) => setField('gemstoneIssueRemarks', e.target.value)} disabled={disabled} />
          </Field>
        </div>

        <div className="border-t border-hos-ink-100 pt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Gem Stone Consumption</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <Field label="Used Pcs">
              <TextInput type="number" value={draft.gemstoneUsedPcs || ''} onChange={(e) => setField('gemstoneUsedPcs', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Used Weight (CT)">
              <TextInput type="number" step="0.01" value={draft.gemstoneUsedWeight || ''} onChange={(e) => setField('gemstoneUsedWeight', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Returned PCS">
              <TextInput type="number" value={draft.gemstoneReturnedPcs || ''} onChange={(e) => setField('gemstoneReturnedPcs', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Returned Weight (CT)">
              <TextInput type="number" step="0.01" value={draft.gemstoneReturnedWeight || ''} onChange={(e) => setField('gemstoneReturnedWeight', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Broken / Lost PCS">
              <TextInput type="number" value={draft.gemstoneBrokenLostPcs || ''} onChange={(e) => setField('gemstoneBrokenLostPcs', e.target.value)} disabled={disabled} />
            </Field>
            <Field label="Broken / Lost Weight (CT)">
              <TextInput type="number" step="0.01" value={draft.gemstoneBrokenLostWeight || ''} onChange={(e) => setField('gemstoneBrokenLostWeight', e.target.value)} disabled={disabled} />
            </Field>
            <FileUpload label="After Setting Image" value={draft.gemstoneAfterSettingImage || []} onChange={(v) => setField('gemstoneAfterSettingImage', v)} disabled={disabled} multiple={false} />
          </div>
          <Field label="Remarks" className="mt-3">
            <TextArea rows={2} value={draft.gemstoneConsumptionRemarks || ''} onChange={(e) => setField('gemstoneConsumptionRemarks', e.target.value)} disabled={disabled} />
          </Field>
        </div>
      </div>
    </StageFrame>
  )
}
