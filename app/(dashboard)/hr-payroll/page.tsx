'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import type { Payroll, Faculty, Staff } from '@/lib/types/database.types'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function HRPayrollPage() {
  const { role, profile } = useUser()
  const supabase = createClient()

  const [records, setRecords] = useState<Payroll[]>([])
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Payroll | null>(null)
  const [form, setForm] = useState<Partial<Payroll>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [personNames, setPersonNames] = useState<Record<string, string>>({})

  useEffect(() => { loadData() }, [role])

  async function loadData() {
    setLoading(true)
    let query = supabase
      .from('payroll')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false })

    if (role === 'faculty' && profile?.faculty_id) {
      query = query.eq('staff_type', 'faculty').eq('person_id', profile.faculty_id)
    }

    const [payRes, facRes, stafRes] = await Promise.all([
      query,
      supabase.from('faculty').select('id, name').eq('status', 'active'),
      supabase.from('staff').select('id, name').eq('status', 'active'),
    ])

    setRecords((payRes.data ?? []) as Payroll[])
    setFaculty((facRes.data ?? []) as Faculty[])
    setStaff((stafRes.data ?? []) as Staff[])

    // Build name lookup
    const names: Record<string, string> = {}
    ;(facRes.data ?? []).forEach((f: any) => { names[f.id] = f.name })
    ;(stafRes.data ?? []).forEach((s: any) => { names[s.id] = s.name })
    setPersonNames(names)
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload = {
      staff_type: form.staff_type,
      person_id: form.person_id,
      month: Number(form.month),
      year: Number(form.year),
      base_salary: Number(form.base_salary ?? 0),
      deductions: Number(form.deductions ?? 0),
      payment_status: form.payment_status ?? 'pending',
      payment_date: form.payment_date || null,
    }
    const res = editing
      ? await supabase.from('payroll').update(payload).eq('id', editing.id)
      : await supabase.from('payroll').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setShowModal(false)
    loadData()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this payroll record?')) return
    await supabase.from('payroll').delete().eq('id', id)
    loadData()
  }

  const canWrite = role === 'principal' || role === 'super_admin'
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  if (loading) return <div className="loading">Loading payroll…</div>

  return (
    <>
      <PageHeader
        title="HR & Payroll"
        subtitle="Staff salary records and payment status"
        action={canWrite ? (
          <button id="payroll-new" className="btn btn-primary" onClick={() => {
            setEditing(null)
            setForm({ staff_type: 'faculty', month: currentMonth, year: currentYear, payment_status: 'pending' })
            setShowModal(true)
            setError(null)
          }}>Add payroll record</button>
        ) : undefined}
      />

      <div className="panel">
        <div className="table-wrapper">
          {records.length === 0 ? (
            <div className="empty-state">No payroll records found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Month / Year</th>
                  <th className="num">Base salary</th>
                  <th className="num">Deductions</th>
                  <th className="num">Net pay</th>
                  <th>Status</th>
                  {canWrite && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{personNames[r.person_id] ?? r.person_id.slice(0, 8) + '…'}</td>
                    <td className="text-sm" style={{ textTransform: 'capitalize' }}>{r.staff_type}</td>
                    <td className="text-sm text-muted">{MONTHS[r.month - 1]} {r.year}</td>
                    <td className="num">₹{Number(r.base_salary).toLocaleString()}</td>
                    <td className="num text-muted">₹{Number(r.deductions).toLocaleString()}</td>
                    <td className="num" style={{ fontWeight: 600 }}>₹{Number(r.net_pay).toLocaleString()}</td>
                    <td><span className={`status ${r.payment_status === 'paid' ? 'status-green' : 'status-brass'}`}>{r.payment_status}</span></td>
                    {canWrite && (
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(r); setForm({ ...r }); setShowModal(true); setError(null) }}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>Delete</button>
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
              <h2 className="modal-title">{editing ? 'Edit payroll record' : 'New payroll record'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Staff type *</label>
                <select className="form-select" value={form.staff_type ?? 'faculty'} onChange={e => setForm(f => ({ ...f, staff_type: e.target.value as Payroll['staff_type'], person_id: undefined }))}>
                  <option value="faculty">Faculty</option>
                  <option value="staff">Staff</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Person *</label>
                <select className="form-select" value={form.person_id ?? ''} onChange={e => setForm(f => ({ ...f, person_id: e.target.value }))}>
                  <option value="">Select person</option>
                  {(form.staff_type === 'faculty' ? faculty : staff).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Month *</label>
                <select className="form-select" value={form.month ?? currentMonth} onChange={e => setForm(f => ({ ...f, month: Number(e.target.value) }))}>
                  {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Year *</label>
                <input type="number" className="form-input" value={form.year ?? currentYear} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Base salary (₹) *</label><input type="number" className="form-input" value={form.base_salary ?? ''} onChange={e => setForm(f => ({ ...f, base_salary: Number(e.target.value) }))} /></div>
              <div className="form-group"><label className="form-label">Deductions (₹)</label><input type="number" className="form-input" value={form.deductions ?? 0} onChange={e => setForm(f => ({ ...f, deductions: Number(e.target.value) }))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Payment status</label>
                <select className="form-select" value={form.payment_status ?? 'pending'} onChange={e => setForm(f => ({ ...f, payment_status: e.target.value as Payroll['payment_status'] }))}>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Payment date</label><input type="date" className="form-input" value={form.payment_date ?? ''} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="payroll-save" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
