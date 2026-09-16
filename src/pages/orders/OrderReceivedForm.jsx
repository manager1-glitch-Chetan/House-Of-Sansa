import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Gem, Plus, Trash2 } from 'lucide-react'
import { Orders, Customers, Employees, Products, Masters } from '@/lib/db'
import { useAuth } from '@/context/AuthContext'
import { Field, TextInput, Select, TextArea } from '@/components/common/Field'
import FileUpload from '@/components/common/FileUpload'
import PageHeader from '@/components/common/PageHeader'
import { todayISO, uid } from '@/lib/utils'
import { METAL_MASTER_KEYS } from '@/lib/constants'

function blankDiamondRow() {
  return { id: uid('dp'), shape: '', size: '', quality: '', colour: '', pcs: '', weight: '' }
}

function blankOrderLine() {
  return {
    id: uid('ol'),
    productName: '',
    productCode: '',
    quantity: 1,
    size: '',
    metalType: '',
    goldPurity: '',
    goldColour: '',
    goldWeight: '',
    diamondPcs: '',
    diamondWeight: '',
    diamondParticulars: [],
    referenceImage: [],
    goldRemarks: '',
    diamondRemarks: '',
    collapsed: false,
  }
}

function lineSummary(line) {
  const bits = [line.productName || 'Untitled design', `${line.quantity || 0} pcs`]
  if (line.metalType) bits.push([line.metalType, line.goldPurity].filter(Boolean).join(' '))
  return bits.join(' — ')
}

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
    targetDeliveryDate: '',
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
  const toggleLineCollapsed = (lineId) => updateLine(lineId, (l) => ({ collapsed: !l.collapsed }))

  const onMetalTypeChange = (lineId, value) => updateLine(lineId, { metalType: value, goldPurity: '', goldColour: '' })

  const onProductChange = (lineId, name) => {
    const p = products.find((x) => x.name === name)
    updateLine(lineId, { productName: name, productCode: p ? p.code : '' })
  }

  const addDiamondRow = (lineId) => updateLine(lineId, (l) => ({ diamondParticulars: [...l.diamondParticulars, blankDiamondRow()] }))
  const updateDiamondRow = (lineId, rowId, key, value) =>
    updateLine(lineId, (l) => ({ diamondParticulars: l.diamondParticulars.map((r) => (r.id === rowId ? { ...r, [key]: value } : r)) }))
  const removeDiamondRow = (lineId, rowId) => updateLine(lineId, (l) => ({ diamondParticulars: l.diamondParticulars.filter((r) => r.id !== rowId) }))

  const validate = () => {
    const e = { lines: {} }
    if (!shared.customerName.trim()) e.customerName = 'Customer is required.'
    if (!shared.targetDeliveryDate) e.targetDeliveryDate = 'Target date is required.'
    orderLines.forEach((line) => {
      const le = {}
      if (!line.productName.trim()) le.productName = 'Design / Item is required.'
      if (!line.quantity || Number(line.quantity) <= 0) le.quantity = 'Pcs must be at least 1.'
      if (Object.keys(le).length) e.lines[line.id] = le
    })
    setErrors(e)
    return !e.customerName && !e.targetDeliveryDate && Object.keys(e.lines).length === 0
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
            particulars: line.diamondParticulars
              .filter((r) => r.shape || r.size || r.quality || r.colour || r.pcs || r.weight)
              .map((r) => ({
                shape: r.shape,
                size: r.size,
                quality: r.quality,
                colour: r.colour,
                pcs: Number(r.pcs) || 0,
                weight: Number(r.weight) || 0,
              })),
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
      <PageHeader title="New Order — Order Received" subtitle="Order Number is generated automatically on save. Add multiple designs for the same customer below." />

      <form onSubmit={submit} className="space-y-5">
        <section className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-hos-ink-100 bg-gradient-to-r from-hos-gold-50 to-white px-5 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-hos-gold-500 text-white">
              <Gem size={17} />
            </span>
            <h3 className="font-display text-base font-semibold text-hos-ink-800">Order Received Details</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Order Date" required>
              <TextInput type="date" value={shared.orderDate} onChange={(e) => setShared('orderDate', e.target.value)} />
            </Field>
            <Field label="Customer" required error={errors.customerName}>
              <input list="customer-list" className="input" value={shared.customerName} onChange={(e) => setShared('customerName', e.target.value)} placeholder="Type or select existing customer" />
              <datalist id="customer-list">
                {customers.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </Field>
            <Field label="Target Date" required error={errors.targetDeliveryDate}>
              <TextInput type="date" value={shared.targetDeliveryDate} onChange={(e) => setShared('targetDeliveryDate', e.target.value)} />
            </Field>
          </div>
        </section>

        {orderLines.map((line, idx) => (
          <section key={line.id} className="card overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-hos-ink-100 bg-gradient-to-r from-hos-gold-50 to-white px-5 py-4">
              <button type="button" onClick={() => toggleLineCollapsed(line.id)} className="flex flex-1 items-center gap-2 text-left">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hos-gold-500 text-white">
                  <Gem size={17} />
                </span>
                <span>
                  <span className="block font-display text-base font-semibold text-hos-ink-800">Order #{idx + 1}</span>
                  {line.collapsed && <span className="block text-xs text-hos-ink-500">{lineSummary(line)}</span>}
                </span>
                {line.collapsed ? <ChevronDown size={16} className="ml-auto text-hos-ink-400" /> : <ChevronUp size={16} className="ml-auto text-hos-ink-400" />}
              </button>
              {orderLines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  title="Remove this order"
                  className="shrink-0 rounded p-2 text-hos-ink-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            {!line.collapsed && (
              <>
                <div className="border-b border-hos-ink-100 px-5 py-4">
                  <FileUpload label="Reference Image" value={line.referenceImage} onChange={(v) => updateLine(line.id, { referenceImage: v })} />
                </div>

                <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Design / Item" required error={errors.lines[line.id]?.productName}>
                    <input
                      list={`product-list-${line.id}`}
                      className="input"
                      value={line.productName}
                      onChange={(e) => onProductChange(line.id, e.target.value)}
                      placeholder="Type or select"
                    />
                    <datalist id={`product-list-${line.id}`}>
                      {products.map((p) => (
                        <option key={p.id} value={p.name} />
                      ))}
                    </datalist>
                  </Field>
                  <Field label="Product Code">
                    <TextInput value={line.productCode} onChange={(e) => updateLine(line.id, { productCode: e.target.value })} />
                  </Field>
                  <Field label="Pcs" required error={errors.lines[line.id]?.quantity}>
                    <TextInput type="number" min={1} value={line.quantity} onChange={(e) => updateLine(line.id, { quantity: e.target.value })} />
                  </Field>
                  <Field label="Size">
                    <TextInput value={line.size} onChange={(e) => updateLine(line.id, { size: e.target.value })} placeholder="e.g. 14, US 7, 2.5&quot;" />
                  </Field>
                  <Field label="Type">
                    <Select value={line.metalType} onChange={(e) => onMetalTypeChange(line.id, e.target.value)} options={(masters.metalType || []).map((m) => m.name)} placeholder="Select metal type…" />
                  </Field>
                  {line.metalType && (
                    <>
                      <Field label={`${line.metalType} Purity`}>
                        <Select
                          value={line.goldPurity}
                          onChange={(e) => updateLine(line.id, { goldPurity: e.target.value })}
                          options={(masters[METAL_MASTER_KEYS[line.metalType]?.purity] || []).map((m) => m.name)}
                        />
                      </Field>
                      <Field label={`${line.metalType} Colour`}>
                        <Select
                          value={line.goldColour}
                          onChange={(e) => updateLine(line.id, { goldColour: e.target.value })}
                          options={(masters[METAL_MASTER_KEYS[line.metalType]?.colour] || []).map((m) => m.name)}
                        />
                      </Field>
                      <Field label={`${line.metalType} Weight (g)`}>
                        <TextInput type="number" step="0.01" value={line.goldWeight} onChange={(e) => updateLine(line.id, { goldWeight: e.target.value })} />
                      </Field>
                    </>
                  )}
                  <Field label="Diamond Pcs">
                    <TextInput type="number" min={0} value={line.diamondPcs} onChange={(e) => updateLine(line.id, { diamondPcs: e.target.value })} />
                  </Field>
                  <Field label="Diamond Weight (ct)">
                    <TextInput type="number" step="0.01" value={line.diamondWeight} onChange={(e) => updateLine(line.id, { diamondWeight: e.target.value })} />
                  </Field>
                </div>

                <div className="border-t border-hos-ink-100 px-5 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Diamond Particulars</h4>
                    <button type="button" onClick={() => addDiamondRow(line.id)} className="btn-outline btn-sm inline-flex items-center gap-1">
                      <Plus size={13} /> Add Diamond
                    </button>
                  </div>
                  {line.diamondParticulars.length === 0 && (
                    <p className="text-sm text-hos-ink-400">No diamond particulars added yet. Use "Add Diamond" to record shape, size, quality, colour, pcs & weight for each diamond type in this order.</p>
                  )}
                  <div className="space-y-3">
                    {line.diamondParticulars.map((row) => (
                      <div key={row.id} className="grid grid-cols-2 gap-3 rounded-lg border border-hos-ink-100 p-3 sm:grid-cols-3 lg:grid-cols-6">
                        <Field label="Shape">
                          <Select value={row.shape} onChange={(e) => updateDiamondRow(line.id, row.id, 'shape', e.target.value)} options={(masters.diamondShape || []).map((m) => m.name)} />
                        </Field>
                        <Field label="Size">
                          <Select value={row.size} onChange={(e) => updateDiamondRow(line.id, row.id, 'size', e.target.value)} options={(masters.diamondSize || []).map((m) => m.name)} />
                        </Field>
                        <Field label="Quality">
                          <Select value={row.quality} onChange={(e) => updateDiamondRow(line.id, row.id, 'quality', e.target.value)} options={(masters.diamondQuality || []).map((m) => m.name)} />
                        </Field>
                        <Field label="Colour">
                          <Select value={row.colour} onChange={(e) => updateDiamondRow(line.id, row.id, 'colour', e.target.value)} options={(masters.diamondColour || []).map((m) => m.name)} />
                        </Field>
                        <Field label="Pcs">
                          <TextInput type="number" min={0} value={row.pcs} onChange={(e) => updateDiamondRow(line.id, row.id, 'pcs', e.target.value)} />
                        </Field>
                        <div className="flex items-end gap-1.5">
                          <Field label="Weight (ct)" className="flex-1">
                            <TextInput type="number" step="0.01" min={0} value={row.weight} onChange={(e) => updateDiamondRow(line.id, row.id, 'weight', e.target.value)} />
                          </Field>
                          <button
                            type="button"
                            onClick={() => removeDiamondRow(line.id, row.id)}
                            title="Remove"
                            className="mb-0.5 shrink-0 rounded p-2 text-hos-ink-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        ))}

        <button type="button" onClick={addLine} className="btn-outline inline-flex items-center gap-1.5">
          <Plus size={15} /> Add Another Order
        </button>

        {/* Secondary office-use fields — collapsed by default */}
        <section className="card">
          <button
            type="button"
            onClick={() => setShowMore((s) => !s)}
            className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm font-semibold text-hos-ink-700"
          >
            Additional Office Details (sales person, priority, instructions…)
            {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showMore && (
            <div className="border-t border-hos-ink-100 p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <Field label="Customer Contact">
                  <TextInput value={shared.customerContact} onChange={(e) => setShared('customerContact', e.target.value)} placeholder="+91 …" />
                </Field>
                <Field label="Sales Person">
                  <Select value={shared.salesPerson} onChange={(e) => setShared('salesPerson', e.target.value)} options={employees.map((e2) => e2.name)} />
                </Field>
                <Field label="Order Type">
                  <Select value={shared.orderType} onChange={(e) => setShared('orderType', e.target.value)} options={(masters.orderType || []).map((m) => m.name)} />
                </Field>
                <Field label="Priority">
                  <Select value={shared.priority} onChange={(e) => setShared('priority', e.target.value)} options={(masters.priority || []).map((m) => m.name)} />
                </Field>
                <Field label="Customer Reference Number">
                  <TextInput value={shared.customerRefNumber} onChange={(e) => setShared('customerRefNumber', e.target.value)} />
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Customer Requirement">
                  <TextArea rows={2} value={shared.customerRequirement} onChange={(e) => setShared('customerRequirement', e.target.value)} />
                </Field>
              </div>
            </div>
          )}
        </section>

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
