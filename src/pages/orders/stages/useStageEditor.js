import { useEffect, useState, useCallback } from 'react'
import { Orders } from '@/lib/db'
import { useAuth } from '@/context/AuthContext'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { STAGE_KEYS, stageIndex, stageLabel } from '@/lib/constants'
import { todayISO } from '@/lib/utils'

import { TERMINAL_STATUSES as TERMINAL } from '@/lib/constants'

/**
 * Shared editing engine for every stage tab. Keeps a local draft of the
 * stage record, figures out whether the previous stage gates this one,
 * and enforces the "no silent edit after completion" business rule by
 * requiring a reason (captured via ConfirmDialog) before re-opening a
 * completed stage for correction.
 */
export function useStageEditor(order, stageKey, onChanged) {
  const { user, canOverride } = useAuth()
  const confirm = useConfirm()
  const record = order.stages[stageKey]
  const [draft, setDraft] = useState(() => ({ ...record }))
  const [editMode, setEditMode] = useState(!TERMINAL.includes(record.status))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft({ ...order.stages[stageKey] })
    setEditMode(!TERMINAL.includes(order.stages[stageKey].status))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.updatedAt, stageKey])

  const idx = stageIndex(stageKey)
  const prevKey = idx > 0 ? STAGE_KEYS[idx - 1] : null
  const prevDone = !prevKey || TERMINAL.includes(order.stages[prevKey].status)
  const locked = !prevDone

  const isTerminal = TERMINAL.includes(record.status)

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }))

  const requestEdit = async () => {
    const reason = await confirm({
      title: 'Correction after completion',
      message: `"${stageLabel(stageKey)}" is already completed. Editing it now will create an audit entry. Please provide a reason.`,
      requireReason: true,
      confirmLabel: 'Unlock for Correction',
    })
    if (reason) {
      setEditMode(true)
      setDraft((d) => ({ ...d, _correctionReason: reason }))
    }
  }

  const save = useCallback(
    async (action, patch = {}) => {
      setSaving(true)
      try {
        let override = false
        if (locked) {
          if (!canOverride) {
            return { error: `Cannot update — previous stage is not completed yet.` }
          }
          const ok = await confirm({
            title: 'Admin Override — Skip Sequence',
            message: `The previous stage has not been completed. As ${user.role === 'admin' ? 'Admin' : 'Management'}, you can override this and proceed anyway. This will be recorded in the audit log.`,
            danger: true,
            confirmLabel: 'Override & Proceed',
          })
          if (!ok) return { cancelled: true }
          override = true
        }

        const merged = { ...draft, ...patch }
        if (merged._correctionReason) {
          merged.remarks = merged.remarks ? `${merged.remarks} [Correction: ${merged._correctionReason}]` : `[Correction: ${merged._correctionReason}]`
          delete merged._correctionReason
        }
        if (!merged.startDate && merged.status && merged.status !== 'Pending') merged.startDate = merged.startDate || todayISO()

        const result = await Orders.updateStage(order.id, stageKey, merged, {
          user,
          action,
          remarks: merged.remarks,
          override,
        })
        if (result?.error) return { error: result.error }
        onChanged?.(result)
        if (TERMINAL.includes(merged.status)) setEditMode(false)
        return { ok: true, order: result }
      } finally {
        setSaving(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, locked, canOverride, order.id, stageKey, user]
  )

  return {
    record,
    draft,
    setField,
    editMode,
    requestEdit,
    locked,
    prevKey,
    isTerminal,
    saving,
    save,
    user,
    canOverride,
  }
}

export { TERMINAL }
