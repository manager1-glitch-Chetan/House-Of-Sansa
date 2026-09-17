import { ChevronDown, ChevronUp, UserRound } from 'lucide-react'
import { Field, TextInput, Select, TextArea } from '@/components/common/Field'

// The "once per customer visit" section — every field here applies to every
// design line below it. Deliberately styled with a different icon
// (UserRound) than the Gem-headed design-line cards, so the common/per-design
// split reads at a glance rather than needing a legend.
export default function CommonDetailsCard({ shared, setShared, customers, employees, masters, errors, showMore, setShowMore }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-hos-ink-100 bg-gradient-to-r from-hos-gold-50 to-white px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-hos-ink-800 text-white">
          <UserRound size={15} />
        </span>
        <div>
          <h3 className="font-display text-base font-semibold text-hos-ink-800">Customer &amp; Order Details</h3>
          <p className="text-xs text-hos-ink-500">Applies to every design added below</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <Field label="Sales Person">
          <Select value={shared.salesPerson} onChange={(e) => setShared('salesPerson', e.target.value)} options={employees.map((e2) => e2.name)} />
        </Field>
        <Field label="Order Type">
          <Select value={shared.orderType} onChange={(e) => setShared('orderType', e.target.value)} options={(masters.orderType || []).map((m) => m.name)} />
        </Field>
        <Field label="Priority">
          <Select value={shared.priority} onChange={(e) => setShared('priority', e.target.value)} options={(masters.priority || []).map((m) => m.name)} />
        </Field>
      </div>

      <div className="border-t border-hos-ink-100">
        <button
          type="button"
          onClick={() => setShowMore((s) => !s)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-hos-ink-500 hover:text-hos-ink-700"
        >
          More details (contact, reference #, requirement)
          {showMore ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        {showMore && (
          <div className="border-t border-hos-ink-100 px-4 py-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Customer Contact">
                <TextInput value={shared.customerContact} onChange={(e) => setShared('customerContact', e.target.value)} placeholder="+91 …" />
              </Field>
              <Field label="Customer Ref #">
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
      </div>
    </section>
  )
}
