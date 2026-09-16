import { useState, createContext, useContext, useCallback } from 'react'
import Modal from './Modal'
import { AlertTriangle } from 'lucide-react'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null) // { message, title, resolve, requireReason }
  const [reason, setReason] = useState('')

  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      setReason('')
      setState({ ...opts, resolve })
    })
  }, [])

  const close = (result) => {
    state?.resolve(result)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(state?.requireReason ? null : false)}
        title={state?.title || 'Confirm Action'}
        size="sm"
        footer={
          <>
            <button className="btn-outline" onClick={() => close(state?.requireReason ? null : false)}>
              Cancel
            </button>
            <button
              className={state?.danger ? 'btn-danger' : 'btn-gold'}
              disabled={state?.requireReason && !reason.trim()}
              onClick={() => close(state?.requireReason ? reason.trim() : true)}
            >
              {state?.confirmLabel || 'Confirm'}
            </button>
          </>
        }
      >
        <div className="flex gap-3">
          {state?.danger && (
            <div className="mt-0.5 text-amber-500">
              <AlertTriangle size={20} />
            </div>
          )}
          <p className="text-sm text-hos-ink-600">{state?.message}</p>
        </div>
        {state?.requireReason && (
          <div className="mt-3">
            <label className="label">Reason / Remarks (required)</label>
            <textarea
              className="input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this change is being made after completion…"
              autoFocus
            />
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}
