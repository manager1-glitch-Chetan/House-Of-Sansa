import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { MaterialTransactions } from '@/lib/db'
import { num, formatDateTime } from '@/lib/utils'
import { STAGES, GOLD_TOLERANCE_GRAMS, DIAMOND_TOLERANCE_PCS, GEMSTONE_TOLERANCE_PCS, stageLabel } from '@/lib/constants'
import SectionHeading from '@/components/common/SectionHeading'
import { SummaryBody, MetaLine } from './PreviousStagePanel'
import { summarizeStage, stageMeta } from './stageSummary'
import { diamondIssueRows, gemstoneIssueRows, hasIssueValue, describeIssue } from './issueRows'

// ---------------------------------------------------------------------------
// Everything recorded for one order, in one place:
//   1. Material flow — gold, diamonds, gem stones, stage by stage, with the
//      balance / difference and tolerance warnings.
//   2. Stage-by-stage details — every stage's recorded data.
//   3. The material transaction ledger.
// ---------------------------------------------------------------------------

const n = (v) => Number(v) || 0
const recorded = (v) => v !== '' && v != null
// A value that was filled in (0 included), or null for "—".
const val = (v) => (recorded(v) ? n(v) : null)
// For figures where 0 means "not specified" (order estimates, weights).
const pos = (v) => (n(v) > 0 ? n(v) : null)
const round = (x) => Math.round(x * 1000) / 1000

const Cell = ({ value }) => (value == null ? <span className="text-hos-ink-300">—</span> : <span className="tabular-nums">{num(value)}</span>)

function WarnChip({ warn, label }) {
  return warn ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
      <AlertTriangle size={12} /> {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
      <CheckCircle2 size={12} /> OK
    </span>
  )
}

