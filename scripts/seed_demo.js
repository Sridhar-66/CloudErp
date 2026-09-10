// Demo seed script - creates demo users via Supabase Admin API
// Run: node scripts/seed_demo.js

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://utubmnpngxjijutbpfsc.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Helper: call Supabase Admin API
async function adminPost(path, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`POST ${path} failed: ${JSON.stringify(json)}`);
  return json;
}

async function adminGet(path) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`GET ${path} failed: ${JSON.stringify(json)}`);
  return json;
}

async function dbQuery(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
    },
    body: JSON.stringify({ query: sql }),
  });
  return res;
}

// Create a Supabase auth user via Admin API
async function createAuthUser(email, password, role) {
  try {
    const user = await adminPost("/auth/v1/admin/users", {
      email,
      password,
      email_confirm: true,           // skip email verification
      app_metadata: { role },        // stored in app_metadata
      user_metadata: { role },       // also in user_metadata (used by trigger)
    });
    return user.id;
  } catch (err) {
    // If user already exists, fetch them
    if (err.message && err.message.includes("already registered")) {
      console.log(`  User ${email} already exists, skipping...`);
      return null;
    }
    throw err;
  }
}

async function restPost(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
      "Prefer": "return=representation",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`POST ${table} failed: ${JSON.stringify(json)}`);
  return json;
}

async function restGet(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: {
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
    },
  });
  return res.json();
}

async function upsertProfile(userId, role, extraId = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
      "Prefer": "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({ id: userId, role, ...extraId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Upsert profile failed: ${JSON.stringify(json)}`);
  return json;
}

