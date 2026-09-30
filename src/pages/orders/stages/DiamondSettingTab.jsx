import { useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Field, TextInput, Select, TextArea } from '@/components/common/Field'
import FileUpload from '@/components/common/FileUpload'
import { todayISO } from '@/lib/utils'
import { logMaterialTransaction } from '@/lib/db'
import { blankDiamondRow, blankGemRow, diamondIssueRows, gemstoneIssueRows, hasIssueValue, issueTotals, describeIssue } from './issueRows'

const n = (v) => Number(v) || 0

// Placeholders shown until the first real row exists (identity-checked by
// the prefill below, so they're never saved as-is).
const EMPTY_DIAMOND = { ...blankDiamondRow(), id: 'di_empty' }
const EMPTY_GEM = { ...blankGemRow(), id: 'gi_empty' }

const DIAMOND_FIELDS = [
  { key: 'shape', label: 'Shape', master: 'diamondShape' },
  { key: 'size', label: 'Size', master: 'diamondSize' },
  { key: 'quality', label: 'Quality', master: 'diamondQuality' },
  { key: 'colour', label: 'Colour', master: 'diamondColour' },
]
const GEM_FIELDS = [
  { key: 'type', label: 'Type', master: 'gemstoneType' },
  { key: 'shape', label: 'Shape', master: 'gemstoneShape' },
  { key: 'size', label: 'Size', master: 'gemstoneSize' },
  { key: 'quality', label: 'Quality', master: 'gemstoneQuality' },
  { key: 'colour', label: 'Colour', master: 'gemstoneColour' },
]

// One multi-row issue section — used for both Diamond Issue and Gem Stone
// Issue so the two always look and behave the same.
function IssueSection({ title, itemLabel, addLabel, fields, masters, rows, onUpdate, onAdd, onRemove, remarks, onRemarks, note, disabled }) {
  const totals = issueTotals(rows)
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-hos-ink-500">{title}</h4>
        {!disabled && (
          <button type="button" onClick={onAdd} className="btn-outline btn-sm inline-flex items-center gap-1">
            <Plus size={13} /> {addLabel}
          </button>
        )}
      </div>
      {note && <p className="mb-3 text-xs text-hos-ink-400">{note}</p>}
      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={row.id} className="rounded-lg border border-hos-ink-100 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-hos-ink-600">
                {itemLabel} {idx + 1}
              </span>
              {!disabled && rows.length > 1 && (
                <button type="button" onClick={() => onRemove(row.id)} title={`Remove this ${itemLabel.toLowerCase()}`} className="shrink-0 rounded p-1.5 text-hos-ink-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {fields.map((f) => (
                <Field key={f.key} label={f.label}>
                  <Select value={row[f.key] || ''} onChange={(e) => onUpdate(row.id, f.key, e.target.value)} options={(masters[f.master] || []).map((m) => m.name)} disabled={disabled} />
                </Field>
              ))}
              <Field label="Issued PCs">
                <TextInput type="number" min={0} value={row.pcs || ''} onChange={(e) => onUpdate(row.id, 'pcs', e.target.value)} disabled={disabled} />
              </Field>
              <Field label="Issued Weight (CT)">
                <TextInput type="number" step="0.01" min={0} value={row.weight || ''} onChange={(e) => onUpdate(row.id, 'weight', e.target.value)} disabled={disabled} />
              </Field>
              <FileUpload label="Before Setting Image" value={row.beforeSettingImage || []} onChange={(v) => onUpdate(row.id, 'beforeSettingImage', v)} disabled={disabled} multiple={false} />
            </div>
          </div>
        ))}
      </div>
      {rows.length > 1 && (
        <p className="mt-2 text-sm text-hos-ink-600">
          Total issued: <span className="font-semibold text-hos-ink-900">{totals.pcs} pcs · {totals.weight} ct</span>
        </p>
      )}
      <Field label="Remarks" className="mt-3">
        <TextArea rows={2} value={remarks || ''} onChange={(e) => onRemarks(e.target.value)} disabled={disabled} />
      </Field>
    </div>
  )
}

/**
 * Additional Issue — only what is issued out for setting: diamonds and gem
 * stones, as many rows of each as needed. What actually got used / returned
 * / broken is recorded afterwards on the Consumption stage.
 */
