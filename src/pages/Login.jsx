import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Gem, Lock, User } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

const DEMO_LOGINS = [
  { username: 'admin', password: 'admin123', role: 'Admin' },
  { username: 'management', password: 'pass123', role: 'Management' },
  { username: 'sales1', password: 'pass123', role: 'Sales' },
  { username: 'planner1', password: 'pass123', role: 'Production Manager' },
  { username: 'cad1', password: 'pass123', role: 'CAD Designer' },
  { username: 'qc1', password: 'pass123', role: 'QC' },
]

export default function Login() {
  const { user, login, loading } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')

  if (user) return <Navigate to="/dashboard" replace />

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const res = await login(username, password)
    if (res.error) setError(res.error)
    else navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hos-ink-950 px-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-hos-ink-900 via-hos-ink-900 to-hos-gold-900 p-10 text-white md:flex">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-hos-gold-500">
                <Gem size={22} />
              </div>
              <div>
                <div className="font-display text-lg font-bold">House of Sansa</div>
                <div className="text-xs uppercase tracking-widest text-hos-gold-200">Raipur · Chhattisgarh</div>
              </div>
            </div>
            <h2 className="mt-14 font-display text-3xl font-bold leading-snug">
              Jewellery Order to Delivery Management System
            </h2>
            <p className="mt-4 text-sm text-hos-ink-300">
              Track every order from receipt through CAD, casting, diamond setting, QC, packing and delivery —
              with full material accountability and audit history in one place.
            </p>
          </div>
          <div className="text-xs text-hos-ink-400">© {new Date().getFullYear()} House of Sansa. Internal use only.</div>
        </div>

        <div className="bg-white p-8 sm:p-10">
          <h1 className="font-display text-2xl font-bold text-hos-ink-900">Sign in</h1>
          <p className="mt-1 text-sm text-hos-ink-500">Enter your credentials to access the system.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hos-ink-400" />
                <input className="input pl-9" value={username} onChange={(e) => setUsername(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-hos-ink-400" />
                <input type="password" className="input pl-9" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={loading} className="btn-gold w-full">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 rounded-lg border border-hos-ink-200 bg-hos-ink-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-hos-ink-500">Demo Logins</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {DEMO_LOGINS.map((d) => (
                <button
                  key={d.username}
                  type="button"
                  onClick={() => {
                    setUsername(d.username)
                    setPassword(d.password)
                  }}
                  className="rounded-md border border-hos-ink-200 bg-white px-2 py-1.5 text-left hover:border-hos-gold-400"
                >
                  <div className="font-semibold text-hos-ink-800">{d.role}</div>
                  <div className="text-hos-ink-400">{d.username}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
