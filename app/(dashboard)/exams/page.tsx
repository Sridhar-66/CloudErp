'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import type { Exam, Student, Subject } from '@/lib/types/database.types'

const EXAM_TYPES = ['midterm', 'final', 'assignment', 'quiz']

function computeGrade(marks: number, max: number): string {
  const pct = (marks / max) * 100
  if (pct >= 90) return 'O'
  if (pct >= 80) return 'A+'
  if (pct >= 70) return 'A'
  if (pct >= 60) return 'B+'
  if (pct >= 50) return 'B'
  if (pct >= 40) return 'C'
  return 'F'
}

export default function ExamsPage() {
  const { role, profile } = useUser()
  const supabase = createClient()

  const [records, setRecords] = useState<Exam[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Exam | null>(null)
  const [form, setForm] = useState<Partial<Exam>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [role])

  async function loadData() {
    setLoading(true)
    let query = supabase
      .from('exams')
      .select('*, students(name), subjects(name)')
      .order('exam_date', { ascending: false })
      .limit(300)

    if (role === 'student' && profile?.student_id) {
      query = query.eq('student_id', profile.student_id)
    } else if (role === 'faculty' && profile?.faculty_id) {
      query = query.eq('entered_by', profile.faculty_id)
    }

    const [examRes, studRes, subjRes] = await Promise.all([
      query,
      (role !== 'student')
        ? supabase.from('students').select('id, name').eq('status', 'active').limit(200)
        : Promise.resolve({ data: [] }),
      supabase.from('subjects').select('id, name, code'),
    ])

    setRecords((examRes.data ?? []) as Exam[])
    setStudents((studRes.data ?? []) as Student[])
    setSubjects((subjRes.data ?? []) as Subject[])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ exam_type: 'midterm', max_marks: 100, exam_date: new Date().toISOString().slice(0, 10) })
    setShowModal(true)
    setError(null)
  }

  function openEdit(e: Exam) {
    setEditing(e)
    setForm({ ...e })
    setShowModal(true)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const marks = Number(form.marks_obtained ?? 0)
    const max = Number(form.max_marks ?? 100)
    const payload = {
      student_id: form.student_id,
      subject_id: form.subject_id || null,
      exam_type: form.exam_type,
      marks_obtained: marks,
      max_marks: max,
      grade: form.grade || computeGrade(marks, max),
      remarks: form.remarks || null,
      entered_by: profile?.faculty_id ?? null,
      exam_date: form.exam_date || null,
    }
    const res = editing
      ? await supabase.from('exams').update(payload).eq('id', editing.id)
      : await supabase.from('exams').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setShowModal(false)
    loadData()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this exam record?')) return
    await supabase.from('exams').delete().eq('id', id)
    loadData()
  }

  const canWrite = role === 'faculty' || role === 'principal' || role === 'super_admin'
  if (loading) return <div className="loading">Loading exams…</div>

  return (
    <>
      <PageHeader
        title="Exams & Grades"
        subtitle="Examination results and grade records"
        action={canWrite && role !== 'principal' ? (
          <button id="exam-new" className="btn btn-primary" onClick={openNew}>Add grade</button>
        ) : undefined}
      />

      <div className="panel">
        <div className="table-wrapper">
          {records.length === 0 ? (
            <div className="empty-state">No exam records found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  {role !== 'student' && <th>Student</th>}
                  <th>Subject</th>
                  <th>Exam type</th>
                  <th>Date</th>
                  <th className="num">Marks</th>
                  <th className="num">Max</th>
                  <th className="num">%</th>
                  <th>Grade</th>
                  {canWrite && role !== 'principal' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const pct = Math.round((r.marks_obtained / r.max_marks) * 100)
                  return (
                    <tr key={r.id}>
                      {role !== 'student' && <td style={{ fontWeight: 500 }}>{(r as any).students?.name ?? '—'}</td>}
                      <td className="text-sm">{(r as any).subjects?.name ?? '—'}</td>
                      <td className="text-sm" style={{ textTransform: 'capitalize' }}>{r.exam_type}</td>
                      <td className="text-sm text-muted">{r.exam_date ?? '—'}</td>
                      <td className="num">{r.marks_obtained}</td>
                      <td className="num text-muted">{r.max_marks}</td>
                      <td className="num" style={{ color: pct < 40 ? 'var(--bordeaux)' : pct >= 70 ? 'var(--sage)' : 'inherit' }}>{pct}%</td>
                      <td style={{ fontWeight: 600, color: r.grade === 'F' ? 'var(--bordeaux)' : 'var(--sage)' }}>{r.grade ?? computeGrade(r.marks_obtained, r.max_marks)}</td>
                      {canWrite && role !== 'principal' && (
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>Delete</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit grade' : 'Add grade'}</h2>
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
                <label className="form-label">Exam type *</label>
                <select className="form-select" value={form.exam_type ?? 'midterm'} onChange={e => setForm(f => ({ ...f, exam_type: e.target.value as Exam['exam_type'] }))}>
                  {EXAM_TYPES.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Exam date</label>
                <input type="date" className="form-input" value={form.exam_date ?? ''} onChange={e => setForm(f => ({ ...f, exam_date: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Marks obtained *</label>
                <input type="number" className="form-input" value={form.marks_obtained ?? ''} onChange={e => setForm(f => ({ ...f, marks_obtained: Number(e.target.value) }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Max marks</label>
                <input type="number" className="form-input" value={form.max_marks ?? 100} onChange={e => setForm(f => ({ ...f, max_marks: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Grade (auto-computed if blank)</label>
                <input className="form-input" placeholder="e.g. A+" value={form.grade ?? ''} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Remarks</label>
              <textarea className="form-textarea" value={form.remarks ?? ''} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="exam-save" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
