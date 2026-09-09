'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import type { Book, LibraryIssue } from '@/lib/types/database.types'

export default function LibraryPage() {
  const { role, profile } = useUser()
  const supabase = createClient()

  const [books, setBooks] = useState<Book[]>([])
  const [issues, setIssues] = useState<LibraryIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'catalog' | 'issues'>('catalog')
  const [showModal, setShowModal] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [bookForm, setBookForm] = useState<Partial<Book>>({})
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [issueForm, setIssueForm] = useState<Partial<LibraryIssue>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadData() }, [role])

  async function loadData() {
    setLoading(true)
    let issueQuery = supabase
      .from('library_issues')
      .select('*, books(title, author)')
      .order('issue_date', { ascending: false })

    if (role === 'student' && profile?.student_id) {
      issueQuery = issueQuery.eq('borrower_id', profile.student_id).eq('borrower_type', 'student')
    }

    const [bookRes, issueRes] = await Promise.all([
      supabase.from('books').select('*').order('title'),
      issueQuery,
    ])

    setBooks((bookRes.data ?? []) as Book[])
    setIssues((issueRes.data ?? []) as LibraryIssue[])
    setLoading(false)
  }

  async function handleSaveBook() {
    setSaving(true)
    setError(null)
    const payload = {
      title: bookForm.title,
      author: bookForm.author,
      isbn: bookForm.isbn || null,
      category: bookForm.category || null,
      total_copies: Number(bookForm.total_copies ?? 1),
      available_copies: Number(bookForm.available_copies ?? 1),
    }
    const res = editingBook
      ? await supabase.from('books').update(payload).eq('id', editingBook.id)
      : await supabase.from('books').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setShowModal(false)
    loadData()
    setSaving(false)
  }

  async function handleIssue() {
    setSaving(true)
    setError(null)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14)
    const payload = {
      book_id: issueForm.book_id,
      borrower_type: role === 'student' ? 'student' : 'faculty',
      borrower_id: role === 'student' ? profile?.student_id : profile?.faculty_id,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: dueDate.toISOString().slice(0, 10),
      status: 'issued',
    }
    const res = await supabase.from('library_issues').insert(payload)
    if (res.error) { setError(res.error.message); setSaving(false); return }
    setShowIssueModal(false)
    loadData()
    setSaving(false)
  }

  async function handleReturn(id: string) {
    await supabase.from('library_issues').update({
      return_date: new Date().toISOString().slice(0, 10),
      status: 'available',
    }).eq('id', id)
    loadData()
  }

  const canManage = role === 'principal' || role === 'super_admin'
  if (loading) return <div className="loading">Loading library…</div>

  return (
    <>
      <PageHeader
        title="Library"
        subtitle="Book catalog and issue/return records"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {(role === 'student' || role === 'faculty') && (
              <button id="library-request" className="btn btn-secondary" onClick={() => { setIssueForm({}); setShowIssueModal(true); setError(null) }}>
                Request book
              </button>
            )}
            {canManage && (
              <button id="library-new-book" className="btn btn-primary" onClick={() => { setEditingBook(null); setBookForm({ total_copies: 1, available_copies: 1 }); setShowModal(true); setError(null) }}>
                Add book
              </button>
            )}
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--line)' }}>
        {(['catalog', 'issues'] as const).map(t => (
          <button
            key={t}
            className={`btn btn-secondary btn-sm`}
            style={{ borderRadius: 0, borderBottom: tab === t ? '2px solid var(--brass)' : '2px solid transparent', borderLeft: 'none', borderRight: 'none', borderTop: 'none', color: tab === t ? 'var(--ink)' : 'var(--ink-muted)' }}
            onClick={() => setTab(t)}
          >
            {t === 'catalog' ? 'Book catalog' : 'Issue / return records'}
          </button>
        ))}
      </div>

      {tab === 'catalog' && (
        <div className="panel">
          <div className="table-wrapper">
            {books.length === 0 ? <div className="empty-state">No books in catalog.</div> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>ISBN</th>
                    <th>Category</th>
                    <th className="num">Total</th>
                    <th className="num">Available</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {books.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 500 }}>{b.title}</td>
                      <td className="text-sm">{b.author}</td>
                      <td className="text-sm text-muted">{b.isbn ?? '—'}</td>
                      <td className="text-sm">{b.category ?? '—'}</td>
                      <td className="num">{b.total_copies}</td>
                      <td className="num" style={{ color: b.available_copies === 0 ? 'var(--bordeaux)' : 'var(--sage)' }}>{b.available_copies}</td>
                      {canManage && (
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setEditingBook(b); setBookForm({ ...b }); setShowModal(true); setError(null) }}>Edit</button>
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

      {tab === 'issues' && (
        <div className="panel">
          <div className="table-wrapper">
            {issues.length === 0 ? <div className="empty-state">No issue records found.</div> : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Issue date</th>
                    <th>Due date</th>
                    <th>Return date</th>
                    <th>Status</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {issues.map(i => (
                    <tr key={i.id}>
                      <td style={{ fontWeight: 500 }}>{(i as any).books?.title ?? '—'}</td>
                      <td className="text-sm">{i.issue_date}</td>
                      <td className="text-sm">{i.due_date}</td>
                      <td className="text-sm text-muted">{i.return_date ?? '—'}</td>
                      <td><span className={`status ${i.status === 'available' ? 'status-green' : i.status === 'overdue' ? 'status-red' : 'status-brass'}`}>{i.status}</span></td>
                      {canManage && !i.return_date && (
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleReturn(i.id)}>Mark returned</button>
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

      {/* Book modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{editingBook ? 'Edit book' : 'Add book'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={bookForm.title ?? ''} onChange={e => setBookForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Author *</label><input className="form-input" value={bookForm.author ?? ''} onChange={e => setBookForm(f => ({ ...f, author: e.target.value }))} /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">ISBN</label><input className="form-input" value={bookForm.isbn ?? ''} onChange={e => setBookForm(f => ({ ...f, isbn: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Category</label><input className="form-input" value={bookForm.category ?? ''} onChange={e => setBookForm(f => ({ ...f, category: e.target.value }))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Total copies</label><input type="number" className="form-input" value={bookForm.total_copies ?? 1} onChange={e => setBookForm(f => ({ ...f, total_copies: Number(e.target.value) }))} /></div>
              <div className="form-group"><label className="form-label">Available copies</label><input type="number" className="form-input" value={bookForm.available_copies ?? 1} onChange={e => setBookForm(f => ({ ...f, available_copies: Number(e.target.value) }))} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button id="library-save" className="btn btn-primary" onClick={handleSaveBook} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Issue request modal */}
      {showIssueModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowIssueModal(false) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Request a book</h2>
              <button className="modal-close" onClick={() => setShowIssueModal(false)}>×</button>
            </div>
            {error && <div className="auth-error">{error}</div>}
            <div className="form-group">
              <label className="form-label">Book *</label>
              <select className="form-select" value={issueForm.book_id ?? ''} onChange={e => setIssueForm(f => ({ ...f, book_id: e.target.value }))}>
                <option value="">Select book</option>
                {books.filter(b => b.available_copies > 0).map(b => <option key={b.id} value={b.id}>{b.title} — {b.author}</option>)}
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowIssueModal(false)}>Cancel</button>
              <button id="library-issue-save" className="btn btn-primary" onClick={handleIssue} disabled={saving}>{saving ? 'Requesting…' : 'Request'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
