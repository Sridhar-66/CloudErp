'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import type { Timetable, Department, Section, Subject, Faculty } from '@/lib/types/database.types'

const DAYS: Timetable['day_of_week'][] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export default function TimetablePage() {
  const { role, profile } = useUser()
  const supabase = createClient()

  const [slots, setSlots] = useState<Timetable[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [facultyList, setFacultyList] = useState<Faculty[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Timetable | null>(null)
  const [form, setForm] = useState<Partial<Timetable>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterDay, setFilterDay] = useState<string>('all')

  useEffect(() => { loadData() }, [role])

  async function loadData() {
    setLoading(true)
    let query = supabase
      .from('timetable')
      .select('*, departments(name), sections(name), subjects(name), faculty(name)')
      .order('day_of_week')
      .order('period_number')

    if (role === 'faculty' && profile?.faculty_id) {
      query = query.eq('faculty_id', profile.faculty_id)
    } else if (role === 'student' && profile?.student_id) {
      const { data: student } = await supabase
        .from('students').select('section_id').eq('id', profile.student_id).single()
      if (student?.section_id) query = query.eq('section_id', student.section_id)
    }

    const [slotsRes, deptRes, secRes, subjRes, facRes] = await Promise.all([
      query,
      supabase.from('departments').select('id, name, code'),
      supabase.from('sections').select('id, name, academic_year'),
      supabase.from('subjects').select('id, name, code'),
      supabase.from('faculty').select('id, name').eq('status', 'active'),
    ])

    setSlots((slotsRes.data ?? []) as Timetable[])
    setDepartments((deptRes.data ?? []) as Department[])
    setSections((secRes.data ?? []) as Section[])
    setSubjects((subjRes.data ?? []) as Subject[])
    setFacultyList((facRes.data ?? []) as Faculty[])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm({ day_of_week: 'monday', period_number: 1, start_time: '09:00', end_time: '10:00' })
    setShowModal(true)
    setError(null)
  }

  function openEdit(s: Timetable) {
    setEditing(s)
    setForm({ ...s })
    setShowModal(true)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload = {
      department_id: form.department_id || null,
      section_id: form.section_id || null,
      day_of_week: form.day_of_week,
      period_number: Number(form.period_number ?? 1),
      start_time: form.start_time,
      end_time: form.end_time,
      subject_id: form.subject_id || null,
      faculty_id: form.faculty_id || null,
      room: form.room || null,
    }
    const res = editing
      ? await supabase.from('timetable').update(payload).eq('id', editing.id)
      : await supabase.from('timetable').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setShowModal(false)
    loadData()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this timetable slot?')) return
    await supabase.from('timetable').delete().eq('id', id)
    loadData()
  }

  const canWrite = role === 'principal' || role === 'super_admin'
  const filtered = filterDay === 'all' ? slots : slots.filter(s => s.day_of_week === filterDay)
  if (loading) return <div className="loading">Loading timetable…</div>

  return (
    <>
      <PageHeader
        title="Timetable"
        subtitle="Class schedule by day and period"
        action={canWrite ? (
          <button id="timetable-new" className="btn btn-primary" onClick={openNew}>Add slot</button>
        ) : undefined}
      />

      <div className="toolbar">
        <div className="toolbar-left">
          <label className="form-label" style={{ margin: 0 }}>Day:</label>
          <select className="form-select" style={{ width: 160 }} value={filterDay} onChange={e => setFilterDay(e.target.value)}>
            <option value="all">All days</option>
            {DAYS.map(d => <option key={d} value={d} style={{ textTransform: 'capitalize' }}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="panel">
        <div className="table-wrapper">
          {filtered.length === 0 ? (
            <div className="empty-state">No timetable entries found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Day</th>
                  <th className="num">Period</th>
                  <th>Time</th>
                  <th>Subject</th>
                  <th>Faculty</th>
                  <th>Room</th>
                  <th>Section</th>
                  {canWrite && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td className="text-sm" style={{ textTransform: 'capitalize' }}>{s.day_of_week}</td>
                    <td className="num text-sm">{s.period_number}</td>
                    <td className="text-sm text-muted">{s.start_time} – {s.end_time}</td>
                    <td style={{ fontWeight: 500 }}>{(s as any).subjects?.name ?? '—'}</td>
                    <td className="text-sm">{(s as any).faculty?.name ?? '—'}</td>
                    <td className="text-sm text-muted">{s.room ?? '—'}</td>
                    <td className="text-sm">{(s as any).sections?.name ?? '—'}</td>
                    {canWrite && (
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id)}>Delete</button>
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
              <h2 className="modal-title">{editing ? 'Edit slot' : 'Add timetable slot'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Day *</label>
                <select className="form-select" value={form.day_of_week ?? 'monday'} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value as Timetable['day_of_week'] }))}>
                  {DAYS.map(d => <option key={d} value={d} style={{ textTransform: 'capitalize' }}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Period number *</label>
                <input type="number" min={1} className="form-input" value={form.period_number ?? 1} onChange={e => setForm(f => ({ ...f, period_number: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start time *</label>
                <input type="time" className="form-input" value={form.start_time ?? ''} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">End time *</label>
                <input type="time" className="form-input" value={form.end_time ?? ''} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Subject</label>
                <select className="form-select" value={form.subject_id ?? ''} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value || undefined }))}>
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Faculty</label>
                <select className="form-select" value={form.faculty_id ?? ''} onChange={e => setForm(f => ({ ...f, faculty_id: e.target.value || undefined }))}>
                  <option value="">Select faculty</option>
                  {facultyList.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Section</label>
                <select className="form-select" value={form.section_id ?? ''} onChange={e => setForm(f => ({ ...f, section_id: e.target.value || undefined }))}>
                  <option value="">Select section</option>
                  {sections.map(s => <option key={s.id} value={s.id}>{s.name} ({s.academic_year})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Room</label>
                <input className="form-input" placeholder="e.g. Room 204" value={form.room ?? ''} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="timetable-save" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