// One material, stage by stage. `columns` is ['Weight (g)'] for gold or
// ['Pcs', 'Weight (ct)'] for stones; each row carries matching `values`,
// plus optional `detail` lines (e.g. the individual issued stones).
function FlowCard({ title, columns, rows, summary }) {
  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-hos-ink-100 px-4 py-3">
        <h4 className="font-display text-sm font-semibold text-hos-ink-900">{title}</h4>
        {summary && <WarnChip warn={summary.warn} label={summary.warnLabel} />}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-hos-ink-50 text-left text-[11px] font-semibold uppercase tracking-wide text-hos-ink-500">
          <tr>
            <th className="px-4 py-2">Stage</th>
            {columns.map((c) => (
              <th key={c} className="px-4 py-2 text-right">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hos-ink-100">
          {rows.map((r) => (
            <tr key={r.label} className="align-top">
              <td className="px-4 py-2">
                <div className="text-hos-ink-800">{r.label}</div>
                {r.detail?.map((d) => (
                  <div key={d} className="text-xs text-hos-ink-400">
                    {d}
                  </div>
                ))}
              </td>
              {r.values.map((v, i) => (
                <td key={i} className="px-4 py-2 text-right text-hos-ink-900">
                  <Cell value={v} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {summary && (
        <div className={`mt-auto flex items-center justify-between gap-3 border-t px-4 py-2.5 text-sm font-semibold ${summary.warn ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-hos-ink-100 bg-hos-ink-50/60 text-hos-ink-800'}`}>
          <span>{summary.label}</span>
          <span className="tabular-nums">{summary.value}</span>
        </div>
      )}
    </div>
  )
}

const issuedLines = (rows) => rows.filter(hasIssueValue).map((r) => `${describeIssue(r) || '—'} — ${n(r.pcs)} pcs · ${num(r.weight)} ct`)

function materialFlow(order) {
  const st = order.stages || {}
  const cast = st.casting || {}
  const fill = st.filling || {}
  const rho = st.rhodium || {}
  const fq = st.finalQc || {}
  const pack = st.packing || {}
  const issue = st.diamondSetting || {}
  const cons = st.consumption || {}

  // Gold: latest weighed figure vs the order's estimate.
  const goldEstimate = pos(order.gold?.estimatedWeight)
  const goldLatest = [pack.finalGoldWeight, fq.finalGoldWeight, rho.weightAfter, fill.weightAfterFilling, cast.goldWeight].map(pos).find((v) => v != null) ?? null
  const goldDiff = goldEstimate != null && goldLatest != null ? round(goldLatest - goldEstimate) : null
  const gold = {
    rows: [
      { label: 'Order (estimate)', values: [goldEstimate] },
      { label: 'Casting', values: [pos(cast.goldWeight)] },
      { label: 'Filling (after)', values: [pos(fill.weightAfterFilling)] },
      { label: 'Rhodium (after)', values: [pos(rho.weightAfter)] },
      { label: 'Final QC', values: [pos(fq.finalGoldWeight)] },
      { label: 'Packing', values: [pos(pack.finalGoldWeight)] },
    ],
    summary:
      goldDiff == null
        ? null
        : {
            label: 'Difference (latest − estimate)',
            value: `${goldDiff > 0 ? '+' : ''}${num(goldDiff)} g`,
            warn: Math.abs(goldDiff) > GOLD_TOLERANCE_GRAMS,
            warnLabel: 'Exceeds tolerance',
          },
  }

  // Stones: issued at Additional Issue, accounted for at Consumption.
  const stoneSummary = (issuedPcs, issuedWt, parts, tolerance, warnLabel) => {
    if (issuedPcs == null && issuedWt == null) return null
    const pcs = n(issuedPcs) - parts.reduce((s, [p]) => s + n(p), 0)
    const wt = round(n(issuedWt) - parts.reduce((s, [, w]) => s + n(w), 0))
    return {
      label: 'Balance (issued − used − returned − broken)',
      value: `${pcs} pcs · ${num(wt)} ct`,
      warn: Math.abs(pcs) > tolerance && n(issuedPcs) > 0,
      warnLabel,
    }
  }

  const dIssuedRows = diamondIssueRows(issue)
  const dIssued = [val(issue.issuedPcs), val(issue.issuedWeight)]
  const dParts = [
    [cons.usedPcs, cons.usedWeight],
    [cons.returnedPcs, cons.returnedWeight],
    [cons.brokenLostPcs, cons.brokenLostWeight],
  ]
  const diamond = {
    rows: [
      { label: 'Order (planned)', values: [pos(order.diamond?.pcs), pos(order.diamond?.weight)] },
      { label: 'Issued', values: dIssued, detail: issuedLines(dIssuedRows) },
      { label: 'Used', values: [val(cons.usedPcs), val(cons.usedWeight)] },
      { label: 'Returned', values: [val(cons.returnedPcs), val(cons.returnedWeight)] },
      { label: 'Broken / Lost', values: [val(cons.brokenLostPcs), val(cons.brokenLostWeight)] },
      { label: 'Final QC', values: [val(fq.finalDiamondPcs), val(fq.finalDiamondWeight)] },
      { label: 'Packing', values: [null, val(pack.finalDiamondWeight)] },
    ],
    summary: stoneSummary(dIssued[0], dIssued[1], dParts, DIAMOND_TOLERANCE_PCS, 'Unaccounted diamonds'),
  }

  const req = st.gemStone?.particulars || []
  const gIssuedRows = gemstoneIssueRows(issue)
  const gIssued = [val(issue.gemstoneIssuedPcs), val(issue.gemstoneIssuedWeight)]
  const gParts = [
    [cons.gemstoneUsedPcs, cons.gemstoneUsedWeight],
    [cons.gemstoneReturnedPcs, cons.gemstoneReturnedWeight],
    [cons.gemstoneBrokenLostPcs, cons.gemstoneBrokenLostWeight],
  ]
  const gem = {
    rows: [
      {
        label: 'Required (Gem Stone stage)',
        values: req.length ? [req.reduce((s, p) => s + n(p.pcs), 0), round(req.reduce((s, p) => s + n(p.weight), 0))] : [null, null],
        detail: issuedLines(req),
      },
      { label: 'Issued', values: gIssued, detail: issuedLines(gIssuedRows) },
      { label: 'Used', values: [val(cons.gemstoneUsedPcs), val(cons.gemstoneUsedWeight)] },
      { label: 'Returned', values: [val(cons.gemstoneReturnedPcs), val(cons.gemstoneReturnedWeight)] },
      { label: 'Broken / Lost', values: [val(cons.gemstoneBrokenLostPcs), val(cons.gemstoneBrokenLostWeight)] },
      { label: 'Final QC', values: [val(fq.finalGemstonePcs), val(fq.finalGemstoneWeight)] },
    ],
    summary: stoneSummary(gIssued[0], gIssued[1], gParts, GEMSTONE_TOLERANCE_PCS, 'Unaccounted gem stones'),
  }

  return { gold, diamond, gem }
}

// Every real production step, Order Received → Delivery (the automatic
// "Complete" step has nothing of its own to show).
const DETAIL_STAGES = STAGES.filter((s) => s.key !== 'closed')

export default function MaterialReconciliationTab({ order }) {
  const [ledger, setLedger] = useState([])

  useEffect(() => {
    MaterialTransactions.list(order.id).then(setLedger)
  }, [order.id, order.updatedAt])

  const flow = materialFlow(order)

  return (
    <div className="space-y-8">
      <section>
        <SectionHeading>Material Flow</SectionHeading>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <FlowCard title="Gold" columns={['Weight (g)']} {...flow.gold} />
          <FlowCard title="Diamond" columns={['Pcs', 'Weight (ct)']} {...flow.diamond} />
          <FlowCard title="Gem Stone" columns={['Pcs', 'Weight (ct)']} {...flow.gem} />
        </div>
      </section>

      <section>
        <SectionHeading>Stage-by-stage Details</SectionHeading>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {DETAIL_STAGES.map((s, i) => {
            const meta = stageMeta(order, s.key)
            return (
              <div key={s.key} className="card overflow-hidden">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-hos-ink-100 bg-hos-ink-50/60 px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-hos-gold-100 text-[11px] font-bold text-hos-gold-700">{i + 1}</span>
                    <span className="font-display text-sm font-semibold text-hos-ink-900">{s.label}</span>
                  </span>
                  <span className="sm:ml-auto">
                    <MetaLine meta={meta} />
                  </span>
                </div>
                <div className="px-4 py-3">
                  <SummaryBody summary={summarizeStage(s.key, meta.record, order)} done={meta.done} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <SectionHeading>Material Transaction Ledger</SectionHeading>
        <div className="card overflow-x-auto p-4">
          <table className="w-full text-sm">
            <thead className="bg-hos-ink-50 text-left text-xs font-semibold uppercase text-hos-ink-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Material</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Stage</th>
                <th className="px-3 py-2">Qty (pcs)</th>
                <th className="px-3 py-2">Weight</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hos-ink-100">
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-hos-ink-400">
                    No material transactions recorded yet.
                  </td>
                </tr>
              )}
              {ledger.map((t) => (
                <tr key={t.id}>
                  <td className="whitespace-nowrap px-3 py-2 text-hos-ink-500">{formatDateTime(t.at)}</td>
                  <td className="px-3 py-2 capitalize">{t.material}</td>
                  <td className="px-3 py-2">{t.type}</td>
                  <td className="px-3 py-2">{t.stage ? stageLabel(t.stage) : '—'}</td>
                  <td className="px-3 py-2">{t.qty ?? '—'}</td>
                  <td className="px-3 py-2">{t.weight ?? '—'}</td>
                  <td className="px-3 py-2">{t.user}</td>
                  <td className="px-3 py-2 text-hos-ink-500">{t.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
