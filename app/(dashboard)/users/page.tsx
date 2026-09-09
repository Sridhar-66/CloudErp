'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import type { Role } from '@/lib/types/database.types'

interface UserRow {
  id: string
  role: Role
  created_at: string
  student_id: string | null
  faculty_id: string | null
}

interface CreatedCredentials {
  email: string
  password: string
  role: Role
}

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'IT Administrator',
  principal: 'Principal',
  faculty: 'Faculty',
  student: 'Student',
}

// Which roles each actor is allowed to create
const CREATABLE_ROLES: Record<string, Role[]> = {
  super_admin: ['principal', 'faculty', 'student'],
  principal:   ['faculty', 'student'],
}

export default function UsersPage() {
  const { role } = useUser()
  const supabase = createClient()

  const [users, setUsers]               = useState<UserRow[]>([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [form, setForm]                 = useState<{ email: string; password: string; role: Role; name: string }>({
    email: '', password: '', role: 'student', name: '',
  })
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [success, setSuccess]           = useState<string | null>(null)

  // Credentials card shown after successful account creation
  const [credentials, setCredentials]   = useState<CreatedCredentials | null>(null)
  const [copied, setCopied]             = useState(false)

  useEffect(() => {
    if (role !== 'super_admin' && role !== 'principal') return
    loadData()
  }, [role])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, role, student_id, faculty_id, created_at')
      .order('created_at', { ascending: false })

    setUsers((data ?? []) as UserRow[])
    setLoading(false)
  }

  function openCreate() {
    const allowed = CREATABLE_ROLES[role as string] ?? []
    setForm({ email: '', password: '', role: allowed[0] ?? 'student', name: '' })
    setError(null)
    setSuccess(null)
    setShowModal(true)
  }

  async function handleCreate() {
    if (!form.email || !form.password) {
      setError('Email and password are required.')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { role: form.role, name: form.name },
      },
    })

    if (signUpErr) {
      setError(signUpErr.message)
      setSaving(false)
      return
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        role: form.role,
      })

      // Store credentials to display in the card
      setCredentials({ email: form.email, password: form.password, role: form.role })
      setShowModal(false)
      loadData()
    }

    setSaving(false)
  }

  function handleCopy() {
    if (!credentials) return
    const text = `Role: ${ROLE_LABELS[credentials.role]}\nEmail: ${credentials.email}\nPassword: ${credentials.password}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  // Not authorised
  if (role && role !== 'super_admin' && role !== 'principal') {
    return (
      <>
        <PageHeader title="Users" subtitle="Access restricted" />
        <div className="panel"><div className="empty-state">This section is only accessible to the IT Administrator or Principal.</div></div>
      </>
    )
  }

  if (loading) return <div className="loading">Loading users…</div>

  const creatableRoles: Role[] = CREATABLE_ROLES[role as string] ?? []

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle={
          role === 'super_admin'
            ? 'Create and manage accounts — Principal, Faculty, and Students'
            : 'Create and manage Faculty and Student accounts'
        }
        action={
          <button id="user-new" className="btn btn-primary" onClick={openCreate}>
            Create account
          </button>
        }
      />

      {success && (
        <div style={{ background: 'rgba(92,107,87,0.08)', border: '1px solid var(--sage)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 20, fontSize: 'var(--text-sm)', color: 'var(--sage)' }}>
          {success}
        </div>
      )}

      <div className="panel">
        <div className="table-wrapper">
          {users.length === 0 ? (
            <div className="empty-state">No user accounts found. Create the first account above.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Entity link</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="text-sm" style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.id}</td>
                    <td><span className={`status ${u.role === 'student' ? 'status-muted' : u.role === 'faculty' ? 'status-brass' : u.role === 'principal' ? 'status-green' : 'status-red'}`}>{ROLE_LABELS[u.role]}</span></td>
                    <td className="text-sm text-muted">{u.created_at?.slice(0, 10)}</td>
                    <td className="text-xs text-muted">
                      {u.student_id ? `Student: ${u.student_id.slice(0, 8)}…` : u.faculty_id ? `Faculty: ${u.faculty_id.slice(0, 8)}…` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Create account modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Create user account</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
              Provision a new account. The credentials will be shown once after creation — save them immediately.
            </p>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Dr. Priya Sharma" />
            </div>
            <div className="form-group">
              <label className="form-label">College email *</label>
              <input type="email" className="form-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="user@college.edu" />
            </div>
            <div className="form-group">
              <label className="form-label">Temporary password *</label>
              <input type="text" className="form-input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters" />
              <p className="text-xs text-muted" style={{ marginTop: 4 }}>Shown in plain text so you can copy and hand it over.</p>
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}>
                {creatableRoles.map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="user-save" className="btn btn-primary" onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Credentials card shown once after creation ── */}
      {credentials && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 className="modal-title">✅ Account created</h2>
            </div>

            <div style={{
              background: 'rgba(255,193,7,0.08)',
              border: '1px solid #f0b429',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              marginBottom: 20,
              fontSize: 'var(--text-sm)',
              color: '#b8860b',
            }}>
              ⚠️ <strong>Save these credentials now.</strong> The password will not be shown again.
            </div>

            <div style={{
              background: 'var(--surface-1, #f8f8f6)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '16px 20px',
              marginBottom: 24,
              fontFamily: 'monospace',
              fontSize: 'var(--text-sm)',
              lineHeight: 2,
            }}>
              <div><span style={{ opacity: 0.55 }}>Role &nbsp;&nbsp;&nbsp;&nbsp;</span> {ROLE_LABELS[credentials.role]}</div>
              <div><span style={{ opacity: 0.55 }}>Email &nbsp;&nbsp;&nbsp;</span> {credentials.email}</div>
              <div><span style={{ opacity: 0.55 }}>Password </span> {credentials.password}</div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={handleCopy}
                style={{ minWidth: 130 }}
              >
                {copied ? '✓ Copied!' : 'Copy credentials'}
              </button>
              <button
                id="cred-done"
                className="btn btn-primary"
                onClick={() => { setCredentials(null); setCopied(false) }}
              >
                Done — I've saved them
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
