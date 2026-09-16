import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, KeyRound, ShieldCheck } from 'lucide-react'
import { Users } from '@/lib/db'
import { ROLES, roleLabel } from '@/lib/constants'
import PageHeader from '@/components/common/PageHeader'
import DataTable from '@/components/common/DataTable'
import Modal from '@/components/common/Modal'
import { Field, TextInput, Select } from '@/components/common/Field'
import Badge, { StatusBadge } from '@/components/common/Badge'

const BLANK = { name: '', username: '', email: '', password: '', role: 'sales', department: '', active: true }

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [resetTarget, setResetTarget] = useState(null)
  const [newPassword, setNewPassword] = useState('')

  const load = () => Users.list().then(setUsers)
  useEffect(() => {
    load()
  }, [])

  const openNew = () => {
    setEditing(null)
    setForm(BLANK)
    setModalOpen(true)
  }
  const openEdit = (u) => {
    setEditing(u)
    setForm(u)
    setModalOpen(true)
  }
  const save = async () => {
    if (!form.name || !form.username || !form.role) return
    if (editing) await Users.update(editing.id, form)
    else await Users.create(form)
    setModalOpen(false)
    load()
  }
  const toggleActive = async (u) => {
    await Users.update(u.id, { active: !u.active })
    load()
  }
  const resetPassword = async () => {
    if (!newPassword.trim()) return
    await Users.update(resetTarget.id, { password: newPassword })
    setResetTarget(null)
    setNewPassword('')
  }

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'username', label: 'Username' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role', render: (r) => <Badge tone="gold">{roleLabel(r.role)}</Badge> },
    { key: 'department', label: 'Department' },
    {
      key: 'active',
      label: 'Status',
      render: (r) => (
        <button onClick={() => toggleActive(r)}>
          <StatusBadge status={r.active ? 'Approved' : 'Rejected'} className={r.active ? '' : ''} />
        </button>
      ),
    },
    {
      key: '__actions',
      label: '',
      sortable: false,
      render: (r) => (
        <div className="flex gap-1">
          <button className="rounded p-1.5 text-hos-ink-400 hover:bg-hos-ink-100 hover:text-hos-ink-700" onClick={() => openEdit(r)} title="Edit">
            <Pencil size={14} />
          </button>
          <button className="rounded p-1.5 text-hos-ink-400 hover:bg-hos-ink-100 hover:text-hos-ink-700" onClick={() => setResetTarget(r)} title="Reset Password">
            <KeyRound size={14} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Users & Roles"
        subtitle="Manage system users and their role-based access."
        actions={
          <>
            <Link to="/users/roles" className="btn-outline">
              <ShieldCheck size={15} /> Role Permissions
            </Link>
            <button className="btn-gold" onClick={openNew}>
              <Plus size={14} /> Add User
            </button>
          </>
        }
      />
      <DataTable columns={columns} rows={users} exportTitle="Users" searchPlaceholder="Search users…" />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit User' : 'Add User'}
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
          <Field label="Full Name" required>
            <TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Username" required>
            <TextInput value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} disabled={!!editing} />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </Field>
          {!editing && (
            <Field label="Password" required>
              <TextInput type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </Field>
          )}
          <Field label="Role" required>
            <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} options={ROLES.map((r) => ({ value: r.key, label: r.label }))} />
          </Field>
          <Field label="Department">
            <TextInput value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title={`Reset Password — ${resetTarget?.name}`}
        size="sm"
        footer={
          <>
            <button className="btn-outline" onClick={() => setResetTarget(null)}>
              Cancel
            </button>
            <button className="btn-gold" onClick={resetPassword}>
              Reset
            </button>
          </>
        }
      >
        <Field label="New Password" required>
          <TextInput type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoFocus />
        </Field>
      </Modal>
    </div>
  )
}
