import { ChevronRight, History } from 'lucide-react'
import { StatusBadge } from '@/components/common/Badge'
import { STAGE_KEYS, stageIndex, stageLabel } from '@/lib/constants'
import { formatDate, num } from '@/lib/utils'
import { summarizeStage, isEmptySummary, stageMeta } from './stageSummary'

const hideMarker = 'list-none [&::-webkit-details-marker]:hidden'

// Status badge + who + when, for a stage card header. Also used by the
// Material Reconciliation page's stage-by-stage details.
export function MetaLine({ meta }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-hos-ink-500">
      <StatusBadge status={meta.record.status || 'Pending'} />
      {meta.person && <span className="font-medium text-hos-ink-700">{meta.person}</span>}
      {meta.when && <span>{formatDate(meta.when)}</span>}
    </span>
  )
}

function Thumbs({ files }) {
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((f) => (
        <a
          key={f.id || f.name}
          href={f.dataUrl}
          download={f.name}
          title={f.name}
          className="block h-12 w-12 overflow-hidden rounded-md border border-hos-ink-200 bg-white hover:border-hos-gold-400"
        >
          {f.type?.startsWith('image/') ? (
            <img src={f.dataUrl} alt={f.name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] leading-tight text-hos-ink-500">{f.name}</span>
          )}
        </a>
      ))}
    </div>
  )
}

const Label = ({ children }) => <div className="text-[11px] font-semibold uppercase tracking-wide text-hos-ink-400">{children}</div>

// Read-only body of a stage recap (grid / lists / photos / remarks). Also
// used by the Material Reconciliation page's stage-by-stage details.
export function SummaryBody({ summary, done }) {
  if (isEmptySummary(summary)) {
    return <p className="text-sm text-hos-ink-400">{done ? 'No details were recorded for this stage.' : 'Not completed yet.'}</p>
  }
  return (
    <div className="space-y-3">
      {summary.items.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          {summary.items.map((it) => (
            <div key={it.label} className="min-w-0">
              <Label>{it.label}</Label>
              <div className="break-words text-sm font-medium text-hos-ink-800">{it.value}</div>
            </div>
          ))}
        </div>
      )}

      {summary.lists.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {summary.lists.map((list) => (
            <div key={list.title} className="rounded-lg border border-hos-ink-100 bg-white px-3 py-2">
              <Label>{list.title}</Label>
              <ul className="mt-1 divide-y divide-hos-ink-50 text-sm">
                {list.rows.map((row, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 py-1">
                    <span className="min-w-0 text-hos-ink-700">{row.text}</span>
                    <span className="shrink-0 tabular-nums text-hos-ink-900">
                      {row.pcs} pcs · {num(row.weight)} ct
                    </span>
                  </li>
                ))}
              </ul>
              {list.total && (
                <div className="mt-1 flex justify-between border-t border-hos-ink-100 pt-1.5 text-sm font-semibold text-hos-ink-900">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {list.total.pcs} pcs · {num(list.total.weight)} ct
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {summary.images.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {summary.images.map((img) => (
            <div key={img.label}>
              <Label>{img.label}</Label>
              <div className="mt-1">
                <Thumbs files={img.files} />
              </div>
            </div>
          ))}
        </div>
      )}

      {summary.remarks && (
        <p className="text-sm text-hos-ink-600">
          <span className="font-semibold text-hos-ink-700">Remarks:</span> {summary.remarks}
        </p>
      )}
    </div>
  )
}

/**
 * Top-of-form recap for a stage: what the stage right before it recorded,
 * with every earlier stage one click away. Read-only — nothing here can
 * change another stage's data.
 */
export default function PreviousStagePanel({ order, stageKey }) {
  const idx = stageIndex(stageKey)
  if (idx <= 0) return null
  const prevKey = STAGE_KEYS[idx - 1]
  const prev = stageMeta(order, prevKey)
  const earlierKeys = STAGE_KEYS.slice(0, idx - 1)

  return (
    <section className="overflow-hidden rounded-xl border border-hos-gold-200 bg-hos-gold-50/40">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-hos-gold-100 px-4 py-2.5">
        <span className="flex items-center gap-2">
          <History size={15} className="text-hos-gold-600" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-hos-gold-700">Previous stage</span>
          <span className="font-display text-base font-semibold text-hos-ink-900">{stageLabel(prevKey)}</span>
        </span>
        <span className="sm:ml-auto">
          <MetaLine meta={prev} />
        </span>
      </div>
      <div className="px-4 py-3">
        <SummaryBody summary={summarizeStage(prevKey, prev.record, order)} done={prev.done} />
      </div>

      {earlierKeys.length > 0 && (
        <details className="group border-t border-hos-gold-100">
          <summary className={`flex cursor-pointer items-center gap-1.5 px-4 py-2 text-xs font-semibold text-hos-ink-600 hover:text-hos-ink-900 ${hideMarker}`}>
            <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
            Earlier stages ({earlierKeys.length})
          </summary>
          <div className="divide-y divide-hos-ink-100 border-t border-hos-gold-100 bg-white">
            {earlierKeys.map((key) => {
              const meta = stageMeta(order, key)
              return (
                <details key={key} className="group/stage">
                  <summary className={`flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 hover:bg-hos-ink-50 ${hideMarker}`}>
                    <span className="flex items-center gap-1.5">
                      <ChevronRight size={13} className="text-hos-ink-400 transition-transform group-open/stage:rotate-90" />
                      <span className="text-sm font-medium text-hos-ink-800">{stageLabel(key)}</span>
                    </span>
                    <span className="sm:ml-auto">
                      <MetaLine meta={meta} />
                    </span>
                  </summary>
                  <div className="px-4 pb-3 pl-9">
                    <SummaryBody summary={summarizeStage(key, meta.record, order)} done={meta.done} />
                  </div>
                </details>
              )
            })}
          </div>
        </details>
      )}
    </section>
  )
}
