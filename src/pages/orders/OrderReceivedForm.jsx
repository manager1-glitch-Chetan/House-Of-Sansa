import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Orders, Customers, Employees, Products, Masters } from '@/lib/db'
import { useAuth } from '@/context/AuthContext'
import PageHeader from '@/components/common/PageHeader'
import { todayISO } from '@/lib/utils'
import CommonDetailsCard from './orderForm/CommonDetailsCard'
import DesignLineCard from './orderForm/DesignLineCard'
import { blankOrderLine, duplicateOrderLine } from './orderForm/model'

export default function OrderReceivedForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [masters, setMasters] = useState({})
  const [customers, setCustomers] = useState([])
  const [employees, setEmployees] = useState([])
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({ lines: {} })
  const [showMore, setShowMore] = useState(false)

  const [shared, setSharedState] = useState({
    orderDate: todayISO(),
    customerName: '',
    customerContact: '',
    salesPerson: '',
    orderType: '',
    priority: 'Normal',
    customerRefNumber: '',
    customerRequirement: '',
  })
  const [orderLines, setOrderLines] = useState([blankOrderLine()])

  useEffect(() => {
    Masters.listAll().then(setMasters)
    Customers.list().then(setCustomers)
    Employees.list().then(setEmployees)
    Products.list().then(setProducts)
  }, [])

  const setShared = (key, value) => setSharedState((f) => ({ ...f, [key]: value }))

  const updateLine = (lineId, patch) =>
    setOrderLines((lines) => lines.map((l) => (l.id === lineId ? { ...l, ...(typeof patch === 'function' ? patch(l) : patch) } : l)))

  const addLine = () => setOrderLines((lines) => [...lines, blankOrderLine()])
  const removeLine = (lineId) => setOrderLines((lines) => (lines.length > 1 ? lines.filter((l) => l.id !== lineId) : lines))
  const duplicateLine = (lineId) =>
    setOrderLines((lines) => {
      const idx = lines.findIndex((l) => l.id === lineId)
      if (idx === -1) return lines
      const copy = duplicateOrderLine(lines[idx])
      return [...lines.slice(0, idx + 1), copy, ...lines.slice(idx + 1)]
    })
  const toggleLineCollapsed = (lineId) => updateLine(lineId, (l) => ({ collapsed: !l.collapsed }))

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
    return !e.customerName && Object.keys(e.lines).length === 0
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
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
        await Orders.create(payload, user)
      }
      navigate('/orders')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <PageHeader
        title="New Order — Order Received"
        subtitle="Order Number is generated automatically on save. Add multiple designs for the same customer below — duplicate a design to speed up similar entries."
      />

      <form onSubmit={submit} className="space-y-4">
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

        <button type="button" onClick={addLine} className="btn-outline inline-flex items-center gap-1.5">
          <Plus size={15} /> Add Another Design
        </button>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-outline" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-gold">
            {saving ? 'Saving…' : orderLines.length > 1 ? `Save ${orderLines.length} Orders` : 'Save Order'}
          </button>
        </div>
      </form>
    </div>
  )
}
