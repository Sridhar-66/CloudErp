'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import type { Attendance, Student, Subject } from '@/lib/types/database.types'

const STATUS_LABELS: Record<string, string> = { present: 'Present', absent: 'Absent', late: 'Late' }
const STATUS_CLASS: Record<string, string> = { present: 'status-green', absent: 'status-red', late: 'status-brass' }

export default function AttendancePage() {
  const { role, profile } = useUser()
  const supabase = createClient()

  const [records, setRecords] = useState<Attendance[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Attendance | null>(null)
  const [form, setForm] = useState<Partial<Omit<Attendance, 'marked_by'> & { marked_by?: string }>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [role])

  async function loadData() {
    setLoading(true)
    let query = supabase
      .from('attendance')
      .select('*, students(name), subjects(name), faculty(name)')
      .order('date', { ascending: false })
      .limit(200)

    if (role === 'student' && profile?.student_id) {
      query = query.eq('student_id', profile.student_id)
    } else if (role === 'faculty' && profile?.faculty_id) {
      query = query.eq('marked_by', profile.faculty_id)
    }

    const [attRes, studRes, subjRes] = await Promise.all([
      query,
      (role !== 'student')
        ? supabase.from('students').select('id, name').eq('status', 'active').limit(200)
        : Promise.resolve({ data: [] }),
      supabase.from('subjects').select('id, name, code'),
    ])

    setRecords((attRes.data ?? []) as Attendance[])
    setStudents((studRes.data ?? []) as Student[])
    setSubjects((subjRes.data ?? []) as Subject[])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ status: 'present', date: new Date().toISOString().slice(0, 10), marked_by: profile?.faculty_id ?? undefined })
    setShowModal(true)
    setError(null)
  }

  function openEdit(r: Attendance) {
    setEditing(r)
    setForm({ ...r, marked_by: r.marked_by ?? undefined })
    setShowModal(true)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload = {
      student_id: form.student_id,
      subject_id: form.subject_id || null,
      date: form.date,
      status: form.status,
      marked_by: profile?.faculty_id ?? null,
    }
    const res = editing
      ? await supabase.from('attendance').update(payload).eq('id', editing.id)
      : await supabase.from('attendance').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setShowModal(false)
    loadData()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this attendance record?')) return
    await supabase.from('attendance').delete().eq('id', id)
    loadData()
  }

  const canWrite = role === 'faculty' || role === 'principal' || role === 'super_admin'
  if (loading) return <div className="loading">Loading attendance…</div>

  // Compute summary for student
  const attended = records.filter(r => r.status === 'present').length
  const total = records.length
  const pct = total > 0 ? Math.round((attended / total) * 100) : null

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Class attendance records"
        action={canWrite && role !== 'principal' ? (
          <button id="attendance-new" className="btn btn-primary" onClick={openNew}>Mark attendance</button>
        ) : undefined}
      />

      {role === 'student' && total > 0 && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-cell">
            <div className="stat-value" style={{ color: pct && pct < 75 ? 'var(--bordeaux)' : 'var(--sage)' }}>{pct ?? '—'}%</div>
            <div className="stat-label">Overall attendance</div>
          </div>
          <div className="stat-cell">
            <div className="stat-value">{attended}</div>
            <div className="stat-label">Classes attended</div>
          </div>
          <div className="stat-cell">
            <div className="stat-value">{total - attended}</div>
            <div className="stat-label">Classes absent</div>
          </div>
        </div>
      )}

      <div className="panel">
        <div className="table-wrapper">
          {records.length === 0 ? (
            <div className="empty-state">No attendance records found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  {role !== 'student' && <th>Student</th>}
                  <th>Subject</th>
                  <th>Status</th>
                  {role !== 'student' && <th>Marked by</th>}
                  {canWrite && role !== 'principal' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td className="text-sm">{r.date}</td>
                    {role !== 'student' && <td style={{ fontWeight: 500 }}>{(r as any).students?.name ?? '—'}</td>}
                    <td className="text-sm">{(r as any).subjects?.name ?? '—'}</td>
                    <td><span className={`status ${STATUS_CLASS[r.status]}`}>{STATUS_LABELS[r.status]}</span></td>
                    {role !== 'student' && <td className="text-sm text-muted">{(r as any).faculty?.name ?? '—'}</td>}
                    {canWrite && role !== 'principal' && (
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>Edit</button>
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
              <h2 className="modal-title">{editing ? 'Edit attendance' : 'Mark attendance'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Student *</label>
                <select className="form-select" value={form.student_id ?? ''} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}>
                  <option value="">Select student</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Subject</label>
                <select className="form-select" value={form.subject_id ?? ''} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value || undefined }))}>
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input type="date" className="form-input" value={form.date ?? ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Status *</label>
                <select className="form-select" value={form.status ?? 'present'} onChange={e => setForm(f => ({ ...f, status: e.target.value as Attendance['status'] }))}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="attendance-save" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
