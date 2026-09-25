import { useState } from 'react'
import Modal from '@/components/common/Modal'
import { Field, TextInput, Select, TextArea } from '@/components/common/Field'
import FileUpload from '@/components/common/FileUpload'
import { useAuth } from '@/context/AuthContext'
import { Orders } from '@/lib/db'
import { METAL_MASTER_KEYS } from '@/lib/constants'

function blankForm() {
  return {
    customerName: '',
    customerContact: '',
    salesPerson: '',
    orderType: '',
    priority: 'Normal',
    customerRefNumber: '',
    customerRequirement: '',
    targetDeliveryDate: '',
    productName: '',
    productCode: '',
    quantity: 1,
    size: '',
    referenceImage: [],
    metalType: '',
    goldPurity: '',
    goldColour: '',
    goldWeight: '',
    diamondPcs: '',
    diamondWeight: '',
    diamondParticular: '',
  }
}

// A saved order is one flat record (gold/diamond nested) -- this just
// un-nests it back into the same flat field set the form edits.
function orderToForm(o) {
  return {
    customerName: o.customerName || '',
    customerContact: o.customerContact || '',
    salesPerson: o.salesPerson || '',
    orderType: o.orderType || '',
    priority: o.priority || 'Normal',
    customerRefNumber: o.customerRefNumber || '',
    customerRequirement: o.customerRequirement || '',
    targetDeliveryDate: o.targetDeliveryDate || '',
    productName: o.productName || '',
    productCode: o.productCode || '',
    quantity: o.quantity ?? 1,
    size: o.size || '',
    referenceImage: o.referenceImage || [],
    metalType: o.gold?.type || '',
    goldPurity: o.gold?.purity || '',
    goldColour: o.gold?.colour || '',
    goldWeight: o.gold?.estimatedWeight ?? '',
    diamondPcs: o.diamond?.pcs ?? '',
    diamondWeight: o.diamond?.weight ?? '',
    diamondParticular: o.diamond?.particular || '',
  }
}

/**
 * Edit an existing order's details — same fields as the New Order form,
 * pre-filled, per row's "Edit" action on the Orders list. Saves via
 * Orders.updateHeader, which only touches the header fields below; stage
 * progress/history is untouched.
 *
 * The parent remounts this component per order (`key={order?.id}`) so the
 * form re-initializes fresh for each order instead of needing an effect to
 * re-sync state when the `order` prop changes.
 */
