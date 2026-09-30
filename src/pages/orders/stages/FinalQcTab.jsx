import { useEffect } from 'react'
import { Diamond, Gem, Package } from 'lucide-react'
import { useStageEditor } from './useStageEditor'
import StageFrame from './StageFrame'
import { Select } from '@/components/common/Field'
import FileUpload from '@/components/common/FileUpload'
import { finalQcDefaults, num, todayISO } from '@/lib/utils'

const CHECKLIST_ITEMS = ['Size Check', 'Diamond Setting Check', 'Prong Check', 'Polishing', 'Finishing', 'Rhodium Check']
// Every item is marked Pass or Fail — there is no "NA". Items start blank
// so nothing passes without someone actually checking it.
const RESULTS = ['Pass', 'Fail']
const isChecked = (row) => RESULTS.includes(row.result)

const n = (v) => Number(v) || 0
const recorded = (v) => v !== '' && v != null
// "11 pcs · 1 ct" — whichever parts were actually filled in; '' if neither.
const pcsWeight = (pcs, weight, unit) =>
  [recorded(pcs) && `${n(pcs)} pc${n(pcs) === 1 ? '' : 's'}`, n(weight) > 0 && `${num(weight)} ${unit}`].filter(Boolean).join(' · ')

// Final figures, grouped the way QC checks them: the piece, its diamonds,
// its gem stones. Each card ends with a Reference list — what was filled in
// for this order at each earlier step — so the final figure can be checked
// against it.
const FINAL_GROUPS = [
  {
    title: 'Final Piece',
    icon: Package,
    fields: [
      { key: 'finalPcs', label: 'Pcs', unit: 'pcs' },
      { key: 'finalGoldWeight', label: 'Gold Weight', unit: 'g', step: '0.01' },
    ],
    references: (o) => {
      const c = o.stages?.casting || {}
      const good = recorded(c.castedPcs) ? Math.max(0, n(c.castedPcs) - n(c.rejectedPcs)) : ''
      return [
        ['Order', pcsWeight(o.quantity, o.gold?.estimatedWeight, 'g est.')],
        ['Casting', pcsWeight(good, c.goldWeight, 'g')],
      ]
    },
  },
  {
    title: 'Final Diamond',
    icon: Diamond,
    fields: [
      { key: 'finalDiamondPcs', label: 'Pcs', unit: 'pcs' },
      { key: 'finalDiamondWeight', label: 'Weight', unit: 'ct', step: '0.01' },
    ],
    references: (o) => {
      const issue = o.stages?.diamondSetting || {}
      const cons = o.stages?.consumption || {}
      return [
        ['Order', n(o.diamond?.pcs) || n(o.diamond?.weight) ? pcsWeight(o.diamond?.pcs, o.diamond?.weight, 'ct') : ''],
        ['Issued', n(issue.issuedPcs) || n(issue.issuedWeight) ? pcsWeight(issue.issuedPcs, issue.issuedWeight, 'ct') : ''],
        ['Used', pcsWeight(cons.usedPcs, cons.usedWeight, 'ct')],
      ]
    },
  },
  {
    title: 'Final Gem Stone',
    icon: Gem,
    fields: [
      { key: 'finalGemstonePcs', label: 'Pcs', unit: 'pcs' },
      { key: 'finalGemstoneWeight', label: 'Weight', unit: 'ct', step: '0.01' },
    ],
    references: (o) => {
      const req = o.stages?.gemStone?.particulars || []
      const issue = o.stages?.diamondSetting || {}
      const cons = o.stages?.consumption || {}
      return [
        ['Required', req.length ? pcsWeight(req.reduce((sum, p) => sum + n(p.pcs), 0), req.reduce((sum, p) => sum + n(p.weight), 0), 'ct') : ''],
        ['Issued', n(issue.gemstoneIssuedPcs) || n(issue.gemstoneIssuedWeight) ? pcsWeight(issue.gemstoneIssuedPcs, issue.gemstoneIssuedWeight, 'ct') : ''],
        ['Used', pcsWeight(cons.gemstoneUsedPcs, cons.gemstoneUsedWeight, 'ct')],
      ]
    },
  },
]
const FINAL_KEYS = FINAL_GROUPS.flatMap((g) => g.fields.map((f) => f.key))
const isBlank = (v) => v === '' || v == null

// Where the autofilled figure came from — or "Edited" once QC changes it.
function SourceChip({ source, edited }) {
  if (edited) return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">Edited</span>
  if (!source) return null
  return <span className="rounded-full bg-hos-gold-50 px-2 py-0.5 text-[10px] font-semibold text-hos-gold-700 ring-1 ring-hos-gold-200">{source}</span>
}

