'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import type { Fee, Student } from '@/lib/types/database.types'

// Students hydrated with their section/course so the page can derive a class list for bulk fee entry.
interface StudentRow extends Student {
  section_id: string | null
  sections?: { name: string; academic_year: string; courses?: { name: string } }
}

const FEE_TYPES = ['tuition', 'hostel', 'transport', 'exam', 'misc']

export default function FeesPage() {
  const { role, profile } = useUser()
  const supabase = createClient()

  const [fees, setFees] = useState<Fee[]>([])
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [editing, setEditing] = useState<Fee | null>(null)
  const [form, setForm] = useState<Partial<Fee>>({})
  const [bulkForm, setBulkForm] = useState<{
    section_id: string
    fee_type: Fee['fee_type']
    total_due: number
    academic_year: string
    remarks: string
  }>({ section_id: '', fee_type: 'tuition', total_due: 0, academic_year: '', remarks: '' })
  const [saving, setSaving] = useState(false)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [role, profile?.student_id])

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
        ? supabase.from('students')
            .select('id, name, email, section_id, sections(name, academic_year, courses(name))')
            .eq('status', 'active')
        : Promise.resolve({ data: [], error: null }),
    ])

    setFees((feesRes.data ?? []) as Fee[])
    setStudents((studRes.data ?? []) as unknown as StudentRow[])
    if (feesRes.error) {
      setLoadError(`Fees: ${feesRes.error.message}`)
    } else if (studRes.error) {
      setLoadError(`Students: ${studRes.error.message}`)
    } else {
      setLoadError(null)
    }
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ fee_type: 'tuition', payment_mode: 'cash', total_due: 0, amount_paid: 0 })
    setShowModal(true)
    setError(null)
  }

  function openBulk() {
    setBulkForm({ section_id: '', fee_type: 'tuition', total_due: 0, academic_year: '', remarks: '' })
    if (classOptions.length === 0) {
      setBulkError('No active students loaded — check the Students module (or your connection) and try again.')
    } else {
      setBulkError(null)
    }
    setShowBulkModal(true)
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
    const res = await supabase.from('fees').delete().eq('id', id)
    if (res.error) { setError(res.error.message); return }
    loadData()
  }

  // Class options derived from active students (section_id is the class/section FK).
  const classMap = new Map<string, { name: string; academic_year: string; course: string; student_count: number }>()
  students.forEach(s => {
    if (!s.section_id || !s.sections) return
    const existing = classMap.get(s.section_id)
    if (existing) {
      existing.student_count += 1
    } else {
      classMap.set(s.section_id, {
        name: s.sections.name,
        academic_year: s.sections.academic_year,
        course: s.sections.courses?.name ?? '',
        student_count: 1,
      })
    }
  })
  const classOptions = Array.from(classMap.entries())
    .map(([section_id, c]) => ({ section_id, ...c }))
    .sort((a, b) => `${a.course} ${a.name}`.localeCompare(`${b.course} ${b.name}`))
  const selectedClass = classOptions.find(c => c.section_id === bulkForm.section_id)

  // Fee overview stats computed from the role-scoped records shown in the table.
  const totals = fees.reduce(
    (acc, f) => ({
      due: acc.due + Number(f.total_due),
      paid: acc.paid + Number(f.amount_paid),
      balance: acc.balance + Number(f.balance),
    }),
    { due: 0, paid: 0, balance: 0 }
  )
  const studentFeeOverview = fees.reduce(
    (acc, f) => ({
      due: acc.due + Number(f.total_due),
      paid: acc.paid + Number(f.amount_paid),
      balance: acc.balance + Number(f.balance),
      records: acc.records + 1,
    }),
    { due: 0, paid: 0, balance: 0, records: 0 }
  )
  const studentBalances = new Map<string, number>()
  fees.forEach(f => {
    studentBalances.set(f.student_id, (studentBalances.get(f.student_id) ?? 0) + Number(f.balance))
  })
  const fullyPaidCount = Array.from(studentBalances.values()).filter(b => b <= 0).length
  const pendingCount = studentBalances.size - fullyPaidCount
  const byType = FEE_TYPES
    .map(t => ({
      type: t,
      due: fees.filter(f => f.fee_type === t).reduce((s, f) => s + Number(f.total_due), 0),
      paid: fees.filter(f => f.fee_type === t).reduce((s, f) => s + Number(f.amount_paid), 0),
    }))
    .filter(t => t.due !== 0 || t.paid !== 0)

  async function handleBulkSave() {
    if (!canWrite) return
    const option = classOptions.find(c => c.section_id === bulkForm.section_id)
    const targetStudents = students.filter(s => s.section_id === bulkForm.section_id)
    if (!option || targetStudents.length === 0) {
      setBulkError('No active students found in the selected class.')
      return
    }
    const amount = Number(bulkForm.total_due)
    const className = `${option.course} ${option.name}`.trim()
    if (!confirm(`This will add a fee of ₹${amount.toLocaleString()} for ${targetStudents.length} students in ${className} — continue?`)) return

    setBulkSaving(true)
    setBulkError(null)
    const rows = targetStudents.map(s => ({
      student_id: s.id,
      fee_type: bulkForm.fee_type,
      total_due: amount,
      amount_paid: 0,
      payment_mode: 'cash',
      academic_year: bulkForm.academic_year || null,
      remarks: bulkForm.remarks || null,
    }))
    const res = await supabase.from('fees').insert(rows)
    if (res.error) { setBulkError(res.error.message); setBulkSaving(false); return }
    setShowBulkModal(false)
    loadData()
    setBulkSaving(false)
  }

  const canWrite = role === 'principal' || role === 'super_admin'
  if (loading) return <div className="loading">Loading fees…</div>

  return (
    <>
      <PageHeader
        title="Fees"
        subtitle="Fee records and payment tracking (cash only)"
        action={canWrite ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button id="fee-new" className="btn btn-primary" onClick={openNew}>Add fee record</button>
            <button id="fee-bulk" className="btn btn-secondary" onClick={openBulk}>Bulk add (by class)</button>
          </div>
        ) : undefined}
      />

      {loadError && (
        <div className="auth-error" style={{ marginBottom: 16 }} role="alert">
          Couldn't load fee data: {loadError}
        </div>
      )}

      {role === 'student' && fees.length > 0 && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-header">
            <h2 className="panel-title">My fee overview</h2>
          </div>
          <div className="stats-grid" style={{ marginBottom: 16 }}>
            <div className="stat-cell">
              <div className="stat-value">₹{studentFeeOverview.due.toLocaleString()}</div>
              <div className="stat-label">Total fee due</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value" style={{ color: 'var(--sage)' }}>₹{studentFeeOverview.paid.toLocaleString()}</div>
              <div className="stat-label">Total paid</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value" style={{ color: studentFeeOverview.balance > 0 ? 'var(--bordeaux)' : 'var(--sage)' }}>
                ₹{studentFeeOverview.balance.toLocaleString()}
              </div>
              <div className="stat-label">Outstanding balance</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value" style={{ color: 'var(--sage)' }}>{studentFeeOverview.records}</div>
              <div className="stat-label">Fee entries</div>
            </div>
          </div>
        </div>
      )}

      {(role === 'principal' || role === 'super_admin') && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-header">
            <h2 className="panel-title">Fee overview</h2>
          </div>
          <div className="stats-grid" style={{ marginBottom: 16 }}>
            <div className="stat-cell">
              <div className="stat-value">₹{totals.due.toLocaleString()}</div>
              <div className="stat-label">Total fees due</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value" style={{ color: 'var(--sage)' }}>₹{totals.paid.toLocaleString()}</div>
              <div className="stat-label">Total amount collected</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value" style={{ color: totals.balance > 0 ? 'var(--bordeaux)' : 'var(--sage)' }}>
                ₹{totals.balance.toLocaleString()}
              </div>
              <div className="stat-label">Outstanding balance</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value" style={{ color: 'var(--sage)' }}>{fullyPaidCount}</div>
              <div className="stat-label">Students fully paid</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value" style={{ color: pendingCount > 0 ? 'var(--bordeaux)' : 'var(--sage)' }}>{pendingCount}</div>
              <div className="stat-label">Students pending</div>
            </div>
          </div>
          {fees.length === 0 && (
            <p className="text-sm text-muted" style={{ marginTop: 8 }}>
              No fee records yet — add a fee or use “Bulk add (by class)” to get started.
            </p>
          )}
          {byType.length > 0 && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fee type</th>
                    <th className="num">Due</th>
                    <th className="num">Paid</th>
                    <th className="num">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {byType.map(t => (
                    <tr key={t.type}>
                      <td className="text-sm" style={{ textTransform: 'capitalize' }}>{t.type}</td>
                      <td className="num text-sm">₹{t.due.toLocaleString()}</td>
                      <td className="num text-sm" style={{ color: 'var(--sage)' }}>₹{t.paid.toLocaleString()}</td>
                      <td className="num text-sm" style={{ color: (t.due - t.paid) > 0 ? 'var(--bordeaux)' : 'var(--sage)' }}>
                        ₹{(t.due - t.paid).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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

      {showBulkModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowBulkModal(false) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Bulk add fees by class</h2>
              <button className="modal-close" onClick={() => setShowBulkModal(false)}>×</button>
            </div>
            {bulkError && <div className="auth-error">{bulkError}</div>}

            <div className="form-group">
              <label className="form-label">Class / section *</label>
              <select className="form-select" value={bulkForm.section_id} onChange={e => setBulkForm(f => ({ ...f, section_id: e.target.value }))}>
                <option value="">Select class</option>
                {classOptions.map(c => (
                  <option key={c.section_id} value={c.section_id}>
                    {`${[c.course, c.name].filter(Boolean).join(' ')} — ${c.academic_year || '—'} ({c.student_count} students)`}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Fee type *</label>
                <select className="form-select" value={bulkForm.fee_type} onChange={e => setBulkForm(f => ({ ...f, fee_type: e.target.value as Fee['fee_type'] }))}>
                  {FEE_TYPES.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Academic year</label>
                <input className="form-input" placeholder="2025-26" value={bulkForm.academic_year} onChange={e => setBulkForm(f => ({ ...f, academic_year: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Total due (₹) *</label>
              <input type="number" className="form-input" value={bulkForm.total_due} onChange={e => setBulkForm(f => ({ ...f, total_due: Number(e.target.value) }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Remarks</label>
              <textarea className="form-textarea" value={bulkForm.remarks} onChange={e => setBulkForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>

            <p className="text-sm text-muted" style={{ marginTop: 12 }}>
              {selectedClass
                ? `Will create a ₹${Number(bulkForm.total_due || 0).toLocaleString()} fee for ${selectedClass.student_count} active students — each with amount paid ₹0, ready for individual payment tracking.`
                : 'Select a class to add the same fee for every active student in it.'}
            </p>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>Cancel</button>
              <button id="fee-bulk-save" className="btn btn-primary" onClick={handleBulkSave} disabled={bulkSaving || !bulkForm.section_id}>
                {bulkSaving ? 'Adding…' : 'Add for all students'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
