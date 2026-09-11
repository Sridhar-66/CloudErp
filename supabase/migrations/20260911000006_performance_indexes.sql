-- ============================================================
-- College ERP — Migration 006: Performance Indexes
-- ============================================================
-- All indexes use IF NOT EXISTS so this is safe to re-run.
-- Covers every foreign key and filter column used in views,
-- RLS policies, and application queries.
-- ============================================================

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role         ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_student_id   ON profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_profiles_faculty_id   ON profiles(faculty_id);
CREATE INDEX IF NOT EXISTS idx_profiles_staff_id     ON profiles(staff_id);

-- ------------------------------------------------------------
-- students
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_students_status        ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_department_id ON students(department_id);
CREATE INDEX IF NOT EXISTS idx_students_course_id     ON students(course_id);
CREATE INDEX IF NOT EXISTS idx_students_section_id    ON students(section_id);
CREATE INDEX IF NOT EXISTS idx_students_email         ON students(email);

-- ------------------------------------------------------------
-- faculty
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_faculty_status        ON faculty(status);
CREATE INDEX IF NOT EXISTS idx_faculty_department_id ON faculty(department_id);
CREATE INDEX IF NOT EXISTS idx_faculty_email         ON faculty(email);

-- ------------------------------------------------------------
-- staff
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_staff_status        ON staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_department_id ON staff(department_id);

-- ------------------------------------------------------------
-- subjects
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_subjects_course_id  ON subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_subjects_faculty_id ON subjects(faculty_id);

-- ------------------------------------------------------------
-- sections
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sections_course_id ON sections(course_id);

-- ------------------------------------------------------------
-- courses
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_courses_department_id ON courses(department_id);

-- ------------------------------------------------------------
-- fees  (heavily used in v_fee_summary, v_student_fee_summary)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_fees_student_id     ON fees(student_id);
CREATE INDEX IF NOT EXISTS idx_fees_academic_year  ON fees(academic_year);
CREATE INDEX IF NOT EXISTS idx_fees_balance        ON fees(balance);    -- defaulter queries

-- ------------------------------------------------------------
-- attendance  (largest table; used in multiple views + RLS)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_attendance_student_id  ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject_id  ON attendance(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_section_id  ON attendance(section_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date        ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status      ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by   ON attendance(marked_by);
-- Composite for the common "per-student attendance %" query
CREATE INDEX IF NOT EXISTS idx_attendance_student_status ON attendance(student_id, status);

-- ------------------------------------------------------------
-- exams
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_exams_student_id  ON exams(student_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject_id  ON exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_entered_by  ON exams(entered_by);
CREATE INDEX IF NOT EXISTS idx_exams_exam_date   ON exams(exam_date);

-- ------------------------------------------------------------
-- admissions
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_admissions_status        ON admissions(status);
CREATE INDEX IF NOT EXISTS idx_admissions_course_id     ON admissions(course_id);
CREATE INDEX IF NOT EXISTS idx_admissions_department_id ON admissions(department_id);
CREATE INDEX IF NOT EXISTS idx_admissions_student_id    ON admissions(student_id);

-- ------------------------------------------------------------
-- timetable
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_timetable_section_id    ON timetable(section_id);
CREATE INDEX IF NOT EXISTS idx_timetable_faculty_id    ON timetable(faculty_id);
CREATE INDEX IF NOT EXISTS idx_timetable_subject_id    ON timetable(subject_id);
CREATE INDEX IF NOT EXISTS idx_timetable_department_id ON timetable(department_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day           ON timetable(day_of_week);

-- ------------------------------------------------------------
-- library_issues
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_library_issues_book_id      ON library_issues(book_id);
CREATE INDEX IF NOT EXISTS idx_library_issues_borrower_id  ON library_issues(borrower_id);
CREATE INDEX IF NOT EXISTS idx_library_issues_status       ON library_issues(status);
CREATE INDEX IF NOT EXISTS idx_library_issues_due_date     ON library_issues(due_date);

-- ------------------------------------------------------------
-- hostel_allocations
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_hostel_student_id ON hostel_allocations(student_id);
CREATE INDEX IF NOT EXISTS idx_hostel_status     ON hostel_allocations(status);

-- ------------------------------------------------------------
-- transport_assignments
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transport_student_id ON transport_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_transport_status     ON transport_assignments(status);
CREATE INDEX IF NOT EXISTS idx_transport_route      ON transport_assignments(route_name);

-- ------------------------------------------------------------
-- payroll
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_payroll_person_id       ON payroll(person_id);
CREATE INDEX IF NOT EXISTS idx_payroll_staff_type      ON payroll(staff_type);
CREATE INDEX IF NOT EXISTS idx_payroll_month_year      ON payroll(year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_payment_status  ON payroll(payment_status);

-- ------------------------------------------------------------
-- placements + placement_applications
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_placements_status              ON placements(status);
CREATE INDEX IF NOT EXISTS idx_placement_apps_placement_id    ON placement_applications(placement_id);
CREATE INDEX IF NOT EXISTS idx_placement_apps_student_id      ON placement_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_placement_apps_status          ON placement_applications(status);

-- ------------------------------------------------------------
-- notices  (dashboard loads last 5 by post_date DESC)
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notices_post_date       ON notices(post_date DESC);
CREATE INDEX IF NOT EXISTS idx_notices_target_audience ON notices(target_audience);
CREATE INDEX IF NOT EXISTS idx_notices_posted_by       ON notices(posted_by);
CREATE INDEX IF NOT EXISTS idx_notices_expiry_date     ON notices(expiry_date);
