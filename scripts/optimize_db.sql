-- ============================================================
-- College ERP — Live Optimization SQL
-- Run via: supabase db execute --file scripts/optimize_db.sql
-- Safe to re-run (all indexes use IF NOT EXISTS)
-- ============================================================

-- ── 1. Analyze all major tables (refreshes planner statistics) ──
ANALYZE profiles;
ANALYZE students;
ANALYZE faculty;
ANALYZE staff;
ANALYZE attendance;
ANALYZE exams;
ANALYZE fees;
ANALYZE admissions;
ANALYZE timetable;
ANALYZE notices;
ANALYZE placements;
ANALYZE placement_applications;
ANALYZE library_issues;
ANALYZE hostel_allocations;
ANALYZE transport_assignments;
ANALYZE payroll;

-- ── 2. Composite indexes not in migration 006 ────────────────────

-- Attendance: per-student per-date (most common UI filter)
CREATE INDEX IF NOT EXISTS idx_att_student_date
  ON attendance(student_id, date DESC);

-- Exams: grade history per student
CREATE INDEX IF NOT EXISTS idx_exams_student_date
  ON exams(student_id, exam_date DESC);

-- Fees: defaulter/unpaid dashboard filter (partial index — tiny, fast)
CREATE INDEX IF NOT EXISTS idx_fees_student_balance
  ON fees(student_id, balance)
  WHERE balance > 0;

-- Notices: dashboard loads newest notices per target audience
CREATE INDEX IF NOT EXISTS idx_notices_audience_date
  ON notices(target_audience, post_date DESC);

-- Profiles: composite (id, role) — used in get_my_role() RLS checks
CREATE INDEX IF NOT EXISTS idx_profiles_id_role
  ON profiles(id, role);

-- ── 3. Ensure all demo users have email confirmed ────────────────
UPDATE auth.users
SET    email_confirmed_at = NOW(),
       updated_at         = NOW()
WHERE  email LIKE '%@demo.com'
  AND  email_confirmed_at IS NULL;

-- ── 4. Backfill missing profile rows for any demo auth.users ─────
INSERT INTO profiles (id, role)
SELECT
  u.id,
  CASE
    WHEN u.email LIKE 'principal%' THEN 'principal'
    WHEN u.email LIKE 'teacher%'   THEN 'faculty'
    WHEN u.email LIKE 'student%'   THEN 'student'
    ELSE 'student'
  END::user_role
FROM auth.users u
WHERE u.email LIKE '%@demo.com'
ON CONFLICT (id) DO NOTHING;

-- ── 5. Verify demo user status (output for confirmation) ─────────
SELECT
  u.email,
  u.email_confirmed_at IS NOT NULL  AS confirmed,
  p.role
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE u.email LIKE '%@demo.com'
ORDER BY u.email;
