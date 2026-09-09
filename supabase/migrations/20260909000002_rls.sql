-- ============================================================
-- College ERP — Migration 002: Row Level Security Policies
-- ============================================================

-- Helper function: get current user's role from profiles
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper function: get current user's student_id
CREATE OR REPLACE FUNCTION get_my_student_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT student_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper function: get current user's faculty_id
CREATE OR REPLACE FUNCTION get_my_faculty_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT faculty_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- Enable RLS on all tables
-- ============================================================

ALTER TABLE departments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections               ENABLE ROW LEVEL SECURITY;
ALTER TABLE students               ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty                ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects               ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE fees                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance             ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable              ENABLE ROW LEVEL SECURITY;
ALTER TABLE books                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_issues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE hostel_allocations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_assignments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll                ENABLE ROW LEVEL SECURITY;
ALTER TABLE placements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices                ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================

-- Everyone can read their own profile
CREATE POLICY "profiles: read own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Super Admin can read all profiles
CREATE POLICY "profiles: super_admin read all" ON profiles
  FOR SELECT USING (get_my_role() = 'super_admin');

-- Super Admin manages profiles
CREATE POLICY "profiles: super_admin insert" ON profiles
  FOR INSERT WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "profiles: super_admin update" ON profiles
  FOR UPDATE USING (get_my_role() = 'super_admin');

CREATE POLICY "profiles: super_admin delete" ON profiles
  FOR DELETE USING (get_my_role() = 'super_admin');

-- ============================================================
-- DEPARTMENTS, COURSES, SECTIONS — structural data
-- ============================================================

-- Everyone authenticated can read structural data
CREATE POLICY "departments: all read" ON departments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "departments: super_admin write" ON departments
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "courses: all read" ON courses
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "courses: super_admin write" ON courses
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "sections: all read" ON sections
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "sections: super_admin write" ON sections
  FOR ALL USING (get_my_role() = 'super_admin');

-- ============================================================
-- SUBJECTS
-- ============================================================

CREATE POLICY "subjects: all read" ON subjects
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "subjects: super_admin write" ON subjects
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "subjects: principal write" ON subjects
  FOR ALL USING (get_my_role() = 'principal');

-- ============================================================
-- STUDENTS
-- ============================================================

-- Super Admin full access
CREATE POLICY "students: super_admin all" ON students
  FOR ALL USING (get_my_role() = 'super_admin');

-- Principal full access
CREATE POLICY "students: principal all" ON students
  FOR ALL USING (get_my_role() = 'principal');

-- Faculty can read students (for their classes — simplified to all students)
CREATE POLICY "students: faculty read" ON students
  FOR SELECT USING (get_my_role() = 'faculty');

-- Student can read own record
CREATE POLICY "students: student read own" ON students
  FOR SELECT USING (id = get_my_student_id());

-- ============================================================
-- FACULTY
-- ============================================================

CREATE POLICY "faculty: super_admin all" ON faculty
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "faculty: principal read" ON faculty
  FOR SELECT USING (get_my_role() = 'principal');

CREATE POLICY "faculty: faculty read own" ON faculty
  FOR SELECT USING (id = get_my_faculty_id());

-- ============================================================
-- STAFF
-- ============================================================

CREATE POLICY "staff: super_admin all" ON staff
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "staff: principal all" ON staff
  FOR ALL USING (get_my_role() = 'principal');

-- ============================================================
-- ADMISSIONS
-- ============================================================

CREATE POLICY "admissions: super_admin all" ON admissions
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "admissions: principal all" ON admissions
  FOR ALL USING (get_my_role() = 'principal');

-- Student can view their own admission record (matched by email or student_id)
CREATE POLICY "admissions: student read own" ON admissions
  FOR SELECT USING (student_id = get_my_student_id());

-- ============================================================
-- FEES
-- ============================================================

CREATE POLICY "fees: super_admin all" ON fees
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "fees: principal all" ON fees
  FOR ALL USING (get_my_role() = 'principal');

CREATE POLICY "fees: student read own" ON fees
  FOR SELECT USING (student_id = get_my_student_id());

-- ============================================================
-- ATTENDANCE
-- ============================================================

CREATE POLICY "attendance: super_admin all" ON attendance
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "attendance: principal all" ON attendance
  FOR ALL USING (get_my_role() = 'principal');

-- Faculty can CRUD attendance they marked
CREATE POLICY "attendance: faculty manage own" ON attendance
  FOR ALL USING (get_my_role() = 'faculty' AND marked_by = get_my_faculty_id());

-- Faculty can insert attendance (marked_by will be their id)
CREATE POLICY "attendance: faculty insert" ON attendance
  FOR INSERT WITH CHECK (
    get_my_role() = 'faculty' AND marked_by = get_my_faculty_id()
  );

-- Student reads own attendance
CREATE POLICY "attendance: student read own" ON attendance
  FOR SELECT USING (student_id = get_my_student_id());

-- ============================================================
-- EXAMS
-- ============================================================

CREATE POLICY "exams: super_admin all" ON exams
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "exams: principal all" ON exams
  FOR ALL USING (get_my_role() = 'principal');

-- Faculty can CRUD exams they entered
CREATE POLICY "exams: faculty manage own" ON exams
  FOR ALL USING (get_my_role() = 'faculty' AND entered_by = get_my_faculty_id());

CREATE POLICY "exams: faculty insert" ON exams
  FOR INSERT WITH CHECK (
    get_my_role() = 'faculty' AND entered_by = get_my_faculty_id()
  );

-- Student reads own grades
CREATE POLICY "exams: student read own" ON exams
  FOR SELECT USING (student_id = get_my_student_id());

-- ============================================================
-- TIMETABLE
-- ============================================================

