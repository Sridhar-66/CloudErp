-- ============================================================
-- College ERP — Migration 003: Analytics Views
-- ============================================================

-- ============================================================
-- Principal Dashboard Views
-- ============================================================

-- Fee summary: total due vs paid, defaulters count
CREATE OR REPLACE VIEW v_fee_summary AS
SELECT
  COUNT(DISTINCT student_id)              AS total_students_with_fees,
  SUM(total_due)                          AS total_due,
  SUM(amount_paid)                        AS total_paid,
  SUM(balance)                            AS total_balance,
  COUNT(DISTINCT CASE WHEN balance > 0 THEN student_id END) AS defaulter_count
FROM fees;

-- Attendance summary by department
CREATE OR REPLACE VIEW v_attendance_by_department AS
SELECT
  d.name                                  AS department_name,
  COUNT(*)                                AS total_records,
  COUNT(*) FILTER (WHERE a.status = 'present') AS present_count,
  ROUND(
    COUNT(*) FILTER (WHERE a.status = 'present')::NUMERIC / NULLIF(COUNT(*), 0) * 100,
    1
  )                                       AS attendance_pct
FROM attendance a
JOIN students st ON st.id = a.student_id
LEFT JOIN departments d ON d.id = st.department_id
GROUP BY d.id, d.name;

-- Exam performance by department
CREATE OR REPLACE VIEW v_exam_performance_by_department AS
SELECT
  d.name                                  AS department_name,
  sub.name                                AS subject_name,
  COUNT(*)                                AS exam_count,
  ROUND(AVG(e.marks_obtained / NULLIF(e.max_marks, 0) * 100), 1) AS avg_pct
FROM exams e
JOIN students st ON st.id = e.student_id
LEFT JOIN departments d ON d.id = st.department_id
LEFT JOIN subjects sub ON sub.id = e.subject_id
GROUP BY d.id, d.name, sub.id, sub.name;

-- Hostel occupancy
CREATE OR REPLACE VIEW v_hostel_occupancy AS
SELECT
  COUNT(*) FILTER (WHERE status = 'allocated') AS occupied,
  COUNT(*) FILTER (WHERE status IN ('vacant', 'requested', 'vacated')) AS available_or_requested,
  COUNT(*)                                      AS total_records
FROM hostel_allocations;

-- Transport utilization by route
CREATE OR REPLACE VIEW v_transport_by_route AS
SELECT
  route_name,
  COUNT(*) AS student_count
FROM transport_assignments
WHERE status = 'active'
GROUP BY route_name
ORDER BY student_count DESC;

-- Placement stats by department
CREATE OR REPLACE VIEW v_placement_stats AS
SELECT
  d.name                                        AS department_name,
  COUNT(DISTINCT pa.student_id)                 AS applied_count,
  COUNT(DISTINCT pa.student_id) FILTER (WHERE pa.status = 'selected') AS selected_count,
  ROUND(
    COUNT(DISTINCT pa.student_id) FILTER (WHERE pa.status = 'selected')::NUMERIC /
    NULLIF(COUNT(DISTINCT pa.student_id), 0) * 100,
    1
  )                                             AS placement_pct
FROM placement_applications pa
JOIN students st ON st.id = pa.student_id
LEFT JOIN departments d ON d.id = st.department_id
GROUP BY d.id, d.name;

-- Payroll summary by department
CREATE OR REPLACE VIEW v_payroll_summary AS
SELECT
  COALESCE(d.name, 'Unassigned')  AS department_name,
  p.staff_type,
  p.month,
  p.year,
  COUNT(*)                        AS staff_count,
  SUM(p.base_salary)              AS total_gross,
  SUM(p.deductions)               AS total_deductions,
  SUM(p.net_pay)                  AS total_net
FROM payroll p
LEFT JOIN faculty f ON p.staff_type = 'faculty' AND p.person_id = f.id
LEFT JOIN staff s ON p.staff_type = 'staff' AND p.person_id = s.id
LEFT JOIN departments d ON d.id = COALESCE(f.department_id, s.department_id)
GROUP BY d.name, p.staff_type, p.month, p.year;

-- ============================================================
-- Super Admin Dashboard Views
-- ============================================================

-- User accounts by role summary
CREATE OR REPLACE VIEW v_user_counts AS
SELECT
  role,
  COUNT(*) AS count
FROM profiles
GROUP BY role;

-- Structure overview
CREATE OR REPLACE VIEW v_structure_overview AS
SELECT
  (SELECT COUNT(*) FROM departments) AS department_count,
  (SELECT COUNT(*) FROM courses)     AS course_count,
  (SELECT COUNT(*) FROM sections)    AS section_count,
  (SELECT COUNT(*) FROM students WHERE status = 'active')  AS active_students,
  (SELECT COUNT(*) FROM faculty WHERE status = 'active')   AS active_faculty,
  (SELECT COUNT(*) FROM staff WHERE status = 'active')     AS active_staff;

-- ============================================================
-- Faculty Dashboard Views
-- ============================================================

-- Attendance summary for subjects taught by this faculty
CREATE OR REPLACE VIEW v_faculty_attendance_summary AS
SELECT
  sub.name                          AS subject_name,
  COUNT(*)                          AS total_records,
  COUNT(*) FILTER (WHERE a.status = 'present') AS present_count,
  ROUND(
    COUNT(*) FILTER (WHERE a.status = 'present')::NUMERIC / NULLIF(COUNT(*), 0) * 100,
    1
  )                                 AS attendance_pct,
  a.marked_by                       AS faculty_id
FROM attendance a
LEFT JOIN subjects sub ON sub.id = a.subject_id
GROUP BY sub.id, sub.name, a.marked_by;

-- Grade distribution for subjects taught by this faculty
CREATE OR REPLACE VIEW v_faculty_grade_distribution AS
SELECT
  sub.name                          AS subject_name,
  e.exam_type,
  COUNT(*)                          AS student_count,
  ROUND(AVG(e.marks_obtained / NULLIF(e.max_marks, 0) * 100), 1) AS avg_pct,
  e.entered_by                      AS faculty_id
FROM exams e
LEFT JOIN subjects sub ON sub.id = e.subject_id
GROUP BY sub.id, sub.name, e.exam_type, e.entered_by;

-- ============================================================
-- Student Dashboard Views
-- ============================================================

-- Student attendance summary (called with student filter in app)
CREATE OR REPLACE VIEW v_student_attendance_summary AS
SELECT
  student_id,
  COUNT(*)                          AS total_classes,
  COUNT(*) FILTER (WHERE status = 'present') AS attended,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'present')::NUMERIC / NULLIF(COUNT(*), 0) * 100,
    1
  )                                 AS attendance_pct
FROM attendance
GROUP BY student_id;

-- Student fee balance summary
CREATE OR REPLACE VIEW v_student_fee_summary AS
SELECT
  student_id,
  SUM(total_due)    AS total_due,
  SUM(amount_paid)  AS total_paid,
  SUM(balance)      AS total_balance
FROM fees
GROUP BY student_id;
