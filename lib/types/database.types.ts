export type Role = 'super_admin' | 'principal' | 'faculty' | 'student'

export interface Profile {
  id: string
  role: Role
  student_id: string | null
  faculty_id: string | null
  staff_id: string | null
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
  code: string
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  department_id: string
  name: string
  code: string
  duration_years: number
  created_at: string
  updated_at: string
}

export interface Section {
  id: string
  course_id: string
  name: string
  academic_year: string
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  name: string
  dob: string | null
  email: string
  phone: string | null
  address: string | null
  department_id: string | null
  course_id: string | null
  section_id: string | null
  enrollment_date: string | null
  status: 'active' | 'inactive' | 'graduated' | 'dropped'
  created_at: string
  updated_at: string
  departments?: { name: string }
  courses?: { name: string }
  sections?: { name: string }
}

export interface Faculty {
  id: string
  name: string
  email: string
  phone: string | null
  department_id: string | null
  designation: string | null
  joining_date: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
  departments?: { name: string }
}

export interface Staff {
  id: string
  name: string
  email: string
  phone: string | null
  department_id: string | null
  designation: string | null
  joining_date: string | null
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export type AdmissionStatus = 'applied' | 'under_review' | 'approved' | 'rejected' | 'waitlisted'

export interface Admission {
  id: string
  applicant_name: string
  dob: string | null
  contact_email: string
  contact_phone: string | null
  previous_institution: string | null
  course_id: string | null
  department_id: string | null
  status: AdmissionStatus
  admission_date: string | null
  remarks: string | null
  student_id: string | null
  created_at: string
  updated_at: string
  courses?: { name: string }
  departments?: { name: string }
}

export type FeeType = 'tuition' | 'hostel' | 'transport' | 'exam' | 'misc'

export interface Fee {
  id: string
  student_id: string
  fee_type: FeeType
  total_due: number
  amount_paid: number
  balance: number
  payment_date: string | null
  payment_mode: 'cash'
  receipt_number: string | null
  remarks: string | null
  academic_year: string | null
  created_at: string
  updated_at: string
  students?: { name: string; email: string }
}

export type AttendanceStatus = 'present' | 'absent' | 'late'

export interface Attendance {
  id: string
  student_id: string
  section_id: string | null
  subject_id: string | null
  date: string
  status: AttendanceStatus
  marked_by: string | null
  created_at: string
  updated_at: string
  students?: { name: string }
  subjects?: { name: string }
  faculty?: { name: string }
}

export interface Subject {
  id: string
  name: string
  code: string
  course_id: string | null
  faculty_id: string | null
  created_at: string
  updated_at: string
}

export type ExamType = 'midterm' | 'final' | 'assignment' | 'quiz'

export interface Exam {
  id: string
  student_id: string
  subject_id: string | null
  exam_type: ExamType
  marks_obtained: number
  max_marks: number
  grade: string | null
  remarks: string | null
  entered_by: string | null
  exam_date: string | null
  created_at: string
  updated_at: string
  students?: { name: string }
  subjects?: { name: string }
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'

export interface Timetable {
  id: string
  department_id: string | null
  section_id: string | null
  day_of_week: DayOfWeek
  period_number: number
  start_time: string
  end_time: string
  subject_id: string | null
  faculty_id: string | null
  room: string | null
  created_at: string
  updated_at: string
  departments?: { name: string }
  sections?: { name: string }
  subjects?: { name: string }
  faculty?: { name: string }
}

export type BookStatus = 'available' | 'issued' | 'overdue'

export interface Book {
  id: string
  title: string
  author: string
  isbn: string | null
  category: string | null
  total_copies: number
  available_copies: number
  created_at: string
  updated_at: string
}

export interface LibraryIssue {
  id: string
  book_id: string
  borrower_type: 'student' | 'faculty'
  borrower_id: string
  issue_date: string
  due_date: string
  return_date: string | null
  status: BookStatus
  created_at: string
  updated_at: string
  books?: { title: string; author: string }
}

export type HostelStatus = 'allocated' | 'vacant' | 'requested' | 'vacated'

export interface HostelAllocation {
  id: string
  student_id: string
  block: string
  room_number: string
  allocation_date: string | null
  status: HostelStatus
  remarks: string | null
  created_at: string
  updated_at: string
  students?: { name: string }
}

export interface Transport {
  id: string
  student_id: string
  route_name: string
  pickup_point: string | null
  vehicle_number: string | null
  driver_name: string | null
  status: 'active' | 'inactive' | 'requested'
  created_at: string
  updated_at: string
  students?: { name: string }
}

export interface Payroll {
  id: string
  staff_type: 'faculty' | 'staff'
  person_id: string
  month: number
  year: number
  base_salary: number
  deductions: number
  net_pay: number
  payment_status: 'paid' | 'pending'
  payment_date: string | null
  created_at: string
  updated_at: string
}

export type PlacementStatus = 'open' | 'closed'
export type ApplicationStatus = 'applied' | 'shortlisted' | 'selected' | 'rejected'

export interface Placement {
  id: string
  company_name: string
  role: string
  eligibility_criteria: string | null
  package_ctc: string | null
  application_deadline: string | null
  status: PlacementStatus
  created_at: string
  updated_at: string
}

export interface PlacementApplication {
  id: string
  placement_id: string
  student_id: string
  status: ApplicationStatus
  applied_at: string
  updated_at: string
  placements?: { company_name: string; role: string }
  students?: { name: string }
}

export type NoticeAudience = 'all' | 'department' | 'section'

export interface Notice {
  id: string
  title: string
  body: string
  posted_by: string
  poster_role: Role
  target_audience: NoticeAudience
  target_id: string | null
  post_date: string
  expiry_date: string | null
  created_at: string
  updated_at: string
}

export interface UserAccount {
  id: string
  email: string
  role: Role
  name: string | null
  is_active: boolean
  last_sign_in: string | null
  created_at: string
}
