'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import type { Placement, PlacementApplication } from '@/lib/types/database.types'

const APP_STATUS_CLASS: Record<string, string> = {
  applied: 'status-brass', shortlisted: 'status-brass',
  selected: 'status-green', rejected: 'status-red',
}

export default function PlacementsPage() {
  const { role, profile } = useUser()
  const supabase = createClient()

  const [placements, setPlacements] = useState<Placement[]>([])
  const [myApps, setMyApps] = useState<PlacementApplication[]>([])
  const [allApps, setAllApps] = useState<PlacementApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Placement | null>(null)
  const [form, setForm] = useState<Partial<Placement>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'opportunities' | 'applications'>('opportunities')

  useEffect(() => { loadData() }, [role])

  async function loadData() {
    setLoading(true)
    const [plRes, appRes] = await Promise.all([
      supabase.from('placements').select('*').order('created_at', { ascending: false }),
      role === 'student' && profile?.student_id
        ? supabase.from('placement_applications').select('*, placements(company_name, role)').eq('student_id', profile.student_id)
        : (role === 'principal' || role === 'super_admin')
          ? supabase.from('placement_applications').select('*, placements(company_name, role), students(name)').order('applied_at', { ascending: false })
          : Promise.resolve({ data: [] }),
    ])
    setPlacements((plRes.data ?? []) as Placement[])
    if (role === 'student') setMyApps((appRes.data ?? []) as PlacementApplication[])
    else setAllApps((appRes.data ?? []) as PlacementApplication[])
    setLoading(false)
  }

  async function handleApply(placementId: string) {
    if (!profile?.student_id) return
    setSaving(true)
    const { error } = await supabase.from('placement_applications').insert({
      placement_id: placementId,
      student_id: profile.student_id,
      status: 'applied',
    })
    setSaving(false)
    if (error) alert(error.message)
    else loadData()
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const payload = {
      company_name: form.company_name,
      role: form.role,
      eligibility_criteria: form.eligibility_criteria || null,
      package_ctc: form.package_ctc || null,
      application_deadline: form.application_deadline || null,
      status: form.status ?? 'open',
    }
    const res = editing
      ? await supabase.from('placements').update(payload).eq('id', editing.id)
      : await supabase.from('placements').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setShowModal(false)
    loadData()
    setSaving(false)
  }

  async function handleUpdateAppStatus(id: string, status: PlacementApplication['status']) {
    await supabase.from('placement_applications').update({ status }).eq('id', id)
    loadData()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this placement?')) return
    await supabase.from('placements').delete().eq('id', id)
    loadData()
  }

  const canWrite = role === 'principal' || role === 'super_admin'
  const appliedIds = new Set(myApps.map(a => a.placement_id))
  if (loading) return <div className="loading">Loading placements…</div>

  return (
    <>
      <PageHeader
        title="Placements"
        subtitle="Company opportunities and application tracking"
        action={canWrite ? (
          <button id="placement-new" className="btn btn-primary" onClick={() => {
            setEditing(null); setForm({ status: 'open' }); setShowModal(true); setError(null)
          }}>Add opportunity</button>
        ) : undefined}
      />

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--line)' }}>
        {(['opportunities', 'applications'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid var(--brass)' : '2px solid transparent', cursor: 'pointer', fontSize: 'var(--text-sm)', color: tab === t ? 'var(--ink)' : 'var(--ink-muted)', fontFamily: 'var(--font-body)' }}>
            {t === 'opportunities' ? 'Opportunities' : 'Applications'}
          </button>
        ))}
      </div>

      {tab === 'opportunities' && (
        <div className="panel">
          <div className="table-wrapper">
            {placements.length === 0 ? <div className="empty-state">No placement opportunities found.</div> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Role</th>
                    <th>Package / CTC</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    {(role === 'student' || canWrite) && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {placements.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.company_name}</td>
                      <td className="text-sm">{p.role}</td>
                      <td className="text-sm">{p.package_ctc ?? '—'}</td>
                      <td className="text-sm text-muted">{p.application_deadline ?? '—'}</td>
                      <td><span className={`status ${p.status === 'open' ? 'status-green' : 'status-muted'}`}>{p.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {role === 'student' && p.status === 'open' && (
                            appliedIds.has(p.id)
                              ? <span className="text-muted text-xs">Applied</span>
                              : <button className="btn btn-primary btn-sm" onClick={() => handleApply(p.id)} disabled={saving}>Apply</button>
                          )}
                          {canWrite && <>
                            <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(p); setForm({ ...p }); setShowModal(true); setError(null) }}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'applications' && (
        <div className="panel">
          <div className="table-wrapper">
            {(role === 'student' ? myApps : allApps).length === 0 ? <div className="empty-state">No applications found.</div> : (
              <table className="data-table">
                <thead>
                  <tr>
                    {canWrite && <th>Student</th>}
                    <th>Company</th>
                    <th>Role</th>
                    <th>Applied on</th>
                    <th>Status</th>
                    {canWrite && <th>Update status</th>}
                  </tr>
                </thead>
                <tbody>
                  {(role === 'student' ? myApps : allApps).map(a => (
                    <tr key={a.id}>
                      {canWrite && <td style={{ fontWeight: 500 }}>{(a as any).students?.name ?? '—'}</td>}
                      <td>{(a as any).placements?.company_name ?? '—'}</td>
                      <td className="text-sm">{(a as any).placements?.role ?? '—'}</td>
                      <td className="text-sm text-muted">{a.applied_at?.slice(0, 10)}</td>
                      <td><span className={`status ${APP_STATUS_CLASS[a.status]}`}>{a.status}</span></td>
                      {canWrite && (
                        <td>
                          <select className="form-select" style={{ width: 140, fontSize: 'var(--text-xs)', padding: '4px 24px 4px 0' }} value={a.status}
                            onChange={e => handleUpdateAppStatus(a.id, e.target.value as PlacementApplication['status'])}>
                            <option value="applied">Applied</option>
                            <option value="shortlisted">Shortlisted</option>
                            <option value="selected">Selected</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit opportunity' : 'New opportunity'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <div className="form-row">
              <div className="form-group"><label className="form-label">Company name *</label><input className="form-input" value={form.company_name ?? ''} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Role / position *</label><input className="form-input" value={form.role ?? ''} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Package / CTC</label><input className="form-input" placeholder="e.g. ₹5 LPA" value={form.package_ctc ?? ''} onChange={e => setForm(f => ({ ...f, package_ctc: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Application deadline</label><input type="date" className="form-input" value={form.application_deadline ?? ''} onChange={e => setForm(f => ({ ...f, application_deadline: e.target.value }))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Eligibility criteria</label><textarea className="form-textarea" value={form.eligibility_criteria ?? ''} onChange={e => setForm(f => ({ ...f, eligibility_criteria: e.target.value }))} /></div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status ?? 'open'} onChange={e => setForm(f => ({ ...f, status: e.target.value as Placement['status'] }))}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="placement-save" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
