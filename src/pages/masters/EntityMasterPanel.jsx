import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import Modal from '@/components/common/Modal'
import DataTable from '@/components/common/DataTable'
import { Field, TextInput, Select } from '@/components/common/Field'
import { useConfirm } from '@/components/common/ConfirmDialog'

/**
 * Generic CRUD panel for a richer entity (Customer / Employee / Product).
 * api: { list, create, update, remove } from lib/db.js
 * fields: [{ key, label, type: 'text'|'select', options?, required? }]
 */
export default function EntityMasterPanel({ title, api, fields }) {
  const [items, setItems] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const confirm = useConfirm()

  const load = () => api.list().then(setItems)
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openNew = () => {
    setEditing(null)
    setForm(Object.fromEntries(fields.map((f) => [f.key, ''])))
    setModalOpen(true)
  }
  const openEdit = (item) => {
    setEditing(item)
    setForm(item)
    setModalOpen(true)
  }
  const save = async () => {
    if (editing) await api.update(editing.id, form)
    else await api.create(form)
    setModalOpen(false)
    load()
  }
  const remove = async (item) => {
    const ok = await confirm({ title: `Delete ${title}`, message: `Remove "${item.name}"? This cannot be undone.`, danger: true, confirmLabel: 'Delete' })
    if (ok) {
      await api.remove(item.id)
      load()
    }
  }

  const columns = [
    ...fields.map((f) => ({ key: f.key, label: f.label })),
    {
      key: '__actions',
      label: '',
      sortable: false,
      render: (row) => (
        <div className="flex gap-1">
          <button className="rounded p-1.5 text-hos-ink-400 hover:bg-hos-ink-100 hover:text-hos-ink-700" onClick={() => openEdit(row)}>
            <Pencil size={14} />
          </button>
          <button className="rounded p-1.5 text-hos-ink-400 hover:bg-red-50 hover:text-red-600" onClick={() => remove(row)}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-hos-ink-800">{title}</h3>
        <button className="btn-gold btn-sm" onClick={openNew}>
          <Plus size={13} /> Add {title}
        </button>
      </div>
      <DataTable columns={columns} rows={items} exportTitle={title} emptyLabel={`No ${title.toLowerCase()} records yet.`} />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editing ? 'Edit' : 'Add'} ${title}`}
        footer={
          <>
            <button className="btn-outline" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-gold" onClick={save}>
              Save
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <Field key={f.key} label={f.label} required={f.required}>
              {f.type === 'select' ? (
                <Select value={form[f.key] || ''} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} options={f.options} />
              ) : (
                <TextInput value={form[f.key] || ''} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />
              )}
            </Field>
          ))}
        </div>
      </Modal>
    </div>
  )
}
