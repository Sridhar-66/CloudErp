'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import type { Role } from '@/lib/types/database.types'

interface NavItem {
  label: string
  href: string
  roles: Role[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    href: '/dashboard',   roles: ['super_admin', 'principal', 'faculty', 'student'] },
  { label: 'Admissions',   href: '/admissions',  roles: ['principal', 'super_admin'] },
  { label: 'Fees',         href: '/fees',         roles: ['principal', 'super_admin', 'student'] },
  { label: 'Attendance',   href: '/attendance',  roles: ['principal', 'faculty', 'student'] },
  { label: 'Exams',        href: '/exams',        roles: ['principal', 'faculty', 'student'] },
  { label: 'Timetable',   href: '/timetable',   roles: ['principal', 'faculty', 'student'] },
  { label: 'Library',     href: '/library',      roles: ['principal', 'super_admin', 'student'] },
  { label: 'Hostel',       href: '/hostel',       roles: ['principal', 'super_admin', 'student'] },
  { label: 'Transport',   href: '/transport',    roles: ['principal', 'super_admin', 'student'] },
  { label: 'HR & Payroll', href: '/hr-payroll',  roles: ['principal', 'super_admin', 'faculty'] },
  { label: 'Placements',  href: '/placements',   roles: ['principal', 'super_admin', 'student'] },
  { label: 'Notices',     href: '/notices',      roles: ['principal', 'faculty', 'student'] },
  { label: 'Users',        href: '/users',        roles: ['super_admin'] },
]

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'IT Administrator',
  principal: 'Principal',
  faculty: 'Faculty',
  student: 'Student',
}

export default function Sidebar() {
  const pathname = usePathname()
  const { user, profile, role, signOut } = useUser()

  const visibleItems = role
    ? NAV_ITEMS.filter(item => item.roles.includes(role))
    : []

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-wordmark">COLLEGE ERP</span>
        <span className="sidebar-brand-sub">Academic Portal</span>
      </div>

      <div className="sidebar-nav">
        {visibleItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-nav-item${pathname === item.href || pathname.startsWith(item.href + '/') ? ' active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user-name">{user?.email?.split('@')[0] ?? '—'}</div>
        <div className="sidebar-user-role">{role ? ROLE_LABELS[role] : '—'}</div>
        <button
          id="sidebar-logout"
          className="btn btn-secondary btn-sm"
          onClick={signOut}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
