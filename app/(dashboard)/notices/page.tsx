'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import type { Notice, Department, Section } from '@/lib/types/database.types'

export default function NoticesPage() {
  const { role, profile, user } = useUser()
  const supabase = createClient()

  const [notices, setNotices] = useState<Notice[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Notice | null>(null)
  const [form, setForm] = useState<Partial<Notice>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { loadData() }, [role])

  async function loadData() {
    setLoading(true)
    const [noticeRes, deptRes, secRes] = await Promise.all([
      supabase.from('notices').select('*').order('post_date', { ascending: false }),
      supabase.from('departments').select('id, name'),
      supabase.from('sections').select('id, name, academic_year'),
    ])
    setNotices((noticeRes.data ?? []) as Notice[])
    setDepartments((deptRes.data ?? []) as Department[])
    setSections((secRes.data ?? []) as Section[])
    setLoading(false)
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setError(null)
    const payload = {
      title: form.title,
      body: form.body,
      posted_by: user.id,
      poster_role: role,
      target_audience: form.target_audience ?? 'all',
      target_id: form.target_audience === 'all' ? null : (form.target_id || null),
      post_date: new Date().toISOString().slice(0, 10),
      expiry_date: form.expiry_date || null,
    }
    const res = editing
      ? await supabase.from('notices').update(payload).eq('id', editing.id)
      : await supabase.from('notices').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setShowModal(false)
    loadData()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this notice?')) return
    await supabase.from('notices').delete().eq('id', id)
    loadData()
  }

  const canWrite = role === 'principal' || role === 'super_admin'
  if (loading) return <div className="loading">Loading notices…</div>

  // Filter out expired notices
  const today = new Date().toISOString().slice(0, 10)
  const activeNotices = notices.filter(n => !n.expiry_date || n.expiry_date >= today)

  return (
    <>
      <PageHeader
        title="Notices"
        subtitle="Announcements and college-wide communications"
        action={canWrite ? (
          <button id="notice-new" className="btn btn-primary" onClick={() => {
            setEditing(null)
            setForm({ target_audience: 'all' })
            setShowModal(true)
            setError(null)
          }}>Post notice</button>
        ) : undefined}
      />

      {activeNotices.length === 0 ? (
        <div className="panel"><div className="empty-state">No active notices.</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--line)', border: '1px solid var(--line)' }}>
          {activeNotices.map(n => (
            <div key={n.id} style={{ background: 'var(--paper)', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, width: '100%' }}
                    onClick={() => setExpanded(expanded === n.id ? null : n.id)}
                  >
                    <div style={{ fontWeight: 500, color: 'var(--ink)', fontSize: 'var(--text-base)', marginBottom: 4 }}>{n.title}</div>
                    <div className="text-xs text-muted">
                      {n.post_date} · {n.target_audience === 'all' ? 'All' : n.target_audience}
                      {n.expiry_date && ` · Expires ${n.expiry_date}`}
                    </div>
                  </button>
                  {expanded === n.id && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)', fontSize: 'var(--text-sm)', color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {n.body}
                    </div>
                  )}
                </div>
                {canWrite && (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(n); setForm({ ...n }); setShowModal(true); setError(null) }}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(n.id)}>Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit notice' : 'Post notice'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Body *</label><textarea className="form-textarea" style={{ minHeight: 120 }} value={form.body ?? ''} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} /></div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Target audience</label>
                <select className="form-select" value={form.target_audience ?? 'all'} onChange={e => setForm(f => ({ ...f, target_audience: e.target.value as Notice['target_audience'], target_id: undefined }))}>
                  <option value="all">All</option>
                  <option value="department">Department</option>
                  <option value="section">Section</option>
                </select>
              </div>
              {form.target_audience === 'department' && (
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select className="form-select" value={form.target_id ?? ''} onChange={e => setForm(f => ({ ...f, target_id: e.target.value }))}>
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              {form.target_audience === 'section' && (
                <div className="form-group">
                  <label className="form-label">Section</label>
                  <select className="form-select" value={form.target_id ?? ''} onChange={e => setForm(f => ({ ...f, target_id: e.target.value }))}>
                    <option value="">Select section</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name} ({s.academic_year})</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="form-group"><label className="form-label">Expiry date (optional)</label><input type="date" className="form-input" value={form.expiry_date ?? ''} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} /></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="notice-save" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Post'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
