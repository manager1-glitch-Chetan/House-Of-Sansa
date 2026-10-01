import { useState } from 'react'
import { RotateCcw, CheckCircle2 } from 'lucide-react'
import { Orders, resetOrders } from '@/lib/db'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/components/common/ConfirmDialog'

/**
 * Testing aid: clears every order (with its notifications, stage history and
 * material ledger) while keeping all master data — see resetOrders() in db.js.
 */
export default function ResetOrdersPanel() {
  const { user } = useAuth()
  const confirm = useConfirm()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const reset = async () => {
    setMessage('')
    const count = (await Orders.list()).length
    if (count === 0) {
      setMessage('There are no orders to clear.')
      return
    }
    const ok = await confirm({
      title: 'Reset All Orders',
      message: `Delete all ${count} orders, along with their notifications, stage history and material ledger? Masters, customers, employees, products, users and role permissions are kept. This cannot be undone.`,
      danger: true,
      confirmLabel: 'Reset Orders',
    })
    if (!ok) return
    setBusy(true)
    try {
      const cleared = await resetOrders(user)
      setMessage(`${cleared} orders cleared. New orders will be numbered from HOS-${new Date().getFullYear()}-1001 again.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-red-200 bg-red-50/40 p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div>
        <h3 className="font-display text-base font-semibold text-red-700">Reset All Orders</h3>
        <p className="mt-1 text-sm text-hos-ink-600">
          Clears every order with its notifications, stage history and material ledger, so the workflow can be tested from scratch. Masters,
          customers, employees, products, users and role permissions are not touched.
        </p>
        {message && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            <CheckCircle2 size={15} className="shrink-0" /> {message}
          </p>
        )}
      </div>
      <button className="btn-danger mt-3 shrink-0 sm:mt-0" onClick={reset} disabled={busy}>
        <RotateCcw size={14} /> {busy ? 'Resetting…' : 'Reset All Orders'}
      </button>
    </div>
  )
}
