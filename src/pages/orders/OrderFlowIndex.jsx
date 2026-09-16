import { Navigate, useOutletContext } from 'react-router-dom'
import { routeForStage } from '@/lib/constants'

// Bare /orders/:id lands here and immediately forwards to whichever stage
// page the order is actually sitting at right now.
export default function OrderFlowIndex() {
  const { order } = useOutletContext()
  return <Navigate to={routeForStage(order.currentStage)} replace />
}
