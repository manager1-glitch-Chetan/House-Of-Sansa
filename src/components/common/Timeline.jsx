import { Check, AlertTriangle, Clock, Ban } from 'lucide-react'
import { STAGES } from '@/lib/constants'
import { computeDelay } from '@/lib/utils'
import { cx } from '@/lib/utils'

import { TERMINAL_STATUSES as TERMINAL } from '@/lib/constants'

function iconFor(status, state) {
  if (TERMINAL.includes(status)) return <Check size={14} />
  if (status === 'Hold') return <Ban size={14} />
  if (state === 'delayed') return <AlertTriangle size={14} />
  return <Clock size={14} />
}

function colorFor(status, state, isCurrent) {
  if (TERMINAL.includes(status)) return 'bg-emerald-500 border-emerald-500 text-white'
  if (status === 'Hold') return 'bg-amber-400 border-amber-400 text-white'
  if (['Revision Required', 'Rework Required', 'QC Failed', 'Rejected'].includes(status)) return 'bg-red-500 border-red-500 text-white'
  if (state === 'delayed') return 'bg-red-500 border-red-500 text-white'
  if (isCurrent) return 'bg-hos-gold-500 border-hos-gold-500 text-white'
  return 'bg-white border-hos-ink-300 text-hos-ink-400'
}

export default function Timeline({ order, activeStage, onSelect }) {
  return (
    <div className="card overflow-x-auto p-5">
      <div className="flex min-w-max items-start gap-0">
        {STAGES.map((stage, i) => {
          const rec = order?.stages?.[stage.key] || {}
          const isCurrent = order?.currentStage === stage.key
          const terminal = TERMINAL.includes(rec.status)
          const delayInfo = computeDelay({ targetDate: rec.targetDate, completionDate: rec.completionDate, status: rec.status, isTerminal: terminal })
          return (
            <div key={stage.key} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {i > 0 && <div className={cx('h-0.5 flex-1', TERMINAL.includes(order?.stages?.[STAGES[i - 1].key]?.status) ? 'bg-emerald-400' : 'bg-hos-ink-200')} />}
                {i === 0 && <div className="h-0.5 flex-1 bg-transparent" />}
              </div>
              <button
                onClick={() => onSelect?.(stage.key)}
                className={cx(
                  'relative -mt-[1px] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-transform hover:scale-105',
                  colorFor(rec.status, delayInfo.state, isCurrent),
                  activeStage === stage.key && 'ring-4 ring-hos-gold-200'
                )}
                title={`${stage.label}: ${rec.status || 'Pending'}`}
              >
                {iconFor(rec.status, delayInfo.state)}
              </button>
              <div className="mt-2 w-24 text-center">
                <div className={cx('text-[11px] font-semibold leading-tight', isCurrent ? 'text-hos-gold-700' : 'text-hos-ink-600')}>{stage.label}</div>
                <div className="mt-0.5 text-[10px] text-hos-ink-400">{rec.status}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
