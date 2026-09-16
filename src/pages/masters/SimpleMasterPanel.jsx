import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Masters } from '@/lib/db'
import Modal from '@/components/common/Modal'
import { Field, TextInput } from '@/components/common/Field'
import { useConfirm } from '@/components/common/ConfirmDialog'
import Badge from '@/components/common/Badge'

export default function SimpleMasterPanel({ type, label }) {
  const [items, setItems] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const confirm = useConfirm()

  const load = () => Masters.listType(type).then(setItems)
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  const openNew = () => {
    setEditing(null)
    setName('')
    setModalOpen(true)
  }
  const openEdit = (item) => {
    setEditing(item)
    setName(item.name)
    setModalOpen(true)
  }
  const save = async () => {
    if (!name.trim()) return
    if (editing) await Masters.update(type, editing.id, { name })
    else await Masters.create(type, { name })
    setModalOpen(false)
    load()
  }
  const toggleActive = async (item) => {
    await Masters.update(type, item.id, { active: !item.active })
    load()
  }
  const remove = async (item) => {
    const ok = await confirm({ title: `Delete ${label}`, message: `Remove "${item.name}" from ${label}? This cannot be undone.`, danger: true, confirmLabel: 'Delete' })
    if (ok) {
      await Masters.remove(type, item.id)
      load()
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-hos-ink-800">{label}</h3>
        <button className="btn-gold btn-sm" onClick={openNew}>
          <Plus size={13} /> Add
        </button>
      </div>
      <div className="card divide-y divide-hos-ink-100">
        {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-hos-ink-400">No {label.toLowerCase()} entries yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-hos-ink-800">{item.name}</span>
              <button onClick={() => toggleActive(item)}>
                <Badge tone={item.active ? 'success' : 'neutral'}>{item.active ? 'Active' : 'Inactive'}</Badge>
              </button>
            </div>
            <div className="flex gap-1">
              <button className="rounded p-1.5 text-hos-ink-400 hover:bg-hos-ink-100 hover:text-hos-ink-700" onClick={() => openEdit(item)}>
                <Pencil size={14} />
              </button>
              <button className="rounded p-1.5 text-hos-ink-400 hover:bg-red-50 hover:text-red-600" onClick={() => remove(item)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editing ? 'Edit' : 'Add'} ${label}`}
        size="sm"
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
        <Field label="Name" required>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
      </Modal>
    </div>
  )
}
