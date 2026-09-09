'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import type { Admission, Course, Department } from '@/lib/types/database.types'

const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied', under_review: 'Under review',
  approved: 'Approved', rejected: 'Rejected', waitlisted: 'Waitlisted',
}
const STATUS_CLASS: Record<string, string> = {
  applied: 'status-muted', under_review: 'status-brass',
  approved: 'status-green', rejected: 'status-red', waitlisted: 'status-brass',
}

export default function AdmissionsPage() {
  const { role, profile } = useUser()
  const supabase = createClient()

  const [admissions, setAdmissions] = useState<Admission[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Admission | null>(null)
  const [form, setForm] = useState<Partial<Admission>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [role])

  async function loadData() {
    setLoading(true)
    let query = supabase
      .from('admissions')
      .select('*, courses(name), departments(name)')
      .order('created_at', { ascending: false })

    if (role === 'student' && profile?.student_id) {
      query = query.eq('student_id', profile.student_id)
    }

    const [admRes, courseRes, deptRes] = await Promise.all([
      query,
      supabase.from('courses').select('id, name, code'),
      supabase.from('departments').select('id, name, code'),
    ])

    setAdmissions((admRes.data ?? []) as Admission[])
    setCourses((courseRes.data ?? []) as Course[])
    setDepartments((deptRes.data ?? []) as Department[])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ status: 'applied' })
    setShowModal(true)
    setError(null)
  }

  function openEdit(a: Admission) {
    setEditing(a)
    setForm({ ...a })
    setShowModal(true)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload = {
      applicant_name: form.applicant_name,
      dob: form.dob || null,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone || null,
      previous_institution: form.previous_institution || null,
      course_id: form.course_id || null,
      department_id: form.department_id || null,
      status: form.status,
      admission_date: form.admission_date || null,
      remarks: form.remarks || null,
    }

    const res = editing
      ? await supabase.from('admissions').update(payload).eq('id', editing.id)
      : await supabase.from('admissions').insert(payload)

    if (res.error) { setError(res.error.message); setSaving(false); return }
    setShowModal(false)
    loadData()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this admission record?')) return
    await supabase.from('admissions').delete().eq('id', id)
    loadData()
  }

  const canWrite = role === 'principal' || role === 'super_admin'

  if (loading) return <div className="loading">Loading admissions…</div>

  return (
    <>
      <PageHeader
        title="Admissions"
        subtitle="Application records and admission status"
        action={canWrite ? (
          <button id="admission-new" className="btn btn-primary" onClick={openNew}>Add application</button>
        ) : undefined}
      />

      <div className="panel">
        <div className="table-wrapper">
          {admissions.length === 0 ? (
            <div className="empty-state">No admission records found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Course</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Applied on</th>
                  {canWrite && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {admissions.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{a.applicant_name}</div>
                      <div className="text-muted text-xs">{a.contact_email}</div>
                    </td>
                    <td className="text-sm">{a.courses?.name ?? '—'}</td>
                    <td className="text-sm">{a.departments?.name ?? '—'}</td>
                    <td>
                      <span className={`status ${STATUS_CLASS[a.status]}`}>
                        {STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="text-sm text-muted">{a.created_at?.slice(0, 10)}</td>
                    {canWrite && (
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(a)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a.id)}>Delete</button>
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
              <h2 className="modal-title">{editing ? 'Edit application' : 'New application'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Applicant name *</label>
                <input className="form-input" value={form.applicant_name ?? ''} onChange={e => setForm(f => ({ ...f, applicant_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of birth</label>
                <input type="date" className="form-input" value={form.dob ?? ''} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Contact email *</label>
                <input type="email" className="form-input" value={form.contact_email ?? ''} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Contact phone</label>
                <input className="form-input" value={form.contact_phone ?? ''} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Previous institution</label>
              <input className="form-input" value={form.previous_institution ?? ''} onChange={e => setForm(f => ({ ...f, previous_institution: e.target.value }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Department</label>
                <select className="form-select" value={form.department_id ?? ''} onChange={e => setForm(f => ({ ...f, department_id: e.target.value || undefined }))}>
                  <option value="">Select department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Course applied for</label>
                <select className="form-select" value={form.course_id ?? ''} onChange={e => setForm(f => ({ ...f, course_id: e.target.value || undefined }))}>
                  <option value="">Select course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status ?? 'applied'} onChange={e => setForm(f => ({ ...f, status: e.target.value as Admission['status'] }))}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Admission date</label>
                <input type="date" className="form-input" value={form.admission_date ?? ''} onChange={e => setForm(f => ({ ...f, admission_date: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Remarks</label>
              <textarea className="form-textarea" value={form.remarks ?? ''} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="admission-save" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
