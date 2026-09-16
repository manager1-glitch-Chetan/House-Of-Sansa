import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import HistoryTable from '@/components/common/HistoryTable'
import { STAGES, stageForRoute } from '@/lib/constants'

import OverviewTab from './stages/OverviewTab'
import MaterialReconciliationTab from './stages/MaterialReconciliationTab'
import { STAGE_COMPONENTS } from './stageComponents'

// The sequential "flow" — the same order as STAGES, walked one page at a
// time via Previous / Next. Utility pages (reconciliation, history) sit
// outside this sequence and are reached from their own links instead.
const FLOW = STAGES.map((s) => s.route)

export default function OrderStagePage() {
  const { id, stage } = useParams()
  const navigate = useNavigate()
  const { hasStage } = useAuth()
  const { order, employees, masters, refresh } = useOutletContext()

  const goTo = (route) => navigate(`/orders/${id}/${route}`)

  if (stage === 'reconciliation') {
    return (
      <div>
        <MaterialReconciliationTab order={order} />
        <BackToFlow order={order} onClick={goTo} />
      </div>
    )
  }
  if (stage === 'history') {
    return (
      <div>
        <HistoryTable entries={order.history} showStage />
        <BackToFlow order={order} onClick={goTo} />
      </div>
    )
  }

  const flowIndex = FLOW.indexOf(stage)
  const prevRoute = flowIndex > 0 ? FLOW[flowIndex - 1] : null
  const nextRoute = flowIndex >= 0 && flowIndex < FLOW.length - 1 ? FLOW[flowIndex + 1] : null
  const prevLabel = prevRoute ? STAGES.find((s) => s.route === prevRoute)?.label : null
  const nextLabel = nextRoute ? STAGES.find((s) => s.route === nextRoute)?.label : null

  const stageKey = stageForRoute(stage)
  const content =
    stage === 'overview' ? (
      <OverviewTab order={order} />
    ) : STAGE_COMPONENTS[stageKey] ? (
      hasStage(stageKey) || hasStage('*') ? (
        (() => {
          const StageComponent = STAGE_COMPONENTS[stageKey]
          return <StageComponent order={order} employees={employees} masters={masters} onChanged={refresh} onCancel={() => navigate(`/stage/${stage}`)} />
        })()
      ) : (
        <div className="py-10 text-center text-sm text-hos-ink-400">
          You don't have permission to edit this stage. Read-only history is available under "Full History".
        </div>
      )
    ) : (
      <div className="py-10 text-center text-sm text-hos-ink-400">Unknown stage.</div>
    )

  return (
    <div>
      {content}

      <div className="mt-6 flex items-center justify-between border-t border-hos-ink-100 pt-4">
        <button
          disabled={!prevRoute}
          onClick={() => prevRoute && goTo(prevRoute)}
          className="btn-outline disabled:invisible"
        >
          <ChevronLeft size={15} /> {prevLabel}
        </button>
        <span className="text-xs font-medium text-hos-ink-400">
          Step {flowIndex + 1} of {FLOW.length}
        </span>
        <button
          disabled={!nextRoute}
          onClick={() => nextRoute && goTo(nextRoute)}
          className="btn-gold disabled:invisible"
        >
          {nextLabel} <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

function BackToFlow({ order, onClick }) {
  const currentRoute = STAGES.find((s) => s.key === order.currentStage)?.route || 'overview'
  return (
    <div className="mt-6 border-t border-hos-ink-100 pt-4">
      <button className="btn-outline" onClick={() => onClick(currentRoute)}>
        <ChevronLeft size={15} /> Back to Current Stage
      </button>
    </div>
  )
}
