const fs = require("fs");
const path = require("path");

let SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  try {
    const envPath = path.join(__dirname, "..", ".env");
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach(line => {
      const parts = line.split("=");
      if (parts.length >= 2) {
        const k = parts[0].trim();
        const v = parts.slice(1).join("=").trim();
        if (k === "NEXT_PUBLIC_SUPABASE_URL" && !SUPABASE_URL) SUPABASE_URL = v;
        if (k === "SUPABASE_SERVICE_ROLE_KEY" && !SERVICE_KEY) SERVICE_KEY = v;
      }
    });
  } catch (e) {}
}

async function restGet(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: {
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`GET ${table} failed: ${JSON.stringify(json)}`);
  return json;
}

async function restPostBulk(table, items) {
  if (!items || items.length === 0) return [];
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
      "Prefer": "return=representation",
    },
    body: JSON.stringify(items),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(`Bulk POST ${table} failed (${res.status}):`, JSON.stringify(json));
    throw new Error(`Bulk POST ${table} failed: ${JSON.stringify(json)}`);
  }
  return json;
}

async function restDelete(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
    },
  });
  return res.ok;
}

async function main() {
  console.log("=== Fast Bulk College ERP Seeding ===\n");

  // 1. Fetch existing Structural & People Entities
  const [departments, courses, sections, facultyList, studentList, profilesList] = await Promise.all([
    restGet("departments"),
    restGet("courses"),
    restGet("sections"),
    restGet("faculty"),
    restGet("students"),
    restGet("profiles"),
  ]);

  console.log(`Found: ${departments.length} Depts, ${courses.length} Courses, ${sections.length} Sections, ${facultyList.length} Faculty, ${studentList.length} Students.`);

  const deptByCode = {};
  departments.forEach(d => { deptByCode[d.code] = d.id; });

  const courseByCode = {};
  courses.forEach(c => { courseByCode[c.code] = c.id; });

  const secByName = {};
  sections.forEach(s => { secByName[s.name] = s.id; });

  const facultyByEmail = {};
  facultyList.forEach(f => { facultyByEmail[f.email] = f.id; });

  const principalProfiles = profilesList.filter(p => p.role === 'principal');
  const principalUserId = principalProfiles[0]?.id || profilesList[0]?.id;

  // ---------------------------------------------------------------
  // CLEANUP PREVIOUS MODULE DATA (Reverse Foreign Key Order)
  // ---------------------------------------------------------------
  console.log("Cleaning up previous seed data...");
  const dummyFilter = "?id=neq.00000000-0000-0000-0000-000000000000";
  await Promise.all([
    restDelete("attendance", dummyFilter),
    restDelete("exams", dummyFilter),
    restDelete("fees", dummyFilter),
    restDelete("library_issues", dummyFilter),
    restDelete("hostel_allocations", dummyFilter),
    restDelete("transport_assignments", dummyFilter),
    restDelete("payroll", dummyFilter),
    restDelete("placement_applications", dummyFilter),
    restDelete("admissions", dummyFilter),
    restDelete("notices", dummyFilter),
    restDelete("timetable", dummyFilter),
  ]);
  await Promise.all([
    restDelete("books", dummyFilter),
    restDelete("placements", dummyFilter),
    restDelete("subjects", dummyFilter),
    restDelete("staff", dummyFilter),
  ]);
  console.log("Cleanup finished.");

  // ---------------------------------------------------------------
  // 2. Staff Members (10)
  // ---------------------------------------------------------------
  console.log("\n1. Bulk Seeding Staff members...");
  const staffData = [
    { name: "Ramesh Sharma",   email: "staff1@demo.com",  phone: "9876543210", department_id: deptByCode["CS"],  designation: "Lab Technician",     joining_date: "2021-03-15", status: "active" },
    { name: "Sunita Verma",    email: "staff2@demo.com",  phone: "9876543211", department_id: deptByCode["EC"],  designation: "Senior Lab Assistant", joining_date: "2020-08-10", status: "active" },
    { name: "Amitabh Roy",     email: "staff3@demo.com",  phone: "9876543212", department_id: deptByCode["ME"],  designation: "Workshop Superintendent", joining_date: "2019-01-20", status: "active" },
    { name: "Priya Pillai",    email: "staff4@demo.com",  phone: "9876543213", department_id: deptByCode["MBA"], designation: "Administrative Executive", joining_date: "2022-05-01", status: "active" },
    { name: "Vikram Kulkarni", email: "staff5@demo.com",  phone: "9876543214", department_id: deptByCode["CS"],  designation: "System Administrator", joining_date: "2018-11-12", status: "active" },
    { name: "Saritha Menon",   email: "staff6@demo.com",  phone: "9876543215", department_id: deptByCode["CE"],  designation: "Surveyor Technician", joining_date: "2021-09-01", status: "active" },
    { name: "Gopal Krishna",   email: "staff7@demo.com",  phone: "9876543216", department_id: deptByCode["CS"],  designation: "Librarian",           joining_date: "2017-06-15", status: "active" },
    { name: "Meenakshi Das",   email: "staff8@demo.com",  phone: "9876543217", department_id: deptByCode["MBA"], designation: "Accountant",          joining_date: "2020-02-14", status: "active" },
    { name: "Rajesh Bhat",     email: "staff9@demo.com",  phone: "9876543218", department_id: deptByCode["ME"],  designation: "Stores Officer",      joining_date: "2019-10-05", status: "active" },
    { name: "Ananya Hegde",    email: "staff10@demo.com", phone: "9876543219", department_id: deptByCode["EC"],  designation: "Office Assistant",    joining_date: "2022-02-01", status: "active" },
  ];

  const staffList = await restPostBulk("staff", staffData);
  console.log(`  Staff ready: ${staffList.length} rows.`);

  // ---------------------------------------------------------------
  // 3. Subjects (15)
  // ---------------------------------------------------------------
  console.log("\n2. Bulk Seeding Subjects...");
  const subjectsData = [
    { name: "Data Structures & Algorithms", code: "CS201", course_id: courseByCode["BTCS"], faculty_id: facultyByEmail["teacher1@demo.com"] },
    { name: "Database Management Systems",  code: "CS202", course_id: courseByCode["BTCS"], faculty_id: facultyByEmail["teacher5@demo.com"] },
    { name: "Web Technologies",             code: "CS203", course_id: courseByCode["BTCS"], faculty_id: facultyByEmail["teacher1@demo.com"] },
    { name: "Operating Systems",            code: "CS204", course_id: courseByCode["BTCS"], faculty_id: facultyByEmail["teacher5@demo.com"] },
    { name: "Circuit Analysis & Design",    code: "EC201", course_id: courseByCode["BTEC"], faculty_id: facultyByEmail["teacher2@demo.com"] },
    { name: "Digital Electronics",          code: "EC202", course_id: courseByCode["BTEC"], faculty_id: facultyByEmail["teacher2@demo.com"] },
    { name: "Signals & Systems",            code: "EC203", course_id: courseByCode["BTEC"], faculty_id: facultyByEmail["teacher2@demo.com"] },
    { name: "Thermodynamics",               code: "ME201", course_id: courseByCode["BTME"], faculty_id: facultyByEmail["teacher3@demo.com"] },
    { name: "Fluid Mechanics",              code: "ME202", course_id: courseByCode["BTME"], faculty_id: facultyByEmail["teacher3@demo.com"] },
    { name: "Manufacturing Tech",           code: "ME203", course_id: courseByCode["BTME"], faculty_id: facultyByEmail["teacher3@demo.com"] },
    { name: "Structural Engineering",       code: "CE201", course_id: courseByCode["BTCE"], faculty_id: facultyByEmail["teacher3@demo.com"] },
    { name: "Environmental Engineering",    code: "CE202", course_id: courseByCode["BTCE"], faculty_id: facultyByEmail["teacher3@demo.com"] },
    { name: "Financial Management",         code: "MBA201", course_id: courseByCode["MBA1"], faculty_id: facultyByEmail["teacher4@demo.com"] },
    { name: "Marketing Strategy",           code: "MBA202", course_id: courseByCode["MBA1"], faculty_id: facultyByEmail["teacher4@demo.com"] },
    { name: "Organizational Behavior",      code: "MBA203", course_id: courseByCode["MBA1"], faculty_id: facultyByEmail["teacher4@demo.com"] },
  ];

  const subjectList = await restPostBulk("subjects", subjectsData);
  console.log(`  Subjects ready: ${subjectList.length} rows.`);

  const subjectMap = {};
  subjectList.forEach(sub => { subjectMap[sub.code] = sub; });

  // ---------------------------------------------------------------
  // 4. Timetable
  // ---------------------------------------------------------------
  console.log("\n3. Bulk Seeding Timetable...");
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const timeSlots = [
    { period: 1, start: "09:00:00", end: "10:00:00" },
    { period: 2, start: "10:00:00", end: "11:00:00" },
    { period: 3, start: "11:15:00", end: "12:15:00" },
    { period: 4, start: "13:15:00", end: "14:15:00" },
    { period: 5, start: "14:15:00", end: "15:15:00" },
  ];

  const sectionSubjects = {
    "CS-A 2024": ["CS201", "CS202", "CS203", "CS204"],
    "CS-B 2024": ["CS201", "CS202", "CS203", "CS204"],
    "EC-A 2024": ["EC201", "EC202", "EC203"],
    "ME-A 2024": ["ME201", "ME202", "ME203"],
    "CE-A 2024": ["CE201", "CE202"],
    "MBA-A 2024": ["MBA201", "MBA202", "MBA203"],
  };

  const sectionDeptCode = {
    "CS-A 2024": "CS", "CS-B 2024": "CS", "EC-A 2024": "EC",
    "ME-A 2024": "ME", "CE-A 2024": "CE", "MBA-A 2024": "MBA"
  };

  const timetableEntries = [];
  for (const [secName, subCodes] of Object.entries(sectionSubjects)) {
    const secId = secByName[secName];
    const deptId = deptByCode[sectionDeptCode[secName]];
    if (!secId || !deptId) continue;

    let subIndex = 0;
    for (const day of days) {
      for (const slot of timeSlots) {
        const subCode = subCodes[subIndex % subCodes.length];
        const subObj = subjectMap[subCode];
        if (subObj) {
          timetableEntries.push({
            department_id: deptId,
            section_id: secId,
            day_of_week: day,
            period_number: slot.period,
            start_time: slot.start,
            end_time: slot.end,
            subject_id: subObj.id,
            faculty_id: subObj.faculty_id,
            room: `Room ${100 + slot.period + (subIndex % 3) * 10}`,
          });
        }
        subIndex++;
      }
    }
  }

  await restPostBulk("timetable", timetableEntries);
  console.log(`  Timetable ready: ${timetableEntries.length} entries.`);

  // ---------------------------------------------------------------
  // 5. Attendance History (Past 15 working days for all students)
  // ---------------------------------------------------------------
  console.log("\n4. Bulk Seeding Attendance...");

  const today = new Date();
  const pastDates = [];
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      pastDates.push(d.toISOString().slice(0, 10));
    }
    if (pastDates.length >= 15) break;
  }

  const attendanceEntries = [];
  for (const student of studentList) {
    const studentSec = sections.find(s => s.id === student.section_id);
    const secName = studentSec ? studentSec.name : null;
    const subCodes = sectionSubjects[secName] || ["CS201", "CS202"];

    pastDates.forEach((dateStr, idx) => {
      subCodes.forEach((subCode, sIdx) => {
        const subObj = subjectMap[subCode];
        if (!subObj) return;

        const rand = (student.name.length + idx + sIdx) % 100;
        let status = 'present';
        if (rand > 88) status = 'absent';
        else if (rand > 82) status = 'late';

        attendanceEntries.push({
          student_id: student.id,
          section_id: student.section_id,
          subject_id: subObj.id,
          date: dateStr,
          status,
          marked_by: subObj.faculty_id,
        });
      });
    });
  }

  // Insert in chunks of 250
  for (let i = 0; i < attendanceEntries.length; i += 250) {
    await restPostBulk("attendance", attendanceEntries.slice(i, i + 250));
  }
  console.log(`  Attendance ready: ${attendanceEntries.length} entries.`);

  // ---------------------------------------------------------------
  // 6. Fees
  // ---------------------------------------------------------------
  console.log("\n5. Bulk Seeding Fees...");

  const feeEntries = [];
  studentList.forEach((s, idx) => {
    const tuitionDue = 75000;
    let tuitionPaid = tuitionDue;
    if (idx % 3 === 1) tuitionPaid = 50000;
    if (idx % 5 === 2) tuitionPaid = 0;

    feeEntries.push({
      student_id: s.id,
      fee_type: "tuition",
      total_due: tuitionDue,
      amount_paid: tuitionPaid,
      payment_date: tuitionPaid > 0 ? "2024-08-15" : null,
      payment_mode: tuitionPaid > 0 ? (idx % 2 === 0 ? "online" : "cash") : "cash",
      receipt_number: tuitionPaid > 0 ? `REC-TUI-2024-${100 + idx}` : null,
      remarks: tuitionPaid < tuitionDue ? "Installment pending" : "Paid in full",
      academic_year: "2024-25",
    });

    const examDue = 3500;
    const examPaid = (idx % 4 === 0) ? 0 : examDue;
    feeEntries.push({
      student_id: s.id,
      fee_type: "exam",
      total_due: examDue,
      amount_paid: examPaid,
      payment_date: examPaid > 0 ? "2024-09-01" : null,
      payment_mode: "online",
      receipt_number: examPaid > 0 ? `REC-EXM-2024-${100 + idx}` : null,
      remarks: "Semester I Exam Fees",
      academic_year: "2024-25",
    });
  });

  await restPostBulk("fees", feeEntries);
  console.log(`  Fees ready: ${feeEntries.length} entries.`);

  // ---------------------------------------------------------------
  // 7. Exams
  // ---------------------------------------------------------------
  console.log("\n6. Bulk Seeding Exams...");

  const examEntries = [];
  studentList.forEach((s, idx) => {
    const studentSec = sections.find(sec => sec.id === s.section_id);
    const secName = studentSec ? studentSec.name : null;
    const subCodes = sectionSubjects[secName] || ["CS201", "CS202"];

    subCodes.forEach((subCode, sIdx) => {
      const subObj = subjectMap[subCode];
      if (!subObj) return;

      const marks = 65 + ((idx * 7 + sIdx * 13) % 32);
      let grade = 'B';
      if (marks >= 90) grade = 'A+';
      else if (marks >= 80) grade = 'A';
      else if (marks >= 70) grade = 'B+';

      examEntries.push({
        student_id: s.id,
        subject_id: subObj.id,
        exam_type: "midterm",
        marks_obtained: marks,
        max_marks: 100,
        grade,
        remarks: "Good performance",
        entered_by: subObj.faculty_id,
        exam_date: "2024-09-05",
      });
    });
  });

  await restPostBulk("exams", examEntries);
  console.log(`  Exams ready: ${examEntries.length} entries.`);

  // ---------------------------------------------------------------
  // 8. Hostel Allocations
  // ---------------------------------------------------------------
  console.log("\n7. Bulk Seeding Hostel allocations...");

  const hostelEntries = [];
  studentList.slice(0, 12).forEach((s, idx) => {
    const isFemale = ["Aisha Khan", "Divya Menon", "Meera Iyer", "Pooja Desai", "Sneha Pillai", "Usha Nambiar", "Yamini Krishnan", "Zara Ahmed", "Bhavna Kapoor", "Deepika Shetty"].includes(s.name);
    const block = isFemale ? "Block B (Girls)" : "Block A (Boys)";
    hostelEntries.push({
      student_id: s.id,
      block,
      room_number: `${101 + idx}`,
      allocation_date: "2024-08-01",
      status: "allocated",
      remarks: "Annual hostel resident",
    });
  });

  await restPostBulk("hostel_allocations", hostelEntries);
  console.log(`  Hostel allocations ready: ${hostelEntries.length} entries.`);

  // ---------------------------------------------------------------
  // 9. Transport Assignments
  // ---------------------------------------------------------------
  console.log("\n8. Bulk Seeding Transport assignments...");

  const routes = [
    { name: "Route 1 - North Campus", pickup: "Central Square", bus: "KA-01-EA-1234", driver: "Ramesh Chand" },
    { name: "Route 2 - South Express", pickup: "Tech Park Gate", bus: "KA-01-EA-5678", driver: "Sunil Kumar" },
    { name: "Route 3 - City Center", pickup: "Metro Station", bus: "KA-05-MB-9900", driver: "Mahesh Gowda" },
  ];

  const transportEntries = [];
  studentList.slice(8, 20).forEach((s, idx) => {
    const route = routes[idx % routes.length];
    transportEntries.push({
      student_id: s.id,
      route_name: route.name,
      pickup_point: route.pickup,
      vehicle_number: route.bus,
      driver_name: route.driver,
      status: "active",
    });
  });

  await restPostBulk("transport_assignments", transportEntries);
  console.log(`  Transport assignments ready: ${transportEntries.length} entries.`);

  // ---------------------------------------------------------------
  // 10. Books & Library Issues
  // ---------------------------------------------------------------
  console.log("\n9. Bulk Seeding Library books and issues...");

  const booksData = [
    { title: "Introduction to Algorithms", author: "Cormen, Leiserson, Rivest, Stein", isbn: "978-0262033848", category: "Computer Science", total_copies: 8, available_copies: 5 },
    { title: "Database System Concepts", author: "Silberschatz, Korth, Sudarshan", isbn: "978-0073523323", category: "Computer Science", total_copies: 10, available_copies: 7 },
    { title: "Clean Code", author: "Robert C. Martin", isbn: "978-0132350884", category: "Computer Science", total_copies: 5, available_copies: 3 },
    { title: "Microelectronic Circuits", author: "Sedra & Smith", isbn: "978-0199333777", category: "Electronics", total_copies: 6, available_copies: 4 },
    { title: "Digital Design", author: "M. Morris Mano", isbn: "978-0132774208", category: "Electronics", total_copies: 8, available_copies: 6 },
    { title: "Thermodynamics: An Engineering Approach", author: "Yunus Cengel", isbn: "978-0073398174", category: "Mechanical", total_copies: 7, available_copies: 5 },
    { title: "Fluid Mechanics", author: "Frank M. White", isbn: "978-0073398273", category: "Mechanical", total_copies: 5, available_copies: 4 },
    { title: "Structural Analysis", author: "R.C. Hibbeler", isbn: "978-0134610672", category: "Civil", total_copies: 4, available_copies: 3 },
    { title: "Marketing Management", author: "Philip Kotler", isbn: "978-0133856460", category: "Management", total_copies: 10, available_copies: 8 },
    { title: "Corporate Finance", author: "Brealey, Myers, Allen", isbn: "978-1260013900", category: "Management", total_copies: 6, available_copies: 4 },
  ];

  const bookList = await restPostBulk("books", booksData);
  console.log(`  Books ready: ${bookList.length} rows.`);

  const issueEntries = [];
  studentList.slice(0, 8).forEach((s, idx) => {
    const book = bookList[idx % bookList.length];
    issueEntries.push({
      book_id: book.id,
      borrower_type: "student",
      borrower_id: s.id,
      issue_date: "2024-08-20",
      due_date: "2024-09-20",
      status: "issued",
    });
  });

  await restPostBulk("library_issues", issueEntries);
  console.log(`  Library issues ready: ${issueEntries.length} entries.`);

  // ---------------------------------------------------------------
  // 11. Payroll Summary
  // ---------------------------------------------------------------
  console.log("\n10. Bulk Seeding Payroll...");

  const payrollEntries = [];
  facultyList.forEach((f, idx) => {
    payrollEntries.push({
      staff_type: "faculty",
      person_id: f.id,
      month: 8,
      year: 2024,
      base_salary: 95000 + (idx * 5000),
      deductions: 8000,
      payment_status: "paid",
      payment_date: "2024-08-31",
    });
  });

  staffList.forEach((st, idx) => {
    payrollEntries.push({
      staff_type: "staff",
      person_id: st.id,
      month: 8,
      year: 2024,
      base_salary: 45000 + (idx * 3000),
      deductions: 3500,
      payment_status: "paid",
      payment_date: "2024-08-31",
    });
  });

  await restPostBulk("payroll", payrollEntries);
  console.log(`  Payroll ready: ${payrollEntries.length} entries.`);

  // ---------------------------------------------------------------
  // 12. Placements & Placement Applications
  // ---------------------------------------------------------------
  console.log("\n11. Bulk Seeding Placements and Applications...");

  const placementsData = [
    { company_name: "TechCorp Global", role: "Software Development Engineer", eligibility_criteria: "CGPA > 7.5, CS/EC Dept", package_ctc: "14.5 LPA", application_deadline: "2024-10-15", status: "open" },
    { company_name: "Apex Electronics", role: "Embedded Systems Engineer", eligibility_criteria: "CGPA > 7.0, EC Dept", package_ctc: "10.0 LPA", application_deadline: "2024-10-20", status: "open" },
    { company_name: "BuildCon Infrastructure", role: "Assistant Project Engineer", eligibility_criteria: "CGPA > 6.5, CE Dept", package_ctc: "8.0 LPA", application_deadline: "2024-11-01", status: "open" },
    { company_name: "FinEdge Consulting", role: "Management Trainee - Finance", eligibility_criteria: "MBA Graduates", package_ctc: "12.0 LPA", application_deadline: "2024-10-30", status: "open" },
    { company_name: "MegaMotors Corp", role: "Design Engineer", eligibility_criteria: "CGPA > 7.0, ME Dept", package_ctc: "9.5 LPA", application_deadline: "2024-11-05", status: "open" },
  ];

  const placementList = await restPostBulk("placements", placementsData);
  console.log(`  Placements ready: ${placementList.length} rows.`);

  const appEntries = [];
  studentList.forEach((s, idx) => {
    const p = placementList[idx % placementList.length];
    let appStatus = "applied";
    if (idx % 3 === 0) appStatus = "selected";
    else if (idx % 3 === 1) appStatus = "shortlisted";

    appEntries.push({
      placement_id: p.id,
      student_id: s.id,
      status: appStatus,
    });
  });

  await restPostBulk("placement_applications", appEntries);
  console.log(`  Placement applications ready: ${appEntries.length} entries.`);

  // ---------------------------------------------------------------
  // 13. Admissions Records
  // ---------------------------------------------------------------
  console.log("\n12. Bulk Seeding Admissions...");

  const admissionData = [
    { applicant_name: "Rohan Varma", dob: "2005-04-12", contact_email: "rohan.v@gmail.com", contact_phone: "9123456780", previous_institution: "St. Xavier Senior Secondary", course_id: courseByCode["BTCS"], department_id: deptByCode["CS"], status: "applied", admission_date: "2024-07-01", remarks: "Application received" },
    { applicant_name: "Kavya Sree", dob: "2005-09-25", contact_email: "kavya.s@gmail.com", contact_phone: "9123456781", previous_institution: "National Public School", course_id: courseByCode["BTEC"], department_id: deptByCode["EC"], status: "under_review", admission_date: "2024-07-05", remarks: "Documents pending" },
    { applicant_name: "Siddharth Nair", dob: "2004-12-18", contact_email: "sid.nair@gmail.com", contact_phone: "9123456782", previous_institution: "Delhi Public School", course_id: courseByCode["BTME"], department_id: deptByCode["ME"], status: "approved", admission_date: "2024-07-10", remarks: "Seat confirmed" },
    { applicant_name: "Anjali Gupta", dob: "2005-01-30", contact_email: "anjali.g@gmail.com", contact_phone: "9123456783", previous_institution: "Kendriya Vidyalaya No. 1", course_id: courseByCode["BTCE"], department_id: deptByCode["CE"], status: "waitlisted", admission_date: "2024-07-12", remarks: "Rank 45 on waitlist" },
    { applicant_name: "Tushar Kapoor", dob: "2002-08-14", contact_email: "tushar.k@gmail.com", contact_phone: "9123456784", previous_institution: "Christ University", course_id: courseByCode["MBA1"], department_id: deptByCode["MBA"], status: "approved", admission_date: "2024-07-15", remarks: "Fee paid" },
  ];

  await restPostBulk("admissions", admissionData);
  console.log(`  Admissions ready: ${admissionData.length} rows.`);

  // ---------------------------------------------------------------
  // 14. Notices
  // ---------------------------------------------------------------
  console.log("\n13. Bulk Seeding Notices...");

  const noticeData = [
    { title: "Mid-Term Examination Schedule Announced", body: "The mid-term examinations for all B.Tech courses will commence from October 5th. Detailed timetable is updated in the portal.", posted_by: principalUserId, poster_role: "principal", target_audience: "all", target_id: null, post_date: "2024-09-01", expiry_date: "2024-10-15" },
    { title: "Annual Technical Fest - TechVista 2024", body: "Registration for TechVista 2024 hackathon and paper presentations is now open. Interested students can register via respective department coordinators.", posted_by: principalUserId, poster_role: "principal", target_audience: "all", target_id: null, post_date: "2024-09-03", expiry_date: "2024-10-30" },
    { title: "Library Timings Extension during Exams", body: "Central library will remain open until 10:00 PM on all working days starting next week.", posted_by: principalUserId, poster_role: "principal", target_audience: "all", target_id: null, post_date: "2024-09-05", expiry_date: "2024-10-25" },
    { title: "Campus Placement Drive by TechCorp Global", body: "TechCorp Global will visit campus on October 15th for Software Engineer roles. Eligible CS/EC students must apply by Oct 10th.", posted_by: principalUserId, poster_role: "principal", target_audience: "department", target_id: deptByCode["CS"], post_date: "2024-09-08", expiry_date: "2024-10-10" },
  ];

  await restPostBulk("notices", noticeData);
  console.log(`  Notices ready: ${noticeData.length} rows.`);

  console.log("\n=======================================================");
  console.log("   SUCCESS! All 21 ERP tables seeded successfully.");
  console.log("=======================================================");
}

main().catch(err => {
  console.error("FATAL Seeding Error:", err);
  process.exit(1);
});
