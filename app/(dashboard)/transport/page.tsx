'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import type { Transport, Student } from '@/lib/types/database.types'

export default function TransportPage() {
  const { role, profile } = useUser()
  const supabase = createClient()

  const [records, setRecords] = useState<Transport[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Transport | null>(null)
  const [form, setForm] = useState<Partial<Transport>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [role])

  async function loadData() {
    setLoading(true)
    let query = supabase
      .from('transport_assignments')
      .select('*, students(name, email)')
      .order('created_at', { ascending: false })

    if (role === 'student' && profile?.student_id) {
      query = query.eq('student_id', profile.student_id)
    }

    const [tRes, sRes] = await Promise.all([
      query,
      (role !== 'student')
        ? supabase.from('students').select('id, name').eq('status', 'active').limit(200)
        : Promise.resolve({ data: [] }),
    ])
    setRecords((tRes.data ?? []) as Transport[])
    setStudents((sRes.data ?? []) as Student[])
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload = {
      student_id: role === 'student' ? profile?.student_id : form.student_id,
      route_name: form.route_name,
      pickup_point: form.pickup_point || null,
      vehicle_number: form.vehicle_number || null,
      driver_name: form.driver_name || null,
      status: role === 'student' ? 'requested' : (form.status ?? 'active'),
    }
    const res = editing
      ? await supabase.from('transport_assignments').update(payload).eq('id', editing.id)
      : await supabase.from('transport_assignments').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setShowModal(false)
    loadData()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this transport record?')) return
    await supabase.from('transport_assignments').delete().eq('id', id)
    loadData()
  }

  const canWrite = role === 'principal' || role === 'super_admin'
  if (loading) return <div className="loading">Loading transport…</div>

  return (
    <>
      <PageHeader
        title="Transport"
        subtitle="Route and vehicle assignments (static records — no live GPS)"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {role === 'student' && (
              <button id="transport-request" className="btn btn-secondary" onClick={() => { setEditing(null); setForm({ status: 'requested' }); setShowModal(true); setError(null) }}>
                Request route change
              </button>
            )}
            {canWrite && (
              <button id="transport-new" className="btn btn-primary" onClick={() => { setEditing(null); setForm({ status: 'active' }); setShowModal(true); setError(null) }}>
                Assign route
              </button>
            )}
          </div>
        }
      />

      <div className="panel">
        <div className="table-wrapper">
          {records.length === 0 ? (
            <div className="empty-state">No transport assignments found.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Route</th>
                  <th>Pickup point</th>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Status</th>
                  {canWrite && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{(r as any).students?.name ?? '—'}</td>
                    <td className="text-sm">{r.route_name}</td>
                    <td className="text-sm">{r.pickup_point ?? '—'}</td>
                    <td className="text-sm text-muted">{r.vehicle_number ?? '—'}</td>
                    <td className="text-sm text-muted">{r.driver_name ?? '—'}</td>
                    <td><span className={`status ${r.status === 'active' ? 'status-green' : r.status === 'requested' ? 'status-brass' : 'status-muted'}`}>{r.status}</span></td>
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
              <h2 className="modal-title">{editing ? 'Edit assignment' : role === 'student' ? 'Route change request' : 'Assign route'}</h2>
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
            <div className="form-group"><label className="form-label">Route name *</label><input className="form-input" value={form.route_name ?? ''} onChange={e => setForm(f => ({ ...f, route_name: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Pickup point</label><input className="form-input" value={form.pickup_point ?? ''} onChange={e => setForm(f => ({ ...f, pickup_point: e.target.value }))} /></div>
            {canWrite && <>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Vehicle number</label><input className="form-input" value={form.vehicle_number ?? ''} onChange={e => setForm(f => ({ ...f, vehicle_number: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Driver name</label><input className="form-input" value={form.driver_name ?? ''} onChange={e => setForm(f => ({ ...f, driver_name: e.target.value }))} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status ?? 'active'} onChange={e => setForm(f => ({ ...f, status: e.target.value as Transport['status'] }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="requested">Requested</option>
                </select>
              </div>
            </>}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="transport-save" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