// Number input with its unit shown inside, on the right (spinners hidden).
function UnitInput({ unit, ...props }) {
  return (
    <div className="relative">
      <input
        type="number"
        min={0}
        className="input pr-12 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        {...props}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-hos-ink-400">{unit}</span>
    </div>
  )
}

export default function FinalQcTab({ order, onChanged, onCancel }) {
  const ctx = useStageEditor(order, 'finalQc', onChanged)
  const { draft, setField, editMode, save, user } = ctx
  const disabled = !editMode
  // Latest real figures from earlier stages (Consumption used, Casting
  // weight, …) — the starting values, each with where it came from.
  const defaults = finalQcDefaults(order)

  useEffect(() => {
    const hasRows = draft.checklist?.length > 0
    const rows = hasRows ? draft.checklist : CHECKLIST_ITEMS.map((item) => ({ item, result: '', remarks: '' }))
    // Older checklists may hold "NA"; an open form asks for Pass / Fail there.
    const hadNA = editMode && rows.some((r) => r.result === 'NA')
    if (!hasRows || hadNA) setField('checklist', hadNA ? rows.map((r) => (r.result === 'NA' ? { ...r, result: '' } : r)) : rows)
    if (!editMode) return
    // Only empty fields are filled — anything QC already entered stays.
    FINAL_KEYS.forEach((key) => {
      if (isBlank(draft[key]) && !isBlank(defaults[key].value)) setField(key, defaults[key].value)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode])

  const setChecklistRow = (item, key, value) => {
    setField(
      'checklist',
      (draft.checklist || []).map((r) => (r.item === item ? { ...r, [key]: value } : r))
    )
  }

  const failCount = (draft.checklist || []).filter((r) => r.result === 'Fail').length
  const uncheckedCount = editMode ? (draft.checklist || []).filter((r) => !isChecked(r)).length : 0

  const handleSubmit = async () => {
    if ((draft.checklist || []).some((r) => !isChecked(r))) {
      const error = 'Please mark every checklist item as Pass or Fail before submitting.'
      alert(error)
      return { error }
    }
    const res = await save('Submit', {
      status: 'Approved',
      assignedPerson: user?.name || draft.assignedPerson,
      startDate: draft.startDate || todayISO(),
      completionDate: todayISO(),
    })
    if (res?.error) alert(res.error)
    return res
  }

  return (
    <StageFrame ctx={ctx} stageKey="finalQc" onCancel={onCancel} onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {FINAL_GROUPS.map((group) => {
          const references = group.references(order).filter(([, value]) => value)
          return (
            <div key={group.title} className="flex flex-col overflow-hidden rounded-xl border border-hos-ink-200/70 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-hos-ink-100 bg-gradient-to-r from-hos-gold-50 to-white px-4 py-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-hos-gold-500 text-white">
                  <group.icon size={14} />
                </span>
                <h4 className="font-display text-sm font-semibold text-hos-ink-800">{group.title}</h4>
              </div>
              <div className="flex-1 space-y-3 p-4">
                {group.fields.map((f) => {
                  const value = draft[f.key] ?? ''
                  const source = defaults[f.key].source
                  // Chips only while editing: the source while the field still
                  // holds the autofilled figure, "Edited" once QC changes it.
                  const edited = editMode && !!source && String(value) !== String(defaults[f.key].value)
                  return (
                    <div key={f.key}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <label className="label mb-0" htmlFor={`fqc-${f.key}`}>
                          {f.label}
                        </label>
                        {editMode && <SourceChip source={source} edited={edited} />}
                      </div>
                      <UnitInput id={`fqc-${f.key}`} unit={f.unit} step={f.step} value={value} onChange={(e) => setField(f.key, e.target.value)} disabled={disabled} />
                    </div>
                  )
                })}
              </div>
              {references.length > 0 && (
                <div className="border-t border-hos-ink-100 bg-hos-ink-50/60 px-4 py-2.5">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-hos-ink-400">Reference</div>
                  <dl className="space-y-0.5 text-xs">
                    {references.map(([label, value]) => (
                      <div key={label} className="flex items-baseline justify-between gap-3">
                        <dt className="text-hos-ink-500">{label}</dt>
                        <dd className="font-medium tabular-nums text-hos-ink-800">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Final Jewellery Checklist</h4>
          <span className="flex gap-3 text-xs font-semibold">
            {uncheckedCount > 0 && <span className="text-amber-700">{uncheckedCount} item(s) not checked yet</span>}
            {failCount > 0 && <span className="text-red-600">{failCount} item(s) failed</span>}
          </span>
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
                    <Select value={row.result} onChange={(e) => setChecklistRow(row.item, 'result', e.target.value)} options={row.result === 'NA' ? [...RESULTS, 'NA'] : RESULTS} disabled={disabled} />
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
