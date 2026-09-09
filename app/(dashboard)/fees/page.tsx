'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import type { Fee, Student } from '@/lib/types/database.types'

const FEE_TYPES = ['tuition', 'hostel', 'transport', 'exam', 'misc']

export default function FeesPage() {
  const { role, profile } = useUser()
  const supabase = createClient()

  const [fees, setFees] = useState<Fee[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Fee | null>(null)
  const [form, setForm] = useState<Partial<Fee>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [role])

  async function loadData() {
    setLoading(true)
    let query = supabase
      .from('fees')
      .select('*, students(name, email)')
      .order('created_at', { ascending: false })

    if (role === 'student' && profile?.student_id) {
      query = query.eq('student_id', profile.student_id)
    }

    const [feesRes, studRes] = await Promise.all([
      query,
      (role === 'principal' || role === 'super_admin')
        ? supabase.from('students').select('id, name, email').eq('status', 'active')
        : Promise.resolve({ data: [] }),
    ])

    setFees((feesRes.data ?? []) as Fee[])
    setStudents((studRes.data ?? []) as Student[])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ fee_type: 'tuition', payment_mode: 'cash', total_due: 0, amount_paid: 0 })
    setShowModal(true)
    setError(null)
  }

  function openEdit(f: Fee) {
    setEditing(f)
    setForm({ ...f })
    setShowModal(true)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload = {
      student_id: form.student_id,
      fee_type: form.fee_type,
      total_due: Number(form.total_due ?? 0),
      amount_paid: Number(form.amount_paid ?? 0),
      payment_date: form.payment_date || null,
      payment_mode: 'cash',
      receipt_number: form.receipt_number || null,
      remarks: form.remarks || null,
      academic_year: form.academic_year || null,
    }
    const res = editing
      ? await supabase.from('fees').update(payload).eq('id', editing.id)
      : await supabase.from('fees').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setShowModal(false)
    loadData()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this fee record?')) return
    await supabase.from('fees').delete().eq('id', id)
    loadData()
  }

  const canWrite = role === 'principal' || role === 'super_admin'
  if (loading) return <div className="loading">Loading fees…</div>

  return (
    <>
      <PageHeader
        title="Fees"
        subtitle="Fee records and payment tracking (cash only)"
        action={canWrite ? (
          <button id="fee-new" className="btn btn-primary" onClick={openNew}>Add fee record</button>
        ) : undefined}
      />

      <div className="panel">
        <div className="table-wrapper">
          {fees.length === 0 ? (
            <div className="empty-state">No fee records found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Type</th>
                  <th>Academic year</th>
                  <th className="num">Total due</th>
                  <th className="num">Amount paid</th>
                  <th className="num">Balance</th>
                  <th>Receipt</th>
                  {canWrite && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {fees.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{f.students?.name ?? '—'}</div>
                      <div className="text-xs text-muted">{f.students?.email ?? ''}</div>
                    </td>
                    <td className="text-sm" style={{ textTransform: 'capitalize' }}>{f.fee_type}</td>
                    <td className="text-sm text-muted">{f.academic_year ?? '—'}</td>
                    <td className="num text-sm">₹{Number(f.total_due).toLocaleString()}</td>
                    <td className="num text-sm" style={{ color: 'var(--sage)' }}>₹{Number(f.amount_paid).toLocaleString()}</td>
                    <td className="num text-sm" style={{ color: Number(f.balance) > 0 ? 'var(--bordeaux)' : 'var(--sage)' }}>
                      ₹{Number(f.balance).toLocaleString()}
                    </td>
                    <td className="text-sm text-muted">{f.receipt_number ?? '—'}</td>
                    {canWrite && (
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(f)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(f.id)}>Delete</button>
                        </div>
                      </td>
                    )}
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
              <h2 className="modal-title">{editing ? 'Edit fee record' : 'New fee record'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="auth-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Student *</label>
              <select className="form-select" value={form.student_id ?? ''} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}>
                <option value="">Select student</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} — {s.email}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Fee type *</label>
                <select className="form-select" value={form.fee_type ?? 'tuition'} onChange={e => setForm(f => ({ ...f, fee_type: e.target.value as Fee['fee_type'] }))}>
                  {FEE_TYPES.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Academic year</label>
                <input className="form-input" placeholder="2025-26" value={form.academic_year ?? ''} onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Total due (₹) *</label>
                <input type="number" className="form-input" value={form.total_due ?? ''} onChange={e => setForm(f => ({ ...f, total_due: Number(e.target.value) }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Amount paid (₹)</label>
                <input type="number" className="form-input" value={form.amount_paid ?? ''} onChange={e => setForm(f => ({ ...f, amount_paid: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Payment date</label>
                <input type="date" className="form-input" value={form.payment_date ?? ''} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Receipt number</label>
                <input className="form-input" value={form.receipt_number ?? ''} onChange={e => setForm(f => ({ ...f, receipt_number: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Remarks / waiver reason</label>
              <textarea className="form-textarea" value={form.remarks ?? ''} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="fee-save" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