CREATE POLICY "timetable: super_admin all" ON timetable
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "timetable: principal all" ON timetable
  FOR ALL USING (get_my_role() = 'principal');

-- Faculty reads their own schedule
CREATE POLICY "timetable: faculty read own" ON timetable
  FOR SELECT USING (get_my_role() = 'faculty' AND faculty_id = get_my_faculty_id());

-- Student reads their section's timetable
CREATE POLICY "timetable: student read own section" ON timetable
  FOR SELECT USING (
    get_my_role() = 'student' AND
    section_id = (SELECT section_id FROM students WHERE id = get_my_student_id())
  );

-- ============================================================
-- BOOKS (Library catalog)
-- ============================================================

-- All authenticated users can view books
CREATE POLICY "books: all read" ON books
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "books: super_admin all" ON books
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "books: principal all" ON books
  FOR ALL USING (get_my_role() = 'principal');

-- ============================================================
-- LIBRARY ISSUES
-- ============================================================

CREATE POLICY "library_issues: super_admin all" ON library_issues
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "library_issues: principal all" ON library_issues
  FOR ALL USING (get_my_role() = 'principal');

-- Student reads own issues
CREATE POLICY "library_issues: student read own" ON library_issues
  FOR SELECT USING (
    get_my_role() = 'student' AND
    borrower_type = 'student' AND
    borrower_id = get_my_student_id()
  );

-- Student can insert a borrow request
CREATE POLICY "library_issues: student insert request" ON library_issues
  FOR INSERT WITH CHECK (
    get_my_role() = 'student' AND
    borrower_type = 'student' AND
    borrower_id = get_my_student_id()
  );

-- Faculty reads their own issues
CREATE POLICY "library_issues: faculty read own" ON library_issues
  FOR SELECT USING (
    get_my_role() = 'faculty' AND
    borrower_type = 'faculty' AND
    borrower_id = get_my_faculty_id()
  );

-- ============================================================
-- HOSTEL ALLOCATIONS
-- ============================================================

CREATE POLICY "hostel: super_admin all" ON hostel_allocations
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "hostel: principal all" ON hostel_allocations
  FOR ALL USING (get_my_role() = 'principal');

-- Student reads own allocation
CREATE POLICY "hostel: student read own" ON hostel_allocations
  FOR SELECT USING (student_id = get_my_student_id());

-- Student can insert a request
CREATE POLICY "hostel: student insert request" ON hostel_allocations
  FOR INSERT WITH CHECK (
    get_my_role() = 'student' AND
    student_id = get_my_student_id() AND
    status = 'requested'
  );

-- ============================================================
-- TRANSPORT ASSIGNMENTS
-- ============================================================

CREATE POLICY "transport: super_admin all" ON transport_assignments
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "transport: principal all" ON transport_assignments
  FOR ALL USING (get_my_role() = 'principal');

CREATE POLICY "transport: student read own" ON transport_assignments
  FOR SELECT USING (student_id = get_my_student_id());

CREATE POLICY "transport: student insert request" ON transport_assignments
  FOR INSERT WITH CHECK (
    get_my_role() = 'student' AND
    student_id = get_my_student_id() AND
    status = 'requested'
  );

-- ============================================================
-- PAYROLL
-- ============================================================

CREATE POLICY "payroll: super_admin all" ON payroll
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "payroll: principal all" ON payroll
  FOR ALL USING (get_my_role() = 'principal');

-- Faculty reads own payroll (staff_type = 'faculty', person_id = their faculty id)
CREATE POLICY "payroll: faculty read own" ON payroll
  FOR SELECT USING (
    get_my_role() = 'faculty' AND
    staff_type = 'faculty' AND
    person_id = get_my_faculty_id()
  );

-- ============================================================
-- PLACEMENTS
-- ============================================================

CREATE POLICY "placements: super_admin all" ON placements
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "placements: principal all" ON placements
  FOR ALL USING (get_my_role() = 'principal');

-- Students can view open placements
CREATE POLICY "placements: student read open" ON placements
  FOR SELECT USING (get_my_role() = 'student');

-- ============================================================
-- PLACEMENT APPLICATIONS
-- ============================================================

CREATE POLICY "placement_apps: super_admin all" ON placement_applications
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "placement_apps: principal all" ON placement_applications
  FOR ALL USING (get_my_role() = 'principal');

-- Student reads own applications
CREATE POLICY "placement_apps: student read own" ON placement_applications
  FOR SELECT USING (student_id = get_my_student_id());

-- Student can apply
CREATE POLICY "placement_apps: student insert" ON placement_applications
  FOR INSERT WITH CHECK (
    get_my_role() = 'student' AND
    student_id = get_my_student_id()
  );

-- ============================================================
-- NOTICES
-- ============================================================

CREATE POLICY "notices: super_admin all" ON notices
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "notices: principal all" ON notices
  FOR ALL USING (get_my_role() = 'principal');

-- Faculty reads notices targeted to all or departments
CREATE POLICY "notices: faculty read" ON notices
  FOR SELECT USING (
    get_my_role() = 'faculty' AND
    (target_audience = 'all' OR
     (target_audience = 'department' AND target_id = (
       SELECT department_id FROM faculty WHERE id = get_my_faculty_id()
     )))
  );

-- Student reads notices targeted to all, their department, or their section
CREATE POLICY "notices: student read" ON notices
  FOR SELECT USING (
    get_my_role() = 'student' AND
    (target_audience = 'all' OR
     (target_audience = 'department' AND target_id = (
       SELECT department_id FROM students WHERE id = get_my_student_id()
     )) OR
     (target_audience = 'section' AND target_id = (
       SELECT section_id FROM students WHERE id = get_my_student_id()
     )))
  );
