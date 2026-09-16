import { useState } from 'react'
import PageHeader from '@/components/common/PageHeader'
import { cx } from '@/lib/utils'
import { MASTER_TYPES } from '@/lib/constants'
import { ROLES } from '@/lib/constants'
import { Customers, Employees, Products } from '@/lib/db'
import SimpleMasterPanel from './SimpleMasterPanel'
import EntityMasterPanel from './EntityMasterPanel'

const GROUPS = [
  {
    label: 'Business Entities',
    items: [
      { key: 'customer', label: 'Customer' },
      { key: 'employee', label: 'Employee' },
      { key: 'product', label: 'Product / Article' },
    ],
  },
  {
    label: 'Dropdown Masters',
    items: MASTER_TYPES.map((m) => ({ key: m.key, label: m.label })),
  },
]

export default function MastersPage() {
  const [active, setActive] = useState('customer')

  return (
    <div>
      <PageHeader title="Masters" subtitle="Manage all dropdown lists and business entities used across the workflow." />
      <div className="flex flex-col gap-5 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          {GROUPS.map((g) => (
            <div key={g.label} className="mb-4">
              <div className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-hos-ink-400">{g.label}</div>
              <div className="flex flex-wrap gap-1.5 lg:flex-col lg:flex-nowrap lg:gap-0 lg:space-y-0.5">
                {g.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActive(item.key)}
                    className={cx(
                      'rounded-full px-3 py-1.5 text-xs font-medium transition-colors lg:block lg:w-full lg:rounded-lg lg:px-3 lg:py-2 lg:text-left lg:text-sm',
                      active === item.key
                        ? 'bg-hos-gold-500 text-white'
                        : 'bg-hos-ink-100 text-hos-ink-600 hover:bg-hos-ink-200 lg:bg-transparent lg:hover:bg-hos-ink-100'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <div className="min-w-0 flex-1">
          {active === 'customer' && (
            <EntityMasterPanel
              title="Customer"
              api={Customers}
              fields={[
                { key: 'name', label: 'Customer Name', required: true },
                { key: 'contact', label: 'Contact' },
                { key: 'email', label: 'Email' },
                { key: 'address', label: 'Address' },
              ]}
            />
          )}
          {active === 'employee' && (
            <EntityMasterPanel
              title="Employee"
              api={Employees}
              fields={[
                { key: 'name', label: 'Employee Name', required: true },
                { key: 'role', label: 'Role', type: 'select', options: ROLES.map((r) => r.key) },
                { key: 'department', label: 'Department' },
                { key: 'contact', label: 'Contact' },
              ]}
            />
          )}
          {active === 'product' && (
            <EntityMasterPanel
              title="Product"
              api={Products}
              fields={[
                { key: 'name', label: 'Product / Article Name', required: true },
                { key: 'code', label: 'Product Code', required: true },
                { key: 'category', label: 'Category' },
              ]}
            />
          )}
          {MASTER_TYPES.map(
            (m) => active === m.key && <SimpleMasterPanel key={m.key} type={m.key} label={m.label} />
          )}
        </div>
      </div>
    </div>
  )
}