async function main() {
  console.log("=== College ERP Demo Seed ===\n");

  const credentials = [];

  // ---------------------------------------------------------------
  // 1. Create Departments
  // ---------------------------------------------------------------
  console.log("Creating departments...");
  const departments = [
    { name: "Computer Science", code: "CS" },
    { name: "Electronics Engineering", code: "EC" },
    { name: "Mechanical Engineering", code: "ME" },
    { name: "Civil Engineering", code: "CE" },
    { name: "Business Administration", code: "MBA" },
  ];

  const deptIds = {};
  for (const dept of departments) {
    try {
      const existing = await restGet("departments", `?code=eq.${dept.code}`);
      if (existing.length > 0) {
        deptIds[dept.code] = existing[0].id;
        console.log(`  Dept ${dept.code} already exists: ${existing[0].id}`);
      } else {
        const created = await restPost("departments", dept);
        deptIds[dept.code] = created[0].id;
        console.log(`  Created dept ${dept.code}: ${created[0].id}`);
      }
    } catch (e) {
      console.error(`  Error dept ${dept.code}:`, e.message);
    }
  }

  // ---------------------------------------------------------------
  // 2. Create Courses
  // ---------------------------------------------------------------
  console.log("\nCreating courses...");
  const courses = [
    { name: "B.Tech Computer Science", code: "BTCS", department_code: "CS", duration_years: 4 },
    { name: "B.Tech Electronics", code: "BTEC", department_code: "EC", duration_years: 4 },
    { name: "B.Tech Mechanical", code: "BTME", department_code: "ME", duration_years: 4 },
    { name: "B.Tech Civil", code: "BTCE", department_code: "CE", duration_years: 4 },
    { name: "MBA", code: "MBA1", department_code: "MBA", duration_years: 2 },
  ];

  const courseIds = {};
  for (const course of courses) {
    try {
      const existing = await restGet("courses", `?code=eq.${course.code}`);
      if (existing.length > 0) {
        courseIds[course.code] = existing[0].id;
        console.log(`  Course ${course.code} already exists`);
      } else {
        const { department_code, ...rest } = course;
        const created = await restPost("courses", {
          ...rest,
          department_id: deptIds[department_code],
        });
        courseIds[course.code] = created[0].id;
        console.log(`  Created course ${course.code}: ${created[0].id}`);
      }
    } catch (e) {
      console.error(`  Error course ${course.code}:`, e.message);
    }
  }

  // ---------------------------------------------------------------
  // 3. Create Sections
  // ---------------------------------------------------------------
  console.log("\nCreating sections...");
  const sections = [
    { name: "CS-A 2024", course_code: "BTCS", academic_year: "2024-25" },
    { name: "CS-B 2024", course_code: "BTCS", academic_year: "2024-25" },
    { name: "EC-A 2024", course_code: "BTEC", academic_year: "2024-25" },
    { name: "ME-A 2024", course_code: "BTME", academic_year: "2024-25" },
    { name: "MBA-A 2024", course_code: "MBA1", academic_year: "2024-25" },
  ];

  const sectionIds = {};
  for (const sec of sections) {
    try {
      const existing = await restGet("sections", `?name=eq.${encodeURIComponent(sec.name)}&academic_year=eq.${sec.academic_year}`);
      if (existing.length > 0) {
        sectionIds[sec.name] = existing[0].id;
        console.log(`  Section "${sec.name}" already exists`);
      } else {
        const { course_code, ...rest } = sec;
        const created = await restPost("sections", {
          ...rest,
          course_id: courseIds[course_code],
        });
        sectionIds[sec.name] = created[0].id;
        console.log(`  Created section "${sec.name}": ${created[0].id}`);
      }
    } catch (e) {
      console.error(`  Error section "${sec.name}":`, e.message);
    }
  }

  // ---------------------------------------------------------------
  // 4. Create 2 Principals
  // ---------------------------------------------------------------
  console.log("\nCreating principal accounts...");
  const principals = [
    { name: "Dr. Rajesh Kumar",  email: "principal1@demo.com", password: "Demo@2024!" },
    { name: "Dr. Priya Sharma",  email: "principal2@demo.com", password: "Demo@2024!" },
  ];

  for (const p of principals) {
    try {
      console.log(`  Creating ${p.email}...`);
      const uid = await createAuthUser(p.email, p.password, "principal");
      if (uid) {
        await upsertProfile(uid, "principal");
        console.log(`    Profile created for principal: ${uid}`);
      }
      credentials.push({ role: "Principal", name: p.name, email: p.email, password: p.password });
    } catch (e) {
      console.error(`  Error creating principal ${p.email}:`, e.message);
    }
  }

  // ---------------------------------------------------------------
  // 5. Create 5 Faculty (Teachers)
  // ---------------------------------------------------------------
  console.log("\nCreating faculty accounts...");
  const facultyData = [
    { name: "Prof. Anand Mehta",     email: "teacher1@demo.com", password: "Demo@2024!", dept_code: "CS",  designation: "Associate Professor" },
    { name: "Prof. Kavitha Nair",    email: "teacher2@demo.com", password: "Demo@2024!", dept_code: "EC",  designation: "Assistant Professor" },
    { name: "Prof. Suresh Babu",     email: "teacher3@demo.com", password: "Demo@2024!", dept_code: "ME",  designation: "Professor" },
    { name: "Prof. Deepa Reddy",     email: "teacher4@demo.com", password: "Demo@2024!", dept_code: "MBA", designation: "Associate Professor" },
    { name: "Prof. Vikram Singh",    email: "teacher5@demo.com", password: "Demo@2024!", dept_code: "CS",  designation: "Assistant Professor" },
  ];

  for (const f of facultyData) {
    try {
      console.log(`  Creating ${f.email}...`);
      const uid = await createAuthUser(f.email, f.password, "faculty");

      // Create faculty record
      let facultyRecord;
      const existingFac = await restGet("faculty", `?email=eq.${f.email}`);
      if (existingFac.length > 0) {
        facultyRecord = existingFac[0];
        console.log(`    Faculty record already exists`);
      } else {
        const created = await restPost("faculty", {
          name: f.name,
          email: f.email,
          department_id: deptIds[f.dept_code],
          designation: f.designation,
          joining_date: "2020-06-01",
          status: "active",
        });
        facultyRecord = created[0];
        console.log(`    Faculty record created: ${facultyRecord.id}`);
      }

      if (uid) {
        await upsertProfile(uid, "faculty", { faculty_id: facultyRecord.id });
        console.log(`    Profile linked to faculty`);
      }

      credentials.push({ role: "Faculty/Teacher", name: f.name, email: f.email, password: f.password, department: f.dept_code, designation: f.designation });
    } catch (e) {
      console.error(`  Error creating faculty ${f.email}:`, e.message);
    }
  }

  // ---------------------------------------------------------------
  // 6. Create 20 Students
  // ---------------------------------------------------------------
  console.log("\nCreating student accounts...");

  const studentData = [
    { name: "Aarav Sharma",      email: "student01@demo.com", password: "Demo@2024!", dept: "CS",  course: "BTCS", section: "CS-A 2024", dob: "2004-03-15" },
    { name: "Aisha Khan",        email: "student02@demo.com", password: "Demo@2024!", dept: "CS",  course: "BTCS", section: "CS-A 2024", dob: "2004-07-22" },
    { name: "Arjun Patel",       email: "student03@demo.com", password: "Demo@2024!", dept: "CS",  course: "BTCS", section: "CS-B 2024", dob: "2004-01-10" },
    { name: "Divya Menon",       email: "student04@demo.com", password: "Demo@2024!", dept: "CS",  course: "BTCS", section: "CS-B 2024", dob: "2003-11-05" },
    { name: "Karan Verma",       email: "student05@demo.com", password: "Demo@2024!", dept: "CS",  course: "BTCS", section: "CS-A 2024", dob: "2004-06-18" },
    { name: "Meera Iyer",        email: "student06@demo.com", password: "Demo@2024!", dept: "EC",  course: "BTEC", section: "EC-A 2024", dob: "2004-02-28" },
    { name: "Nikhil Rao",        email: "student07@demo.com", password: "Demo@2024!", dept: "EC",  course: "BTEC", section: "EC-A 2024", dob: "2003-09-14" },
    { name: "Pooja Desai",       email: "student08@demo.com", password: "Demo@2024!", dept: "EC",  course: "BTEC", section: "EC-A 2024", dob: "2004-04-30" },
    { name: "Rahul Gupta",       email: "student09@demo.com", password: "Demo@2024!", dept: "EC",  course: "BTEC", section: "EC-A 2024", dob: "2004-08-12" },
    { name: "Sneha Pillai",      email: "student10@demo.com", password: "Demo@2024!", dept: "ME",  course: "BTME", section: "ME-A 2024", dob: "2003-12-03" },
    { name: "Tanmay Joshi",      email: "student11@demo.com", password: "Demo@2024!", dept: "ME",  course: "BTME", section: "ME-A 2024", dob: "2004-05-20" },
    { name: "Usha Nambiar",      email: "student12@demo.com", password: "Demo@2024!", dept: "ME",  course: "BTME", section: "ME-A 2024", dob: "2004-01-25" },
    { name: "Vikram Tiwari",     email: "student13@demo.com", password: "Demo@2024!", dept: "ME",  course: "BTME", section: "ME-A 2024", dob: "2003-10-08" },
    { name: "Yamini Krishnan",   email: "student14@demo.com", password: "Demo@2024!", dept: "CE",  course: "BTCE", section: "CE-A 2024", dob: "2004-03-22" },
    { name: "Zara Ahmed",        email: "student15@demo.com", password: "Demo@2024!", dept: "CE",  course: "BTCE", section: "CE-A 2024", dob: "2004-07-15" },
    { name: "Akash Bose",        email: "student16@demo.com", password: "Demo@2024!", dept: "CE",  course: "BTCE", section: "CE-A 2024", dob: "2003-11-18" },
    { name: "Bhavna Kapoor",     email: "student17@demo.com", password: "Demo@2024!", dept: "MBA", course: "MBA1", section: "MBA-A 2024", dob: "2001-06-05" },
    { name: "Chirag Malhotra",   email: "student18@demo.com", password: "Demo@2024!", dept: "MBA", course: "MBA1", section: "MBA-A 2024", dob: "2000-09-27" },
    { name: "Deepika Shetty",    email: "student19@demo.com", password: "Demo@2024!", dept: "MBA", course: "MBA1", section: "MBA-A 2024", dob: "2001-03-11" },
    { name: "Eshan Dubey",       email: "student20@demo.com", password: "Demo@2024!", dept: "CS",  course: "BTCS", section: "CS-A 2024", dob: "2004-12-01" },
  ];

  // Add CE section (not created above)
  const ceSection = "CE-A 2024";
  if (!sectionIds[ceSection]) {
    try {
      const existing = await restGet("sections", `?name=eq.${encodeURIComponent(ceSection)}`);
      if (existing.length > 0) {
        sectionIds[ceSection] = existing[0].id;
      } else {
        const created = await restPost("sections", {
          name: ceSection,
          course_id: courseIds["BTCE"],
          academic_year: "2024-25",
        });
        sectionIds[ceSection] = created[0].id;
        console.log(`  Created CE section: ${created[0].id}`);
      }
    } catch (e) {
      console.error("  Error CE section:", e.message);
    }
  }

  for (const s of studentData) {
    try {
      console.log(`  Creating ${s.email}...`);
      const uid = await createAuthUser(s.email, s.password, "student");

      // Create student record
      let studentRecord;
      const existingStu = await restGet("students", `?email=eq.${s.email}`);
      if (existingStu.length > 0) {
        studentRecord = existingStu[0];
        console.log(`    Student record already exists`);
      } else {
        const created = await restPost("students", {
          name: s.name,
          email: s.email,
          dob: s.dob,
          department_id: deptIds[s.dept],
          course_id: courseIds[s.course],
          section_id: sectionIds[s.section],
          enrollment_date: "2024-08-01",
          status: "active",
        });
        studentRecord = created[0];
        console.log(`    Student record created: ${studentRecord.id}`);
      }

      if (uid) {
        await upsertProfile(uid, "student", { student_id: studentRecord.id });
        console.log(`    Profile linked to student`);
      }

      credentials.push({
        role: "Student",
        name: s.name,
        email: s.email,
        password: s.password,
        department: s.dept,
        course: s.course,
        section: s.section,
      });
    } catch (e) {
      console.error(`  Error creating student ${s.email}:`, e.message);
    }
  }

  // ---------------------------------------------------------------
  // 7. Write credentials to file
  // ---------------------------------------------------------------
  const fs = await import("fs");

  let output = "=".repeat(70) + "\n";
  output += "        COLLEGE ERP - DEMO USER CREDENTIALS\n";
  output += "=".repeat(70) + "\n";
  output += `Generated: ${new Date().toISOString()}\n`;
  output += "NOTE: All demo users use password: Demo@2024!\n";
  output += "NOTE: 2FA (OTP) is bypassed for @demo.com accounts\n";
  output += "=".repeat(70) + "\n\n";

  const groups = ["Principal", "Faculty/Teacher", "Student"];
  for (const group of groups) {
    const groupCreds = credentials.filter(c => c.role === group);
    if (groupCreds.length === 0) continue;

    output += "-".repeat(70) + "\n";
    output += `  ${group.toUpperCase()} ACCOUNTS (${groupCreds.length})\n`;
    output += "-".repeat(70) + "\n";

    groupCreds.forEach((c, i) => {
      output += `\n  #${i + 1}  ${c.name}\n`;
      output += `       Email    : ${c.email}\n`;
      output += `       Password : ${c.password}\n`;
      if (c.department) output += `       Dept     : ${c.department}\n`;
      if (c.designation) output += `       Title    : ${c.designation}\n`;
      if (c.section) output += `       Section  : ${c.section}\n`;
    });
    output += "\n";
  }

  output += "=".repeat(70) + "\n";
  output += "LOGIN URL: http://localhost:3000/login\n";
  output += "=".repeat(70) + "\n";

  fs.writeFileSync("DEMO_CREDENTIALS.txt", output, "utf8");
  console.log("\n\n=== Done! Credentials saved to DEMO_CREDENTIALS.txt ===");
  console.log(`Total: ${credentials.length} users created`);
}

main().catch(console.error);