import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Field, TextInput, TextArea } from '@/components/common/Field'
import FileUpload from '@/components/common/FileUpload'
import { todayISO, consumptionErrors } from '@/lib/utils'
import { logMaterialTransaction } from '@/lib/db'
import { diamondIssueRows, gemstoneIssueRows, hasIssueValue, issueTotals, describeIssue } from './issueRows'

const n = (v) => Number(v) || 0

// Totals from the issue rows; falls back to the flat totals for records
// that only ever stored those.
function issuedFrom(rows, pcs, weight) {
  return rows.length ? issueTotals(rows) : { pcs: n(pcs), weight: n(weight) }
}

// Read-only recap of what the Additional Issue stage handed out, so the
// person recording consumption sees exactly what they're accounting for.
function IssuedSummary({ itemLabel, rows, totals }) {
  if (!rows.length && !totals.pcs && !totals.weight) {
    return <p className="mb-3 rounded-lg bg-hos-ink-50 px-3 py-2 text-sm text-hos-ink-500">Nothing was issued at Additional Issue.</p>
  }
  return (
    <div className="mb-3 rounded-lg bg-hos-ink-50 px-3 py-2 text-sm">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Issued at Additional Issue</div>
      <ul className="space-y-0.5 text-hos-ink-700">
        {rows.map((row, idx) => (
          <li key={row.id || idx}>
            {itemLabel} {idx + 1}: {describeIssue(row) || '—'} — {n(row.pcs)} pcs / {n(row.weight)} ct
          </li>
        ))}
      </ul>
      <div className="mt-1 font-semibold text-hos-ink-900">
        Total: {totals.pcs} pcs · {totals.weight} ct
      </div>
    </div>
  )
}

/**
 * Consumption — after setting, what happened to everything issued on the
 * Additional Issue stage: used, returned, broken / lost, for diamonds and
 * gem stones. Returned can't go over what was issued (consumptionErrors —
 * the same rule Orders.updateStage enforces).
 */
export default function ConsumptionTab({ order, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'consumption', onChanged)
  const { draft, setField, editMode, save, user } = ctx
  const disabled = !editMode

  const issue = order.stages.diamondSetting || {}
  const diamondRows = diamondIssueRows(issue).filter(hasIssueValue)
  const gemRows = gemstoneIssueRows(issue).filter(hasIssueValue)
  const diamondIssued = issuedFrom(diamondRows, issue.issuedPcs, issue.issuedWeight)
  const gemIssued = issuedFrom(gemRows, issue.gemstoneIssuedPcs, issue.gemstoneIssuedWeight)

  const issuedTotals = {
    issuedPcs: diamondIssued.pcs,
    issuedWeight: diamondIssued.weight,
    gemstoneIssuedPcs: gemIssued.pcs,
    gemstoneIssuedWeight: gemIssued.weight,
  }
  // Shown live under the Returned fields; the same check blocks saving.
  const errors = editMode ? consumptionErrors({ ...draft, ...issuedTotals }) : {}

  const handleSubmit = async () => {
    const firstError = Object.values(consumptionErrors({ ...draft, ...issuedTotals }))[0]
    if (firstError) {
      alert(firstError)
      return { error: firstError }
    }
    const res = await save('Submit', {
      status: 'Completed',
      assignedPerson: user?.name || draft.assignedPerson,
      startDate: draft.startDate || todayISO(),
      completionDate: todayISO(),
    })
    if (res?.ok) {
      const stamp = { orderId: order.id, orderNumber: order.orderNumber, stage: 'consumption', user }
      const log = (material, type, qty, weight, remarks) => {
        if (n(qty) || n(weight)) logMaterialTransaction({ ...stamp, material, type, qty: n(qty), weight: n(weight), remarks })
      }
      log('diamond', 'Consumed', draft.usedPcs, draft.usedWeight, draft.consumptionRemarks)
      log('diamond', 'Returned', draft.returnedPcs, draft.returnedWeight)
      log('diamond', 'Broken/Lost', draft.brokenLostPcs, draft.brokenLostWeight)
      log('gemstone', 'Consumed', draft.gemstoneUsedPcs, draft.gemstoneUsedWeight, draft.gemstoneConsumptionRemarks)
      log('gemstone', 'Returned', draft.gemstoneReturnedPcs, draft.gemstoneReturnedWeight)
      log('gemstone', 'Broken/Lost', draft.gemstoneBrokenLostPcs, draft.gemstoneBrokenLostWeight)
    } else if (res?.error) alert(res.error)
    return res
  }

  const numberField = (label, key, props = {}) => (
    <Field label={label} error={props.error} hint={props.hint}>
      <TextInput type="number" min={0} step={props.step} max={props.max} value={draft[key] || ''} onChange={(e) => setField(key, e.target.value)} disabled={disabled} />
    </Field>
  )

  return (
    <StageFrame ctx={ctx} stageKey="consumption" onCancel={onCancel} onSubmit={handleSubmit} hideRemarks>
      <div className="space-y-5">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Diamond Consumption</h4>
          <IssuedSummary itemLabel="Diamond" rows={diamondRows} totals={diamondIssued} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {numberField('Used Pcs', 'usedPcs')}
            {numberField('Used Weight (CT)', 'usedWeight', { step: '0.01' })}
            {numberField('Returned PCS', 'returnedPcs', { max: diamondIssued.pcs, error: errors.returnedPcs, hint: editMode ? `Max ${diamondIssued.pcs} (issued)` : undefined })}
            {numberField('Returned Weight (CT)', 'returnedWeight', {
              step: '0.01',
              max: diamondIssued.weight,
              error: errors.returnedWeight,
              hint: editMode ? `Max ${diamondIssued.weight} ct (issued)` : undefined,
            })}
            {numberField('Broken / Lost PCS', 'brokenLostPcs')}
            {numberField('Broken / Lost Weight (CT)', 'brokenLostWeight', { step: '0.01' })}
            <FileUpload label="After Setting Image" value={draft.afterSettingImage || []} onChange={(v) => setField('afterSettingImage', v)} disabled={disabled} multiple={false} />
          </div>
          <Field label="Remarks" className="mt-3">
            <TextArea rows={2} value={draft.consumptionRemarks || ''} onChange={(e) => setField('consumptionRemarks', e.target.value)} disabled={disabled} />
          </Field>
        </div>

        <div className="border-t border-hos-ink-100 pt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Gem Stone Consumption</h4>
          <IssuedSummary itemLabel="Gem Stone" rows={gemRows} totals={gemIssued} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {numberField('Used Pcs', 'gemstoneUsedPcs')}
            {numberField('Used Weight (CT)', 'gemstoneUsedWeight', { step: '0.01' })}
            {numberField('Returned PCS', 'gemstoneReturnedPcs', {
              max: gemIssued.pcs,
              error: errors.gemstoneReturnedPcs,
              hint: editMode ? `Max ${gemIssued.pcs} (issued)` : undefined,
            })}
            {numberField('Returned Weight (CT)', 'gemstoneReturnedWeight', {
              step: '0.01',
              max: gemIssued.weight,
              error: errors.gemstoneReturnedWeight,
              hint: editMode ? `Max ${gemIssued.weight} ct (issued)` : undefined,
            })}
            {numberField('Broken / Lost PCS', 'gemstoneBrokenLostPcs')}
            {numberField('Broken / Lost Weight (CT)', 'gemstoneBrokenLostWeight', { step: '0.01' })}
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
