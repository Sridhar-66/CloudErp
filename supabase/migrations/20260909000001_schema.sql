-- ============================================================
-- College ERP — Migration 001: Core Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('super_admin', 'principal', 'faculty', 'student');
CREATE TYPE student_status AS ENUM ('active', 'inactive', 'graduated', 'dropped');
CREATE TYPE person_status AS ENUM ('active', 'inactive');
CREATE TYPE admission_status AS ENUM ('applied', 'under_review', 'approved', 'rejected', 'waitlisted');
CREATE TYPE fee_type AS ENUM ('tuition', 'hostel', 'transport', 'exam', 'misc');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late');
CREATE TYPE exam_type AS ENUM ('midterm', 'final', 'assignment', 'quiz');
CREATE TYPE day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');
CREATE TYPE book_status AS ENUM ('available', 'issued', 'overdue');
CREATE TYPE hostel_status AS ENUM ('allocated', 'vacant', 'requested', 'vacated');
CREATE TYPE transport_status AS ENUM ('active', 'inactive', 'requested');
CREATE TYPE payment_status AS ENUM ('paid', 'pending');
CREATE TYPE placement_status AS ENUM ('open', 'closed');
CREATE TYPE application_status AS ENUM ('applied', 'shortlisted', 'selected', 'rejected');
CREATE TYPE notice_audience AS ENUM ('all', 'department', 'section');
CREATE TYPE borrower_type AS ENUM ('student', 'faculty');
CREATE TYPE staff_type AS ENUM ('faculty', 'staff');

-- ============================================================
-- STRUCTURAL TABLES
-- ============================================================

CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  code            TEXT NOT NULL UNIQUE,
  duration_years  INTEGER NOT NULL DEFAULT 3,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       UUID REFERENCES courses(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  academic_year   TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PEOPLE TABLES
-- ============================================================

CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  dob             DATE,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT,
  address         TEXT,
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  course_id       UUID REFERENCES courses(id) ON DELETE SET NULL,
  section_id      UUID REFERENCES sections(id) ON DELETE SET NULL,
  enrollment_date DATE,
  status          student_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE faculty (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT,
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  designation     TEXT,
  joining_date    DATE,
  status          person_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE staff (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  phone           TEXT,
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  designation     TEXT,
  joining_date    DATE,
  status          person_status NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subjects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  code            TEXT NOT NULL UNIQUE,
  course_id       UUID REFERENCES courses(id) ON DELETE SET NULL,
  faculty_id      UUID REFERENCES faculty(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PROFILES — maps auth.users → role + entity
-- ============================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL,
  student_id  UUID REFERENCES students(id) ON DELETE SET NULL,
  faculty_id  UUID REFERENCES faculty(id) ON DELETE SET NULL,
  staff_id    UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MODULE TABLES
-- ============================================================

-- 4.1 Admissions
CREATE TABLE admissions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_name        TEXT NOT NULL,
  dob                   DATE,
  contact_email         TEXT NOT NULL,
  contact_phone         TEXT,
  previous_institution  TEXT,
  course_id             UUID REFERENCES courses(id) ON DELETE SET NULL,
  department_id         UUID REFERENCES departments(id) ON DELETE SET NULL,
  status                admission_status NOT NULL DEFAULT 'applied',
  admission_date        DATE,
  remarks               TEXT,
  student_id            UUID REFERENCES students(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.2 Fees
CREATE TABLE fees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_type        fee_type NOT NULL,
  total_due       NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance         NUMERIC(12,2) GENERATED ALWAYS AS (total_due - amount_paid) STORED,
  payment_date    DATE,
  payment_mode    TEXT NOT NULL DEFAULT 'cash',
  receipt_number  TEXT,
  remarks         TEXT,
  academic_year   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.3 Attendance
CREATE TABLE attendance (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  section_id  UUID REFERENCES sections(id) ON DELETE SET NULL,
  subject_id  UUID REFERENCES subjects(id) ON DELETE SET NULL,
  date        DATE NOT NULL,
  status      attendance_status NOT NULL,
  marked_by   UUID REFERENCES faculty(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, subject_id, date)
);

-- 4.4 Exams / Grades
CREATE TABLE exams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id      UUID REFERENCES subjects(id) ON DELETE SET NULL,
  exam_type       exam_type NOT NULL,
  marks_obtained  NUMERIC(6,2) NOT NULL,
  max_marks       NUMERIC(6,2) NOT NULL DEFAULT 100,
  grade           TEXT,
  remarks         TEXT,
  entered_by      UUID REFERENCES faculty(id) ON DELETE SET NULL,
  exam_date       DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.5 Timetable
CREATE TABLE timetable (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  section_id      UUID REFERENCES sections(id) ON DELETE SET NULL,
  day_of_week     day_of_week NOT NULL,
  period_number   INTEGER NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  subject_id      UUID REFERENCES subjects(id) ON DELETE SET NULL,
  faculty_id      UUID REFERENCES faculty(id) ON DELETE SET NULL,
  room            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.6 Library — Books catalog
CREATE TABLE books (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  author            TEXT NOT NULL,
  isbn              TEXT UNIQUE,
  category          TEXT,
  total_copies      INTEGER NOT NULL DEFAULT 1,
  available_copies  INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT copies_check CHECK (available_copies >= 0 AND available_copies <= total_copies)
);

-- 4.6 Library — Issue/Return records
CREATE TABLE library_issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id         UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  borrower_type   borrower_type NOT NULL,
  borrower_id     UUID NOT NULL,
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE NOT NULL,
  return_date     DATE,
  status          book_status NOT NULL DEFAULT 'issued',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.7 Hostel
CREATE TABLE hostel_allocations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  block             TEXT NOT NULL,
  room_number       TEXT NOT NULL,
  allocation_date   DATE,
  status            hostel_status NOT NULL DEFAULT 'requested',
  remarks           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.8 Transport
CREATE TABLE transport_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  route_name      TEXT NOT NULL,
  pickup_point    TEXT,
  vehicle_number  TEXT,
  driver_name     TEXT,
  status          transport_status NOT NULL DEFAULT 'requested',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4.9 HR / Payroll
CREATE TABLE payroll (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_type      staff_type NOT NULL,
  person_id       UUID NOT NULL,
  month           INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year            INTEGER NOT NULL,
  base_salary     NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions      NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_pay         NUMERIC(12,2) GENERATED ALWAYS AS (base_salary - deductions) STORED,
  payment_status  payment_status NOT NULL DEFAULT 'pending',
  payment_date    DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_type, person_id, month, year)
);

-- 4.10 Placements
CREATE TABLE placements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name          TEXT NOT NULL,
  role                  TEXT NOT NULL,
  eligibility_criteria  TEXT,
  package_ctc           TEXT,
  application_deadline  DATE,
  status                placement_status NOT NULL DEFAULT 'open',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE placement_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placement_id    UUID NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status          application_status NOT NULL DEFAULT 'applied',
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (placement_id, student_id)
);

-- 4.11 Notices
CREATE TABLE notices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  posted_by         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  poster_role       user_role NOT NULL,
  target_audience   notice_audience NOT NULL DEFAULT 'all',
  target_id         UUID,
  post_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date       DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'departments','courses','sections','students','faculty','staff',
      'subjects','profiles','admissions','fees','attendance','exams',
      'timetable','books','library_issues','hostel_allocations',
      'transport_assignments','payroll','placements','placement_applications','notices'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      tbl, tbl
    );
  END LOOP;
END
$$;

-- ============================================================
-- AUTO-CREATE PROFILE ON USER SIGN-UP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert profile if role metadata is provided (Super Admin provisions users)
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    INSERT INTO public.profiles (id, role)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'role')::user_role
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