export default function DiamondSettingTab({ order, masters, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'diamondSetting', onChanged)
  const { draft, setField, patchDraft, editMode, save, user } = ctx
  const disabled = !editMode

  const diamondsOf = (d) => {
    const rows = diamondIssueRows(d)
    return rows.length ? rows : [EMPTY_DIAMOND]
  }
  const gemsOf = (d) => {
    const rows = gemstoneIssueRows(d)
    return rows.length ? rows : [EMPTY_GEM]
  }
  const diamonds = diamondsOf(draft)
  const gems = gemsOf(draft)

  // Every row change goes through the latest draft (a Before Setting Image
  // upload finishes asynchronously) and moves the flat totals with the rows.
  const changeDiamonds = (fn) =>
    patchDraft((d) => {
      const rows = fn(diamondsOf(d))
      const totals = issueTotals(rows)
      return { diamondIssues: rows, issuedPcs: totals.pcs, issuedWeight: totals.weight }
    })
  const changeGems = (fn) =>
    patchDraft((d) => {
      const rows = fn(gemsOf(d))
      const totals = issueTotals(rows)
      return { gemstoneIssues: rows, gemstoneIssuedPcs: totals.pcs, gemstoneIssuedWeight: totals.weight }
    })

  const rowHandlers = (change, blank) => ({
    onUpdate: (rowId, key, value) => change((rows) => rows.map((r) => (r.id === rowId ? { ...r, [key]: value } : r))),
    onAdd: () => change((rows) => [...rows, blank()]),
    onRemove: (rowId) => change((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== rowId) : rows)),
  })

  // The Gem Stone stage (right after CAM/RPT) records what this design
  // needs — each requirement becomes a starting row for what gets issued.
  const gemRequirement = order.stages.gemStone?.particulars || []

  useEffect(() => {
    if (!editMode) return
    // First diamond row starts from what was planned on the New Order form.
    if (!draft.diamondIssues?.length) {
      changeDiamonds((rows) => (rows[0] === EMPTY_DIAMOND ? [blankDiamondRow({ pcs: order.diamond?.pcs || '', weight: order.diamond?.weight || '' })] : rows))
    }
    if (!draft.gemstoneIssues?.length && gemRequirement.length) {
      changeGems((rows) =>
        rows[0] === EMPTY_GEM
          ? gemRequirement.map((g) =>
              blankGemRow({ type: g.type || '', shape: g.shape || '', size: g.size || '', quality: g.quality || '', colour: g.colour || '', pcs: g.pcs || '', weight: g.weight || '' })
            )
          : rows
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode])

  const handleSubmit = async () => {
    const diamondRows = diamonds.filter(hasIssueValue)
    const gemRows = gems.filter(hasIssueValue)
    const diamondTotals = issueTotals(diamondRows)
    const gemTotals = issueTotals(gemRows)
    const res = await save('Submit', {
      status: 'Completed',
      assignedPerson: user?.name || draft.assignedPerson,
      startDate: draft.startDate || todayISO(),
      completionDate: todayISO(),
      diamondIssues: diamondRows,
      issuedPcs: diamondTotals.pcs,
      issuedWeight: diamondTotals.weight,
      gemstoneIssues: gemRows,
      gemstoneIssuedPcs: gemTotals.pcs,
      gemstoneIssuedWeight: gemTotals.weight,
    })
    if (res?.ok) {
      const stamp = { orderId: order.id, orderNumber: order.orderNumber, stage: 'diamondSetting', user }
      // One ledger line per row, so the ledger shows exactly what was issued.
      const logIssued = (material, rows, remarks) =>
        rows.forEach((row) => {
          if (n(row.pcs) || n(row.weight)) {
            logMaterialTransaction({ ...stamp, material, type: 'Issued', qty: n(row.pcs), weight: n(row.weight), remarks: [describeIssue(row), remarks].filter(Boolean).join(' — ') })
          }
        })
      logIssued('diamond', diamondRows, draft.issueRemarks)
      logIssued('gemstone', gemRows, draft.gemstoneIssueRemarks)
    } else if (res?.error) alert(res.error)
    return res
  }

  return (
    <StageFrame ctx={ctx} stageKey="diamondSetting" onCancel={onCancel} onSubmit={handleSubmit} hideRemarks>
      <div className="space-y-5">
        <IssueSection
          title="Diamond Issue"
          itemLabel="Diamond"
          addLabel="Add Diamond"
          fields={DIAMOND_FIELDS}
          masters={masters}
          rows={diamonds}
          {...rowHandlers(changeDiamonds, blankDiamondRow)}
          remarks={draft.issueRemarks}
          onRemarks={(v) => setField('issueRemarks', v)}
          disabled={disabled}
        />

        <div className="border-t border-hos-ink-100 pt-4">
          <IssueSection
            title="Gem Stone Issue"
            itemLabel="Gem Stone"
            addLabel="Add Gem Stone"
            fields={GEM_FIELDS}
            masters={masters}
            rows={gems}
            {...rowHandlers(changeGems, blankGemRow)}
            remarks={draft.gemstoneIssueRemarks}
            onRemarks={(v) => setField('gemstoneIssueRemarks', v)}
            note={
              gemRequirement.length > 0
                ? `Requirement from Gem Stone stage: ${gemRequirement.map((g) => `${g.type || 'Stone'} ${g.pcs || 0}pc/${g.weight || 0}ct`).join(', ')}`
                : undefined
            }
            disabled={disabled}
          />
        </div>
      </div>
    </StageFrame>
  )
}
