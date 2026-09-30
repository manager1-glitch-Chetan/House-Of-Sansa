import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Orders, Customers, Employees, Products, Masters } from '@/lib/db'
import { useAuth } from '@/context/AuthContext'
import Modal from '@/components/common/Modal'
import { useConfirm } from '@/components/common/ConfirmDialog'
import { todayISO } from '@/lib/utils'
import CommonDetailsCard from './orderForm/CommonDetailsCard'
import DesignLineCard from './orderForm/DesignLineCard'
import { blankOrderLine, duplicateOrderLine } from './orderForm/model'

const FORM_ID = 'new-order-form'

function blankShared() {
  return {
    orderDate: todayISO(),
    customerName: '',
    customerContact: '',
    salesPerson: '',
    orderType: '',
    priority: 'Normal',
    customerRefNumber: '',
    customerRequirement: '',
  }
}

/**
 * New Order entry, opened from the Orders page's "+ New Order" button. One
 * customer section plus any number of design lines; each line is saved as
 * its own order.
 *
 * The parent mounts this only while it's open, so every open starts from a
 * blank form without any reset logic here.
 */
export default function NewOrderModal({ onClose, onSaved }) {
  const { user } = useAuth()
  const confirm = useConfirm()
  const [masters, setMasters] = useState({})
  const [customers, setCustomers] = useState([])
  const [employees, setEmployees] = useState([])
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({ lines: {} })
  const [showMore, setShowMore] = useState(false)
  const [touched, setTouched] = useState(false)
  const formRef = useRef(null)
  const confirmingRef = useRef(false)

  const [shared, setSharedState] = useState(blankShared)
  const [orderLines, setOrderLines] = useState(() => [blankOrderLine()])

  useEffect(() => {
    Masters.listAll().then(setMasters)
    Customers.list().then(setCustomers)
    Employees.list().then(setEmployees)
    Products.list().then(setProducts)
  }, [])

  const setShared = (key, value) => {
    setTouched(true)
    setSharedState((f) => ({ ...f, [key]: value }))
  }

  const updateLine = (lineId, patch) => {
    setTouched(true)
    setOrderLines((lines) => lines.map((l) => (l.id === lineId ? { ...l, ...(typeof patch === 'function' ? patch(l) : patch) } : l)))
  }

  const addLine = () => {
    setTouched(true)
    setOrderLines((lines) => [...lines, blankOrderLine()])
  }
  const removeLine = (lineId) => {
    setTouched(true)
    setOrderLines((lines) => (lines.length > 1 ? lines.filter((l) => l.id !== lineId) : lines))
  }
  const duplicateLine = (lineId) => {
    setTouched(true)
    setOrderLines((lines) => {
      const idx = lines.findIndex((l) => l.id === lineId)
      if (idx === -1) return lines
      const copy = duplicateOrderLine(lines[idx])
      return [...lines.slice(0, idx + 1), copy, ...lines.slice(idx + 1)]
    })
  }
  // Collapsing is just view state — it doesn't count as an unsaved change.
  const toggleLineCollapsed = (lineId) =>
    setOrderLines((lines) => lines.map((l) => (l.id === lineId ? { ...l, collapsed: !l.collapsed } : l)))

  const onMetalTypeChange = (lineId, value) => updateLine(lineId, { metalType: value, goldPurity: '', goldColour: '' })

  const onProductChange = (lineId, name) => {
    const p = products.find((x) => x.name === name)
    updateLine(lineId, { productName: name, productCode: p ? p.code : '' })
  }

  const validate = () => {
    const e = { lines: {} }
    if (!shared.customerName.trim()) e.customerName = 'Customer is required.'
    orderLines.forEach((line) => {
      const le = {}
      if (!line.productName.trim()) le.productName = 'Design / Item is required.'
      if (!line.quantity || Number(line.quantity) <= 0) le.quantity = 'Pcs must be at least 1.'
      if (!line.targetDeliveryDate) le.targetDeliveryDate = 'Expected delivery date is required.'
      if (Object.keys(le).length) e.lines[line.id] = le
    })
    setErrors(e)
    return e
  }

  // A collapsed design hides its error messages, and the first error may be
  // scrolled out of view inside the popup — open those designs and bring the
  // first error on screen.
  const revealErrors = (e) => {
    setOrderLines((lines) => lines.map((l) => (e.lines[l.id] && l.collapsed ? { ...l, collapsed: false } : l)))
    requestAnimationFrame(() => formRef.current?.querySelector('.text-red-600')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const submit = async (e) => {
    e.preventDefault()
    const found = validate()
    if (found.customerName || Object.keys(found.lines).length) {
      revealErrors(found)
      return
    }
    setSaving(true)
    try {
      const created = []
      for (const line of orderLines) {
        const payload = {
          ...shared,
          salesPerson: shared.salesPerson || user?.name || '',
          productName: line.productName,
          productCode: line.productCode,
          quantity: Number(line.quantity),
          size: line.size,
          targetDeliveryDate: line.targetDeliveryDate,
          referenceImage: line.referenceImage,
          goldRemarks: line.goldRemarks,
          diamondRemarks: line.diamondRemarks,
          gold: {
            type: line.metalType,
            purity: line.goldPurity,
            colour: line.goldColour,
            estimatedWeight: Number(line.goldWeight) || 0,
            remarks: line.goldRemarks,
          },
          diamond: {
            pcs: Number(line.diamondPcs) || 0,
            weight: Number(line.diamondWeight) || 0,
            remarks: line.diamondRemarks,
            particular: line.diamondParticular,
          },
        }
        // Sequential, not parallel — keeps order numbers assigned in the
        // order the user entered the designs.
        created.push(await Orders.create(payload, user))
      }
      onSaved?.(created)
    } finally {
      setSaving(false)
    }
  }

  // Cancel, ✕ and Esc all land here. Esc also reaches the confirm dialog's
  // own listener, so ignore repeat requests while it's showing.
  const requestClose = async () => {
    if (saving || confirmingRef.current) return
    if (touched) {
      confirmingRef.current = true
      const ok = await confirm({
        title: 'Discard this order?',
        message: 'The details you have entered will be lost.',
        danger: true,
        confirmLabel: 'Discard',
      })
      confirmingRef.current = false
      if (!ok) return
    }
    onClose()
  }

  return (
    <Modal
      open
      onClose={requestClose}
      title="New Order"
      size="xl"
      bodyClassName="bg-hos-ink-50/60"
      footer={
        <>
          <button type="button" className="btn-outline" onClick={requestClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form={FORM_ID} className="btn-gold" disabled={saving}>
            {saving ? 'Saving…' : orderLines.length > 1 ? `Save ${orderLines.length} Orders` : 'Save Order'}
          </button>
        </>
      }
    >
      <p className="mb-4 text-sm text-hos-ink-500">
        Order Number is generated automatically on save. Add multiple designs for the same customer — duplicate a design to speed up similar entries.
      </p>

      <form id={FORM_ID} ref={formRef} onSubmit={submit} className="space-y-4">
        <CommonDetailsCard
          shared={shared}
          setShared={setShared}
          customers={customers}
          employees={employees}
          masters={masters}
          errors={errors}
          showMore={showMore}
          setShowMore={setShowMore}
        />

        {orderLines.map((line, idx) => (
          <DesignLineCard
            key={line.id}
            line={line}
            index={idx}
            total={orderLines.length}
            errors={errors.lines[line.id]}
            masters={masters}
            products={products}
            onUpdate={(patch) => updateLine(line.id, patch)}
            onRemove={() => removeLine(line.id)}
            onDuplicate={() => duplicateLine(line.id)}
            onToggleCollapsed={() => toggleLineCollapsed(line.id)}
            onProductChange={(name) => onProductChange(line.id, name)}
            onMetalTypeChange={(value) => onMetalTypeChange(line.id, value)}
          />
        ))}

        <button type="button" onClick={addLine} className="btn-outline inline-flex items-center gap-1.5 bg-white">
          <Plus size={15} /> Add Another Design
        </button>
      </form>
    </Modal>
  )
}
