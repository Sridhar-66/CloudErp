# College ERP — Master Prompt

## 1. Project Overview

Build a **cloud-based ERP system for a single college** (not multi-tenant — this system serves one institution only). The system manages the full academic and administrative lifecycle: admissions, fees, attendance, exams, timetable, library, hostel, transport, staff HR/payroll, placements, and notices.

**Tech stack:**

- Frontend: Next.js (App Router)
- Backend/DB: Supabase (Postgres + Auth + Row Level Security)
- Auth: Supabase Auth with email/password + email OTP as a second factor (2FA)
- No file storage — Supabase free tier storage (500MB) is not to be used. All data must be text/structured values only. No image, PDF, or document uploads anywhere in the system (no profile photos, no ID card scans, no certificate uploads).
- Styling/UI: intentionally NOT covered in this prompt. UI/UX, component structure, and design system are defined separately in `ui_masterPrompt.md`. This prompt should only concern itself with data model, business logic, roles/permissions, and functionality — not visual design.

---

## 2. Roles

There are exactly four roles in the system. Note the authority split: **Principal is the primary operational authority** for the college (equivalent to the "business owner" of the system); **Super Admin is a technical/IT role**, not a decision-making one.

1. **Super Admin (IT Administrator)**
   - This is the college's IT/technical person, not an academic or administrative decision-maker.
   - Manages user accounts: creates/deactivates/resets accounts for Principal, Faculty, and Student, and assigns roles.
   - Manages structural/system setup: departments, courses, sections (the scaffolding other modules hang off of).
   - Has technical override access to all tables for support/data-fix purposes (e.g. correcting a bad entry, restoring a record) — this is a support capability, not a normal day-to-day workflow.
   - Sees system-level info (accounts, login activity, structural data) rather than academic/administrative analytics dashboards.
   - Does **not** approve admissions, fees, notices, etc. — that authority sits with the Principal.

2. **Principal — Main Authority**
   - Full CRUD across all operational modules: Admissions, Fees, Timetable, Library, Hostel, Transport, HR/Payroll, Placements, Notices.
   - Override/approval authority on Attendance and Exams/Grades entered by Faculty (view + can correct if needed).
   - Approves: admissions, fee waivers/discounts, hostel/transport requests, placement postings.
   - Full access to every analytics dashboard in the system.
   - Cannot manage user accounts or system/structural setup — that stays with Super Admin.

3. **Faculty — Teaching Only**
   - Scoped strictly to teaching-related work:
     - Attendance: mark/edit attendance for classes they teach.
     - Exams/Grades: enter/edit grades for subjects they teach.
   - View-only: their own timetable/schedule, student list for their own classes, their own payroll record.
   - Access to analytics scoped to their own classes/subjects only: attendance %, grade distribution/performance.
   - No access to Notices (not even posting), Fees, Hostel, Transport, Library management, Placements, or other staff's HR/Payroll data.

4. **Student**
   - Read-only access to their own data. Primary daily-use screen is their **timetable**; beyond that they can view their own Attendance, Exams/Grades, Fees (amount paid, balance due, payment history), Library (borrowed books/history), Hostel (allocation/status), Transport (route/status), Placements (opportunities listed + their own applications), and Notices relevant to them.
   - Can submit requests where relevant (hostel room change, transport route change, placement application) — these go into a pending/requested state, not directly editable data.
   - Cannot edit any authoritative record directly, and has no visibility into other students' data.

**Permission enforcement**: All access control must be enforced via Supabase Row Level Security (RLS) policies at the database level — not just hidden in the frontend. Every table needs RLS policies reflecting the above matrix.

---

## 3. Authentication & 2FA

- Sign-up/account creation is **not self-serve** — only Super Admin (IT) creates user accounts (for Principal, Faculty, Student) with an assigned role and college email.
- Login flow:
  1. User enters email + password (Supabase Auth standard).
  2. On success, Supabase sends an email OTP code (6-digit) as a second factor.
  3. User enters OTP to complete login and receive session.
- Session/role must be checked on every request via Supabase Auth + a `profiles` table storing `user_id`, `role`, and role-specific foreign keys (e.g. `student_id`, `faculty_id`).
- Passwords resettable via standard Supabase flow (email link) — still requires OTP step on next login.
- No third-party OAuth (Google/GitHub login) — email/password + OTP only.

---

## 4. Modules — Functional Requirements

For each module below: assume a flat-ish relational structure (College → Department → Course/Class → Section → Student), all fields are plain text/number/date/boolean/enum — **no file/image fields anywhere**.

### 4.1 Admissions

- Fields: applicant name, DOB, contact info, previous school/institution, course applied for, department, application status (enum: Applied / Under Review / Approved / Rejected / Waitlisted), admission date, remarks (text).
- Principal: full CRUD, approves/rejects.
- Super Admin: no functional role (technical override only, per Section 2).
- Student: view own application status only (pre-enrollment access, or post-enrollment historical record).

### 4.2 Fees

- Fields: student_id, fee type (Tuition / Hostel / Transport / Exam / Misc), total amount due, amount paid, balance, payment date, payment mode (fixed to "Cash" only — no gateway), receipt number (text), remarks.
- Explicitly: no online payment integration. This module only records that a cash payment was made and tracks running balance.
- Principal: full CRUD, approves fee waivers/discounts (adjust total due with a reason logged).
- Student: view own fee status/history only.

### 4.3 Attendance

