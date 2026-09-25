import { Lock, Pencil } from 'lucide-react'
import { Field, TextArea } from '@/components/common/Field'
import FileUpload from '@/components/common/FileUpload'
import HistoryTable from '@/components/common/HistoryTable'
import { StatusBadge, DelayBadge } from '@/components/common/Badge'
import { stageDelayFor, DELAY_STATE_META, formatDate, todayISO } from '@/lib/utils'
import { stageLabel } from '@/lib/constants'

/**
 * Common shell every stage form is built on. Per the simplified workflow:
 * the person, start date, and target/completion dates are no longer manual
 * inputs — the person is auto-filled from whoever is logged in, and the
 * dates are recorded automatically the moment the stage is submitted. The
 * operator only ever sees two actions: Cancel, or Submit (which completes
 * the stage and hands it to the next one).
 */
export default function StageFrame({ ctx, stageKey, children, submitStatus = 'Completed', onCancel, onSubmit, hideRemarks = false, hideAttachments = false }) {
  const { order, draft, setField, editMode, requestEdit, locked, isTerminal, saving, save, canOverride, record, user } = ctx

  const delayInfo = stageDelayFor(order, stageKey)

  const disabled = !editMode || saving

  // Most stages just need the generic "set status, stamp person/dates" save.
  // A few (Casting, Diamond Setting) also need to log a material ledger
  // entry alongside — those pass their own `onSubmit` that does both, and
  // must return the same { ok } / { error } shape `save()` returns so the
  // button below knows whether to close the form.
  const defaultSubmit = async () => {
    const res = await save('Submit', {
      status: submitStatus,
      assignedPerson: user?.name || draft.assignedPerson,
      startDate: draft.startDate || todayISO(),
      completionDate: todayISO(),
    })
    if (res?.error) alert(res.error)
    return res
  }
  const handleSubmit = onSubmit || defaultSubmit

  // Submitting successfully closes the form immediately instead of leaving
  // it sitting there for the operator to dismiss by hand.
  const onSubmitClick = async () => {
    const res = await handleSubmit()
    if (res && !res.error && !res.cancelled) onCancel?.()
  }

  // "In Progress" just logs where things stand right now — it saves whatever
  // is filled in so far to Stage History, but (being a non-terminal status)
  // never advances the order. Only Submit moves it to the next stage.
  const handleInProgress = async () => {
    const res = await save('In Progress', {
      status: 'In Progress',
      assignedPerson: user?.name || draft.assignedPerson,
      startDate: draft.startDate || todayISO(),
    })
    if (res?.error) alert(res.error)
  }

  return (
    <div className="space-y-5">
      {locked && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          <Lock size={16} />
          Previous stage is not completed yet. {canOverride ? 'You can override this as Admin/Management when you submit below.' : 'Ask an Admin/Management user to override if this needs to start early.'}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={record.status} />
        <DelayBadge state={delayInfo.state} days={delayInfo.delayDays} label={DELAY_STATE_META[delayInfo.state]?.label} />
        <span className="text-xs text-hos-ink-400">
          Assigned to <span className="font-semibold text-hos-ink-600">{record.assignedPerson || user?.name}</span>
        </span>
        <span className="text-xs text-hos-ink-400">
          Order Date <span className="font-semibold text-hos-ink-600">{formatDate(order?.orderDate)}</span>
          {' · '}Expected Delivery <span className="font-semibold text-hos-ink-600">{formatDate(order?.targetDeliveryDate)}</span>
        </span>
        {isTerminal && !editMode && (
          <button className="btn-outline btn-sm ml-auto" onClick={requestEdit}>
            <Pencil size={13} /> Edit (Correction)
          </button>
        )}
      </div>

      {children}

      {(!hideRemarks || !hideAttachments) && (
        <div className={!hideRemarks && !hideAttachments ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : ''}>
          {!hideRemarks && (
            <Field label="Remarks">
              <TextArea value={draft.remarks || ''} onChange={(e) => setField('remarks', e.target.value)} disabled={disabled} />
            </Field>
          )}
          {!hideAttachments && <FileUpload label="Attachments" value={draft.attachments || []} onChange={(v) => setField('attachments', v)} disabled={disabled} />}
        </div>
      )}

      {editMode && (
        <div className="flex flex-wrap gap-2 border-t border-hos-ink-100 pt-4">
          <button className="btn-outline" disabled={saving} onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-secondary" disabled={saving} onClick={handleInProgress}>
            In Progress
          </button>
          <button className="btn-gold" disabled={saving} onClick={onSubmitClick}>
            Submit
          </button>
        </div>
      )}

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Stage History — {stageLabel(stageKey)}</h4>
        <div className="card">
          <HistoryTable entries={record.history} />
        </div>
      </div>
    </div>
  )
}
