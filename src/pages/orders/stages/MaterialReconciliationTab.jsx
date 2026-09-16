import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { MaterialTransactions } from '@/lib/db'
import { num, formatDateTime } from '@/lib/utils'
import { GOLD_TOLERANCE_GRAMS, DIAMOND_TOLERANCE_PCS, GEMSTONE_TOLERANCE_PCS } from '@/lib/constants'

function Table({ title, rows, warn, warnLabel }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-hos-ink-500">{title}</h4>
        {warn && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <AlertTriangle size={12} /> {warnLabel}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {rows.map((r) => (
          <div key={r.label} className={`rounded-lg px-3 py-2.5 ${r.highlight ? (warn ? 'bg-amber-50 text-amber-800' : 'bg-hos-ink-50') : 'bg-hos-ink-50'}`}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-hos-ink-500">{r.label}</div>
            <div className="text-base font-bold text-hos-ink-900">{r.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MaterialReconciliationTab({ order }) {
  const [ledger, setLedger] = useState([])

  useEffect(() => {
    MaterialTransactions.list(order.id).then(setLedger)
  }, [order.id, order.updatedAt])

  const casting = order.stages.casting
  const packing = order.stages.packing
  const diamondSetting = order.stages.diamondSetting

  const goldEstimated = Number(order.gold?.estimatedWeight) || 0
  const goldActual = Number(casting.goldWeight) || 0
  const goldFinal = Number(packing.finalGoldWeight) || goldActual || 0
  const goldDifference = goldEstimated - goldFinal
  const goldWarn = Math.abs(goldDifference) > GOLD_TOLERANCE_GRAMS && goldFinal > 0

  const diamondPlanned = Number(order.diamond?.pcs) || 0
  const diamondIssued = Number(diamondSetting.issuedPcs) || 0
  const diamondUsed = Number(diamondSetting.usedPcs) || 0
  const diamondReturned = Number(diamondSetting.returnedPcs) || 0
  const diamondBrokenLost = Number(diamondSetting.brokenLostPcs) || 0
  const diamondDifference = diamondIssued - diamondUsed - diamondReturned - diamondBrokenLost
  const diamondWarn = Math.abs(diamondDifference) > DIAMOND_TOLERANCE_PCS && diamondIssued > 0

  const gemstoneIssued = Number(diamondSetting.gemstoneIssuedPcs) || 0
  const gemstoneUsed = Number(diamondSetting.gemstoneUsedPcs) || 0
  const gemstoneReturned = Number(diamondSetting.gemstoneReturnedPcs) || 0
  const gemstoneBrokenLost = Number(diamondSetting.gemstoneBrokenLostPcs) || 0
  const gemstoneDifference = gemstoneIssued - gemstoneUsed - gemstoneReturned - gemstoneBrokenLost
  const gemstoneWarn = Math.abs(gemstoneDifference) > GEMSTONE_TOLERANCE_PCS && gemstoneIssued > 0

  return (
    <div className="space-y-5">
      <Table
        title="Gold Reconciliation (g)"
        warn={goldWarn}
        warnLabel="Exceeds tolerance"
        rows={[
          { label: 'Estimated', value: num(goldEstimated) },
          { label: 'Actual (Casting)', value: num(goldActual) },
          { label: 'Final (Packing)', value: num(goldFinal) },
          { label: 'Difference', value: num(goldDifference), highlight: true },
        ]}
      />
      <Table
        title="Diamond Reconciliation (PCS)"
        warn={diamondWarn}
        warnLabel="Unaccounted diamonds"
        rows={[
          { label: 'Planned PCS', value: diamondPlanned },
          { label: 'Issued PCS', value: diamondIssued },
          { label: 'Used PCS', value: diamondUsed },
          { label: 'Returned PCS', value: diamondReturned },
          { label: 'Broken / Lost PCS', value: diamondBrokenLost },
          { label: 'Difference', value: diamondDifference, highlight: true },
        ]}
      />
      <Table
        title="Gem Stone Reconciliation (PCS)"
        warn={gemstoneWarn}
        warnLabel="Unaccounted gemstones"
        rows={[
          { label: 'Issued PCS', value: gemstoneIssued },
          { label: 'Used PCS', value: gemstoneUsed },
          { label: 'Returned PCS', value: gemstoneReturned },
          { label: 'Broken / Lost PCS', value: gemstoneBrokenLost },
          { label: 'Difference', value: gemstoneDifference, highlight: true },
        ]}
      />

      <div className="card p-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Material Transaction Ledger</h4>
        <div className="overflow-x-auto">
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
                  <td className="px-3 py-2">{t.stage}</td>
                  <td className="px-3 py-2">{t.qty ?? '—'}</td>
                  <td className="px-3 py-2">{t.weight ?? '—'}</td>
                  <td className="px-3 py-2">{t.user}</td>
                  <td className="px-3 py-2 text-hos-ink-500">{t.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
