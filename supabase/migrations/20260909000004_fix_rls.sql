-- ============================================================
-- College ERP - Migration 004: Fix RLS Policies
-- ============================================================
-- Issues addressed:
--
-- 1. faculty table: Principal only had SELECT (read) access.
--    Per master_prompt Section 4.9 (HR/Payroll), Principal needs
--    full CRUD on faculty records. Adding INSERT, UPDATE, DELETE.
--
-- 2. attendance table: Redundant duplicate INSERT policy alongside
--    the FOR ALL policy. Dropping the redundant one and adding
--    explicit WITH CHECK to the FOR ALL policy.
--
-- 3. exams table: Same redundant pattern as attendance.
--
-- 4. admissions table: student read own only checks student_id but
--    for pre-enrollment applicants student_id is NULL, so they can
--    not see their own application. Fixing to also match by email.
--
-- 5. placement_apps student read own: adding role check for hardening.
--
-- 6. All principal ALL policies: adding explicit WITH CHECK clauses.
--
-- 7. All super_admin ALL policies: adding explicit WITH CHECK clauses.
-- ============================================================

-- ============================================================
-- FIX 1: faculty - give Principal full CRUD (HR management)
-- ============================================================

DROP POLICY IF EXISTS "faculty: principal read" ON faculty;

CREATE POLICY "faculty: principal all" ON faculty
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

-- ============================================================
-- FIX 2: attendance - remove redundant duplicate INSERT policy
-- ============================================================

DROP POLICY IF EXISTS "attendance: faculty insert" ON attendance;

DROP POLICY IF EXISTS "attendance: faculty manage own" ON attendance;
CREATE POLICY "attendance: faculty manage own" ON attendance
  FOR ALL
  USING (get_my_role() = 'faculty' AND marked_by = get_my_faculty_id())
  WITH CHECK (get_my_role() = 'faculty' AND marked_by = get_my_faculty_id());

-- ============================================================
-- FIX 3: exams - remove redundant duplicate INSERT policy
-- ============================================================

DROP POLICY IF EXISTS "exams: faculty insert" ON exams;

DROP POLICY IF EXISTS "exams: faculty manage own" ON exams;
CREATE POLICY "exams: faculty manage own" ON exams
  FOR ALL
  USING (get_my_role() = 'faculty' AND entered_by = get_my_faculty_id())
  WITH CHECK (get_my_role() = 'faculty' AND entered_by = get_my_faculty_id());

-- ============================================================
-- FIX 4: admissions - student can read own record by student_id
-- OR by matching contact_email for pre-enrollment applicants
-- ============================================================

DROP POLICY IF EXISTS "admissions: student read own" ON admissions;

CREATE POLICY "admissions: student read own" ON admissions
  FOR SELECT USING (
    get_my_role() = 'student'
    AND (
      student_id = get_my_student_id()
      OR
      contact_email = (
        SELECT email FROM students WHERE id = get_my_student_id()
      )
    )
  );

-- ============================================================
-- FIX 5: placement_apps student read own - add role check
-- ============================================================

DROP POLICY IF EXISTS "placement_apps: student read own" ON placement_applications;

CREATE POLICY "placement_apps: student read own" ON placement_applications
  FOR SELECT USING (
    get_my_role() = 'student'
    AND student_id = get_my_student_id()
  );

-- ============================================================
-- FIX 6: principal ALL policies - add explicit WITH CHECK clauses
-- ============================================================

DROP POLICY IF EXISTS "admissions: principal all" ON admissions;
CREATE POLICY "admissions: principal all" ON admissions
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

DROP POLICY IF EXISTS "fees: principal all" ON fees;
CREATE POLICY "fees: principal all" ON fees
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

DROP POLICY IF EXISTS "attendance: principal all" ON attendance;
CREATE POLICY "attendance: principal all" ON attendance
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

DROP POLICY IF EXISTS "exams: principal all" ON exams;
CREATE POLICY "exams: principal all" ON exams
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

DROP POLICY IF EXISTS "timetable: principal all" ON timetable;
CREATE POLICY "timetable: principal all" ON timetable
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

DROP POLICY IF EXISTS "books: principal all" ON books;
CREATE POLICY "books: principal all" ON books
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