export default function EditOrderModal({ order, masters, customers, employees, products, onClose }) {
  const { user } = useAuth()
  const [form, setForm] = useState(() => (order ? orderToForm(order) : blankForm()))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const update = (patch) => setForm((f) => ({ ...f, ...patch }))

  const onMetalTypeChange = (value) => update({ metalType: value, goldPurity: '', goldColour: '' })
  const onProductChange = (name) => {
    const p = products.find((x) => x.name === name)
    update({ productName: name, productCode: p ? p.code : form.productCode })
  }

  const save = async () => {
    const e = {}
    if (!form.customerName.trim()) e.customerName = 'Customer is required.'
    if (!form.productName.trim()) e.productName = 'Design / Item is required.'
    if (!form.quantity || Number(form.quantity) <= 0) e.quantity = 'Pcs must be at least 1.'
    if (!form.targetDeliveryDate) e.targetDeliveryDate = 'Expected delivery date is required.'
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }
    setSaving(true)
    try {
      const patch = {
        customerName: form.customerName,
        customerContact: form.customerContact,
        salesPerson: form.salesPerson,
        orderType: form.orderType,
        priority: form.priority,
        customerRefNumber: form.customerRefNumber,
        customerRequirement: form.customerRequirement,
        targetDeliveryDate: form.targetDeliveryDate,
        productName: form.productName,
        productCode: form.productCode,
        quantity: Number(form.quantity),
        size: form.size,
        referenceImage: form.referenceImage,
        gold: {
          type: form.metalType,
          purity: form.goldPurity,
          colour: form.goldColour,
          estimatedWeight: Number(form.goldWeight) || 0,
          remarks: order.gold?.remarks || '',
        },
        diamond: {
          pcs: Number(form.diamondPcs) || 0,
          weight: Number(form.diamondWeight) || 0,
          remarks: order.diamond?.remarks || '',
          particular: form.diamondParticular,
        },
      }
      await Orders.updateHeader(order.id, patch, user)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={!!order}
      onClose={onClose}
      title={order ? `Edit Order — ${order.orderNumber}` : 'Edit Order'}
      size="xl"
      footer={
        <>
          <button className="btn-outline" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-gold" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </>
      }
    >
      {order && (
        <div className="space-y-5">
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Customer &amp; Order</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Customer" required error={errors.customerName}>
                <input list="edit-customer-list" className="input" value={form.customerName} onChange={(e) => update({ customerName: e.target.value })} />
                <datalist id="edit-customer-list">
                  {customers.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </Field>
              <Field label="Customer Contact">
                <TextInput value={form.customerContact} onChange={(e) => update({ customerContact: e.target.value })} />
              </Field>
              <Field label="Sales Person">
                <Select value={form.salesPerson} onChange={(e) => update({ salesPerson: e.target.value })} options={employees.map((e2) => e2.name)} />
              </Field>
              <Field label="Order Type">
                <Select value={form.orderType} onChange={(e) => update({ orderType: e.target.value })} options={(masters.orderType || []).map((m) => m.name)} />
              </Field>
              <Field label="Priority">
                <Select value={form.priority} onChange={(e) => update({ priority: e.target.value })} options={(masters.priority || []).map((m) => m.name)} />
              </Field>
              <Field label="Expected Delivery Date" required error={errors.targetDeliveryDate}>
                <TextInput type="date" value={form.targetDeliveryDate} onChange={(e) => update({ targetDeliveryDate: e.target.value })} />
              </Field>
              <Field label="Customer Ref #">
                <TextInput value={form.customerRefNumber} onChange={(e) => update({ customerRefNumber: e.target.value })} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Customer Requirement">
                <TextArea rows={2} value={form.customerRequirement} onChange={(e) => update({ customerRequirement: e.target.value })} />
              </Field>
            </div>
          </div>

          <div className="border-t border-hos-ink-100 pt-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Design Details</h4>
            <div className="mb-4">
              <FileUpload label="Reference Image" value={form.referenceImage} onChange={(v) => update({ referenceImage: v })} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Design / Item" required error={errors.productName} className="sm:col-span-2">
                <input list="edit-product-list" className="input" value={form.productName} onChange={(e) => onProductChange(e.target.value)} />
                <datalist id="edit-product-list">
                  {products.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </Field>
              <Field label="Product Code">
                <TextInput value={form.productCode} onChange={(e) => update({ productCode: e.target.value })} />
              </Field>
              <Field label="Pcs" required error={errors.quantity}>
                <TextInput type="number" min={1} value={form.quantity} onChange={(e) => update({ quantity: e.target.value })} />
              </Field>
              <Field label="Size">
                <TextInput value={form.size} onChange={(e) => update({ size: e.target.value })} />
              </Field>
            </div>
          </div>

          <div className="border-t border-hos-ink-100 pt-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Metal Details</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Type">
                <Select value={form.metalType} onChange={(e) => onMetalTypeChange(e.target.value)} options={(masters.metalType || []).map((m) => m.name)} placeholder="Select metal type…" />
              </Field>
              {form.metalType && (
                <>
                  <Field label={`${form.metalType} Purity`}>
                    <Select
                      value={form.goldPurity}
                      onChange={(e) => update({ goldPurity: e.target.value })}
                      options={(masters[METAL_MASTER_KEYS[form.metalType]?.purity] || []).map((m) => m.name)}
                    />
                  </Field>
                  <Field label={`${form.metalType} Colour`}>
                    <Select
                      value={form.goldColour}
                      onChange={(e) => update({ goldColour: e.target.value })}
                      options={(masters[METAL_MASTER_KEYS[form.metalType]?.colour] || []).map((m) => m.name)}
                    />
                  </Field>
                  <Field label={`${form.metalType} Weight (g)`}>
                    <TextInput type="number" step="0.01" value={form.goldWeight} onChange={(e) => update({ goldWeight: e.target.value })} />
                  </Field>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-hos-ink-100 pt-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Diamond Details</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Diamond Pcs">
                <TextInput type="number" min={0} value={form.diamondPcs} onChange={(e) => update({ diamondPcs: e.target.value })} />
              </Field>
              <Field label="Diamond Weight (ct)">
                <TextInput type="number" step="0.01" value={form.diamondWeight} onChange={(e) => update({ diamondWeight: e.target.value })} />
              </Field>
              <Field label="Diamond Particular" className="sm:col-span-2">
                <TextInput value={form.diamondParticular} onChange={(e) => update({ diamondParticular: e.target.value })} placeholder="e.g. Round, VVS1, G" />
              </Field>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
