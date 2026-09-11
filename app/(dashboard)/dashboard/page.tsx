'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'

// Types for view data
interface FeeSummary { total_due: number; total_paid: number; total_balance: number; defaulter_count: number }
interface StructureOverview { department_count: number; course_count: number; section_count: number; active_students: number; active_faculty: number; active_staff: number }
interface StudentStats { attendance_pct: number | null; total_balance: number | null }

export default function DashboardPage() {
  const { role, profile, loading } = useUser()
  const supabase = createClient()

  const [feeSummary, setFeeSummary] = useState<FeeSummary | null>(null)
  const [structure, setStructure] = useState<StructureOverview | null>(null)
  const [studentStats, setStudentStats] = useState<StudentStats | null>(null)
  const [recentNotices, setRecentNotices] = useState<Array<{ id: string; title: string; post_date: string }>>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!role) return
    loadData()
  }, [role, profile])

  async function loadData() {
    setDataLoading(true)

    // Fire all queries in parallel based on role
    const noticePromise = supabase
      .from('notices')
      .select('id, title, post_date')
      .order('post_date', { ascending: false })
      .limit(5)

    if (role === 'principal' || role === 'super_admin') {
      const [feeRes, structRes, noticeRes] = await Promise.all([
        supabase.from('v_fee_summary').select('*').single(),
        supabase.from('v_structure_overview').select('*').single(),
        noticePromise,
      ])
      setFeeSummary(feeRes.data as FeeSummary)
      setStructure(structRes.data as StructureOverview)
      setRecentNotices(noticeRes.data ?? [])
    } else if (role === 'student' && profile?.student_id) {
      const [attRes, feeRes, noticeRes] = await Promise.all([
        supabase.from('v_student_attendance_summary').select('*').eq('student_id', profile.student_id).single(),
        supabase.from('v_student_fee_summary').select('*').eq('student_id', profile.student_id).single(),
        noticePromise,
      ])
      setStudentStats({
        attendance_pct: attRes.data?.attendance_pct ?? null,
        total_balance: feeRes.data?.total_balance ?? null,
      })
      setRecentNotices(noticeRes.data ?? [])
    } else {
      // Faculty and other roles — just load notices
      const { data: noticeData } = await noticePromise
      setRecentNotices(noticeData ?? [])
    }

    setDataLoading(false)
  }

  // Show page shell immediately; let data sections render progressively
  if (loading) {
    return <div className="loading">Loading dashboard…</div>
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={role ? `Welcome back — ${role.replace('_', ' ')} view` : ''}
      />

      {/* Principal / Super Admin — full stats */}
      {(role === 'principal' || role === 'super_admin') && structure && (
        <>
          <div className="stats-grid" style={{ marginBottom: 32 }}>
            <div className="stat-cell">
              <div className="stat-value">{structure.active_students}</div>
              <div className="stat-label">Active students</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value">{structure.active_faculty}</div>
              <div className="stat-label">Faculty members</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value">{structure.active_staff}</div>
              <div className="stat-label">Staff members</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value">{structure.department_count}</div>
              <div className="stat-label">Departments</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value">{structure.course_count}</div>
              <div className="stat-label">Courses</div>
            </div>
            <div className="stat-cell">
              <div className="stat-value">{structure.section_count}</div>
              <div className="stat-label">Sections</div>
            </div>
          </div>

          {role === 'principal' && feeSummary && (
            <div className="panel" style={{ marginBottom: 24 }}>
              <div className="panel-header">
                <h2 className="panel-title">Fee overview</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 24 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 300 }}>
                    ₹{Number(feeSummary.total_paid ?? 0).toLocaleString()}
                  </div>
                  <div className="stat-label">Total collected</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 300, color: 'var(--bordeaux)' }}>
                    ₹{Number(feeSummary.total_balance ?? 0).toLocaleString()}
                  </div>
                  <div className="stat-label">Outstanding balance</div>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 300, color: 'var(--bordeaux)' }}>
                    {feeSummary.defaulter_count ?? 0}
                  </div>
                  <div className="stat-label">Fee defaulters</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Student dashboard */}
      {role === 'student' && studentStats && (
        <div className="stats-grid" style={{ marginBottom: 32 }}>
          <div className="stat-cell">
            <div className="stat-value">{studentStats.attendance_pct ?? '—'}%</div>
            <div className="stat-label">Attendance</div>
          </div>
          <div className="stat-cell">
            <div className="stat-value" style={{ color: studentStats.total_balance && studentStats.total_balance > 0 ? 'var(--bordeaux)' : 'var(--sage)' }}>
              ₹{Number(studentStats.total_balance ?? 0).toLocaleString()}
            </div>
            <div className="stat-label">Fee balance due</div>
          </div>
        </div>
      )}

      {/* Faculty dashboard */}
      {role === 'faculty' && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <p className="text-muted text-sm">
            Your attendance and grade summaries are available in the Attendance and Exams modules.
          </p>
        </div>
      )}

      {/* Recent notices */}
      {recentNotices.length > 0 && (
        <div className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Recent notices</h2>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentNotices.map(notice => (
                  <tr key={notice.id}>
                    <td>{notice.title}</td>
                    <td className="text-muted text-sm">{notice.post_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recentNotices.length === 0 && (
        <div className="panel">
          <div className="empty-state">No recent notices.</div>
        </div>
      )}
    </>
  )
}