- Fields: student_id, class/section_id, subject_id, date, status (Present/Absent/Late), marked_by (faculty_id).
- Faculty: CRUD scoped to classes they teach.
- Principal: view-only, college-wide, with override/correction capability + analytics (attendance % by class/department).
- Student: view own attendance record + % calculated.

### 4.4 Exams / Grades

- Fields: student_id, subject_id, exam type (Midterm/Final/Assignment/Quiz), marks obtained, max marks, grade (auto-computed or manual), remarks, entered_by (faculty_id), date.
- Faculty: CRUD scoped to subjects they teach.
- Principal: view-only, with override/correction capability + analytics (average performance by class/subject).
- Student: view own grades/report card.

### 4.5 Timetable

- Fields: department, section, day of week, period/slot, subject_id, faculty_id, room (text, e.g. "Room 204").
- Principal: full CRUD.
- Faculty: view-only, scoped to their own schedule.
- Student: view-only, scoped to their own section's timetable — this is a primary/frequent screen for students.

### 4.6 Library

- Fields: book title, author, ISBN (text), category, total copies, available copies, borrower (student_id/faculty_id), issue date, due date, return date, status (Available/Issued/Overdue).
- No cover images — text catalog only.
- Principal: full CRUD (catalog management + issue/return records).
- Student: view catalog, view own borrow history/current issues, can submit a "reserve/request" for a book.

### 4.7 Hostel

- Fields: student_id, block/building (text), room number, allocation date, status (Allocated/Vacant/Requested/Vacated), fee linkage (references Fees module for hostel fee), remarks.
- Principal: full CRUD, approves allocation requests.
- Student: view own allocation, submit room change/vacate request.

### 4.8 Transport

- Fields: student_id, route name, pickup point (text), vehicle number (text, no live GPS — just static assignment), driver name (text), fee linkage.
- Principal: full CRUD.
- Student: view own route assignment, submit route change request.
- Note: no GPS tracking in this version — explicitly out of scope, static route/vehicle records only.

### 4.9 HR / Payroll (Staff)

- Fields: staff_id (faculty or non-teaching), name, designation, department, salary (base amount), month/year, deductions, net pay, payment status (Paid/Pending), joining date.
- Principal: full CRUD + analytics (department-wise payroll summary).
- Faculty: view own payroll record only.
- Student: no access.
- Super Admin: no functional role (technical override only, per Section 2).

### 4.10 Placements

- Fields: company name, role/position (text), eligibility criteria (text), package/CTC (text/number), application deadline, status (Open/Closed), applicant list (student_ids + application status: Applied/Shortlisted/Selected/Rejected).
- Principal: full CRUD + analytics (placement % per department).
- Student: view open opportunities, apply (creates application record), view own application status.
- Faculty: no access (teaching-only scope, per Section 2).

### 4.11 Notices / Announcements

- Fields: title, body (text), posted_by (user_id + role), target audience (All / Department-specific / Class-specific), post date, expiry date (optional).
- Principal: full CRUD, college-wide.
- Faculty: view-only, filtered to relevant audience (no posting rights).
- Student: view-only, filtered to relevant audience.

---

## 5. Analytics / Dashboards

Role-based dashboards required:

- **Principal dashboard** (full authority, sees everything):
  - Total students, faculty, staff counts
  - Fee collection summary (total due vs collected, defaulter count/list)
  - Attendance % trends (by department/class)
  - Exam performance averages (by department/class/subject)
  - Hostel occupancy %
  - Transport utilization (students per route)
  - Placement stats (applications, offers, % placed)
  - Payroll summary (full)

- **Super Admin dashboard** (system/technical view, not academic):
  - Total active user accounts by role
  - Recent login activity / failed login attempts
  - Departments/courses/sections structural overview
  - No fee, grade, or payroll analytics here — that's Principal-only.

- **Faculty dashboard**: attendance summary for their classes, grade distribution for their subjects.

- **Student dashboard**: personal snapshot — attendance %, latest grades, fee balance, upcoming timetable, active notices, placement application status.

All analytics should be computed from the underlying tables (aggregation queries / views in Supabase) — no separate analytics database needed given the scale (single college).

---

## 6. Explicit Non-Goals / Out of Scope

- No file/image/document storage of any kind (Supabase 500MB free tier constraint).
- No online payment gateway integration — cash-only fee recording.
- No GPS/live tracking for transport.
- No multi-college/multi-tenant support — single institution only.
- No public self-registration — accounts are provisioned by Super Admin only.
- Super Admin does not participate in academic or administrative decisions (approvals, fee waivers, notices, etc.) — that authority belongs to the Principal alone.
- UI/component design is out of scope for this prompt — see `ui_masterPrompt.md`.

---

## 7. Data Model Notes for Antigravity

- Use a flat relational structure: `colleges` (single row, optional), `departments`, `courses`, `sections`, `students`, `faculty`, `staff`, and module-specific tables as above, all linked via foreign keys.
- Every table should have `created_at`, `updated_at` timestamps.
- `profiles` table maps `auth.users.id` → `role` (enum: `super_admin`, `principal`, `faculty`, `student`) + role-specific ID (student_id/faculty_id/staff_id/null for principal & super admin).
- RLS policies must be written per-table based on the role/scoping rules in Section 2 and Section 4. Super Admin's broad technical access should be modeled as a distinct override policy (e.g. a `service`/support-level policy), separate from Principal's operational full-CRUD policies — they serve different purposes even though both can touch most tables.
- Prefer Postgres views for analytics aggregations rather than computing in frontend.