DROP POLICY IF EXISTS "library_issues: principal all" ON library_issues;
CREATE POLICY "library_issues: principal all" ON library_issues
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

DROP POLICY IF EXISTS "hostel: principal all" ON hostel_allocations;
CREATE POLICY "hostel: principal all" ON hostel_allocations
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

DROP POLICY IF EXISTS "transport: principal all" ON transport_assignments;
CREATE POLICY "transport: principal all" ON transport_assignments
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

DROP POLICY IF EXISTS "payroll: principal all" ON payroll;
CREATE POLICY "payroll: principal all" ON payroll
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

DROP POLICY IF EXISTS "placements: principal all" ON placements;
CREATE POLICY "placements: principal all" ON placements
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

DROP POLICY IF EXISTS "placement_apps: principal all" ON placement_applications;
CREATE POLICY "placement_apps: principal all" ON placement_applications
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

DROP POLICY IF EXISTS "notices: principal all" ON notices;
CREATE POLICY "notices: principal all" ON notices
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

DROP POLICY IF EXISTS "staff: principal all" ON staff;
CREATE POLICY "staff: principal all" ON staff
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

DROP POLICY IF EXISTS "students: principal all" ON students;
CREATE POLICY "students: principal all" ON students
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

DROP POLICY IF EXISTS "subjects: principal write" ON subjects;
CREATE POLICY "subjects: principal write" ON subjects
  FOR ALL
  USING (get_my_role() = 'principal')
  WITH CHECK (get_my_role() = 'principal');

-- ============================================================
-- FIX 7: super_admin ALL policies - add explicit WITH CHECK
-- ============================================================

DROP POLICY IF EXISTS "profiles: super_admin insert" ON profiles;
CREATE POLICY "profiles: super_admin insert" ON profiles
  FOR INSERT
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "profiles: super_admin update" ON profiles;
CREATE POLICY "profiles: super_admin update" ON profiles
  FOR UPDATE
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "departments: super_admin write" ON departments;
CREATE POLICY "departments: super_admin write" ON departments
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "courses: super_admin write" ON courses;
CREATE POLICY "courses: super_admin write" ON courses
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "sections: super_admin write" ON sections;
CREATE POLICY "sections: super_admin write" ON sections
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "subjects: super_admin write" ON subjects;
CREATE POLICY "subjects: super_admin write" ON subjects
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "students: super_admin all" ON students;
CREATE POLICY "students: super_admin all" ON students
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "faculty: super_admin all" ON faculty;
CREATE POLICY "faculty: super_admin all" ON faculty
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "staff: super_admin all" ON staff;
CREATE POLICY "staff: super_admin all" ON staff
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "admissions: super_admin all" ON admissions;
CREATE POLICY "admissions: super_admin all" ON admissions
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "fees: super_admin all" ON fees;
CREATE POLICY "fees: super_admin all" ON fees
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "attendance: super_admin all" ON attendance;
CREATE POLICY "attendance: super_admin all" ON attendance
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "exams: super_admin all" ON exams;
CREATE POLICY "exams: super_admin all" ON exams
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "timetable: super_admin all" ON timetable;
CREATE POLICY "timetable: super_admin all" ON timetable
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "books: super_admin all" ON books;
CREATE POLICY "books: super_admin all" ON books
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "library_issues: super_admin all" ON library_issues;
CREATE POLICY "library_issues: super_admin all" ON library_issues
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "hostel: super_admin all" ON hostel_allocations;
CREATE POLICY "hostel: super_admin all" ON hostel_allocations
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "transport: super_admin all" ON transport_assignments;
CREATE POLICY "transport: super_admin all" ON transport_assignments
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "payroll: super_admin all" ON payroll;
CREATE POLICY "payroll: super_admin all" ON payroll
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "placements: super_admin all" ON placements;
CREATE POLICY "placements: super_admin all" ON placements
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "placement_apps: super_admin all" ON placement_applications;
CREATE POLICY "placement_apps: super_admin all" ON placement_applications
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

DROP POLICY IF EXISTS "notices: super_admin all" ON notices;
CREATE POLICY "notices: super_admin all" ON notices
  FOR ALL
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');
