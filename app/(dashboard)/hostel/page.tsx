'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import type { HostelAllocation, Student } from '@/lib/types/database.types'

const STATUS_LABELS: Record<string, string> = {
  allocated: 'Allocated', vacant: 'Vacant', requested: 'Requested', vacated: 'Vacated',
}
const STATUS_CLASS: Record<string, string> = {
  allocated: 'status-green', vacant: 'status-muted', requested: 'status-brass', vacated: 'status-muted',
}

export default function HostelPage() {
  const { role, profile } = useUser()
  const supabase = createClient()

  const [records, setRecords] = useState<HostelAllocation[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<HostelAllocation | null>(null)
  const [form, setForm] = useState<Partial<HostelAllocation>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [role])

  async function loadData() {
    setLoading(true)
    let query = supabase
      .from('hostel_allocations')
      .select('*, students(name, email)')
      .order('created_at', { ascending: false })

    if (role === 'student' && profile?.student_id) {
      query = query.eq('student_id', profile.student_id)
    }

    const [hostRes, studRes] = await Promise.all([
      query,
      (role !== 'student')
        ? supabase.from('students').select('id, name').eq('status', 'active').limit(200)
        : Promise.resolve({ data: [] }),
    ])

    setRecords((hostRes.data ?? []) as HostelAllocation[])
    setStudents((studRes.data ?? []) as Student[])
    setLoading(false)
  }

  function openNew(isRequest = false) {
    setEditing(null)
    setForm({
      status: isRequest ? 'requested' : 'allocated',
      allocation_date: new Date().toISOString().slice(0, 10),
      ...(role === 'student' ? { student_id: profile?.student_id ?? undefined } : {}),
    })
    setShowModal(true)
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload = {
      student_id: form.student_id,
      block: form.block,
      room_number: form.room_number,
      allocation_date: form.allocation_date || null,
      status: form.status,
      remarks: form.remarks || null,
    }
    const res = editing
      ? await supabase.from('hostel_allocations').update(payload).eq('id', editing.id)
      : await supabase.from('hostel_allocations').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setShowModal(false)
    loadData()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this hostel record?')) return
    await supabase.from('hostel_allocations').delete().eq('id', id)
    loadData()
  }

  const canWrite = role === 'principal' || role === 'super_admin'
  if (loading) return <div className="loading">Loading hostel…</div>

  return (
    <>
      <PageHeader
        title="Hostel"
        subtitle="Hostel room allocations and requests"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {role === 'student' && (
              <button id="hostel-request" className="btn btn-secondary" onClick={() => openNew(true)}>Request allocation</button>
            )}
            {canWrite && (
              <button id="hostel-new" className="btn btn-primary" onClick={() => openNew(false)}>Allocate room</button>
            )}
          </div>
        }
      />

      <div className="panel">
        <div className="table-wrapper">
          {records.length === 0 ? (
            <div className="empty-state">No hostel records found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Block</th>
                  <th>Room</th>
                  <th>Allocation date</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  {canWrite && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{(r as any).students?.name ?? '—'}</td>
                    <td className="text-sm">{r.block}</td>
                    <td className="text-sm">{r.room_number}</td>
                    <td className="text-sm text-muted">{r.allocation_date ?? '—'}</td>
                    <td><span className={`status ${STATUS_CLASS[r.status]}`}>{STATUS_LABELS[r.status]}</span></td>
                    <td className="text-sm text-muted">{r.remarks ?? '—'}</td>
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
              <h2 className="modal-title">{editing ? 'Edit hostel record' : form.status === 'requested' ? 'Room change request' : 'Allocate room'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="auth-error">{error}</div>}
            {role !== 'student' && (
              <div className="form-group">
                <label className="form-label">Student *</label>
                <select className="form-select" value={form.student_id ?? ''} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}>
                  <option value="">Select student</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-row">
              <div className="form-group"><label className="form-label">Block / building *</label><input className="form-input" value={form.block ?? ''} onChange={e => setForm(f => ({ ...f, block: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Room number *</label><input className="form-input" value={form.room_number ?? ''} onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))} /></div>
            </div>
            {canWrite && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status ?? 'allocated'} onChange={e => setForm(f => ({ ...f, status: e.target.value as HostelAllocation['status'] }))}>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Allocation date</label><input type="date" className="form-input" value={form.allocation_date ?? ''} onChange={e => setForm(f => ({ ...f, allocation_date: e.target.value }))} /></div>
              </div>
            )}
            <div className="form-group"><label className="form-label">Remarks</label><textarea className="form-textarea" value={form.remarks ?? ''} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} /></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="hostel-save" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
