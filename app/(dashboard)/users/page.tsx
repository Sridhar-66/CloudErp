'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import type { Role } from '@/lib/types/database.types'

interface UserRow {
  id: string
  email: string
  role: Role
  created_at: string
  student_id: string | null
  faculty_id: string | null
}

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'IT Administrator',
  principal: 'Principal',
  faculty: 'Faculty',
  student: 'Student',
}

export default function UsersPage() {
  const { role } = useUser()
  const supabase = createClient()

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<{ email: string; password: string; role: Role; name: string }>({
    email: '', password: '', role: 'student', name: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (role !== 'super_admin') return
    loadData()
  }, [role])

  async function loadData() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, role, student_id, faculty_id, created_at')
      .order('created_at', { ascending: false })

    // Profiles don't store email — we display id and role
    setUsers((data ?? []) as UserRow[])
    setLoading(false)
  }

  async function handleCreate() {
    setSaving(true)
    setError(null)
    setSuccess(null)

    // Use the admin signup flow via supabase auth (signUp)
    // Note: on the free tier this creates user directly
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { role: form.role, name: form.name },
      },
    })

    if (signUpErr) { setError(signUpErr.message); setSaving(false); return }

    if (data.user) {
      // Also create/update profile row with the role
      await supabase.from('profiles').upsert({
        id: data.user.id,
        role: form.role,
      })
      setSuccess(`Account created for ${form.email}. They will receive a confirmation email.`)
      setShowModal(false)
      loadData()
    }
    setSaving(false)
  }

  if (role !== 'super_admin') {
    return (
      <>
        <PageHeader title="Users" subtitle="Access restricted" />
        <div className="panel"><div className="empty-state">This section is only accessible to the IT Administrator.</div></div>
      </>
    )
  }

  if (loading) return <div className="loading">Loading users…</div>

  return (
    <>
      <PageHeader
        title="User Management"
        subtitle="Create and manage user accounts for all roles"
        action={
          <button id="user-new" className="btn btn-primary" onClick={() => {
            setForm({ email: '', password: '', role: 'student', name: '' })
            setShowModal(true)
            setError(null)
            setSuccess(null)
          }}>Create account</button>
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

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Create user account</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
              Accounts are provisioned by IT Administrator only. The user will receive a confirmation email.
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
              <input type="password" className="form-input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters" />
            </div>
            <div className="form-group">
              <label className="form-label">Role *</label>
              <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}>
                {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
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
    </>
  )
}
