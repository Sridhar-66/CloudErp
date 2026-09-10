// Generates supabase/migrations/20260909000005_demo_seed.sql
'use strict';
const fs = require('fs');
const path = require('path');

// Insert one auth user block (reusable snippet)
function authUserBlock(email, roleVal) {
  return [
    `  new_uid := gen_random_uuid();`,
    `  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = '${email}') THEN`,
    `    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,`,
    `      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,`,
    `      created_at, updated_at, confirmation_token, recovery_token,`,
    `      email_change_token_new, email_change)`,
    `    VALUES (iid, new_uid, 'authenticated', 'authenticated', '${email}', hashed_pw,`,
    `      NOW(),`,
    `      '{"provider":"email","providers":["email"]}'::jsonb,`,
    `      '{"role":"${roleVal}"}'::jsonb,`,
    `      NOW(), NOW(), '', '', '', '');`,
    `  END IF;`,
    `  SELECT id INTO new_uid FROM auth.users WHERE email = '${email}';`,
  ].join('\n');
}

function principalBlock(email) {
  return [
    authUserBlock(email, 'principal'),
    `  INSERT INTO profiles (id, role) VALUES (new_uid, 'principal') ON CONFLICT (id) DO NOTHING;`,
    '',
  ].join('\n');
}

function facultyBlock(email, name, deptVar, designation, joining) {
  return [
    `  -- ${name}`,
    `  fid := NULL;`,
    `  INSERT INTO faculty (name, email, department_id, designation, joining_date, status)`,
    `  VALUES ('${name}', '${email}', ${deptVar}, '${designation}', '${joining}', 'active')`,
    `  ON CONFLICT (email) DO NOTHING RETURNING id INTO fid;`,
    `  IF fid IS NULL THEN SELECT id INTO fid FROM faculty WHERE email = '${email}'; END IF;`,
    authUserBlock(email, 'faculty'),
    `  INSERT INTO profiles (id, role, faculty_id) VALUES (new_uid, 'faculty', fid) ON CONFLICT (id) DO UPDATE SET faculty_id = fid;`,
    '',
  ].join('\n');
}

function studentBlock(email, name, dob, deptVar, courseVar, secVar) {
  return [
    `  -- ${name}`,
    `  sid := NULL;`,
    `  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)`,
    `  VALUES ('${name}', '${email}', '${dob}', ${deptVar}, ${courseVar}, ${secVar}, '2024-08-01', 'active')`,
    `  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;`,
    `  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = '${email}'; END IF;`,
    authUserBlock(email, 'student'),
    `  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;`,
    '',
  ].join('\n');
}

const parts = [];

parts.push(`-- ============================================================`);
parts.push(`-- College ERP - Migration 005: Demo User Seed`);
parts.push(`-- 2 principals, 5 faculty, 20 students`);
parts.push(`-- Password for ALL: Demo@2024!`);
parts.push(`-- 2FA bypassed in app for @demo.com emails`);
parts.push(`-- ============================================================`);
parts.push(`DO $$`);
parts.push(`DECLARE`);
parts.push(`  dept_cs UUID; dept_ec UUID; dept_me UUID; dept_ce UUID; dept_mba UUID;`);
parts.push(`  course_btcs UUID; course_btec UUID; course_btme UUID; course_btce UUID; course_mba1 UUID;`);
parts.push(`  sec_cs_a UUID; sec_cs_b UUID; sec_ec_a UUID; sec_me_a UUID; sec_ce_a UUID; sec_mba_a UUID;`);
parts.push(`  new_uid UUID; fid UUID; sid UUID;`);
parts.push(`  hashed_pw TEXT;`);
parts.push(`  iid UUID := '00000000-0000-0000-0000-000000000000';`);
parts.push(`BEGIN`);
parts.push(`  hashed_pw := extensions.crypt('Demo@2024!', extensions.gen_salt('bf'));`);
parts.push(``);
parts.push(`  SELECT id INTO dept_cs  FROM departments WHERE code = 'CS';`);
parts.push(`  SELECT id INTO dept_ec  FROM departments WHERE code = 'EC';`);
parts.push(`  SELECT id INTO dept_me  FROM departments WHERE code = 'ME';`);
parts.push(`  SELECT id INTO dept_ce  FROM departments WHERE code = 'CE';`);
parts.push(`  SELECT id INTO dept_mba FROM departments WHERE code = 'MBA';`);
parts.push(`  SELECT id INTO course_btcs FROM courses WHERE code = 'BTCS';`);
parts.push(`  SELECT id INTO course_btec FROM courses WHERE code = 'BTEC';`);
parts.push(`  SELECT id INTO course_btme FROM courses WHERE code = 'BTME';`);
parts.push(`  SELECT id INTO course_btce FROM courses WHERE code = 'BTCE';`);
parts.push(`  SELECT id INTO course_mba1 FROM courses WHERE code = 'MBA1';`);
parts.push(`  SELECT id INTO sec_cs_a  FROM sections WHERE name = 'CS-A 2024';`);
parts.push(`  SELECT id INTO sec_cs_b  FROM sections WHERE name = 'CS-B 2024';`);
parts.push(`  SELECT id INTO sec_ec_a  FROM sections WHERE name = 'EC-A 2024';`);
parts.push(`  SELECT id INTO sec_me_a  FROM sections WHERE name = 'ME-A 2024';`);
parts.push(`  SELECT id INTO sec_ce_a  FROM sections WHERE name = 'CE-A 2024';`);
parts.push(`  SELECT id INTO sec_mba_a FROM sections WHERE name = 'MBA-A 2024';`);
parts.push(``);
parts.push(`  -- ============================================================`);
parts.push(`  -- PRINCIPALS (2)`);
parts.push(`  -- ============================================================`);
parts.push(principalBlock('principal1@demo.com'));
parts.push(principalBlock('principal2@demo.com'));

parts.push(`  -- ============================================================`);
parts.push(`  -- FACULTY (5)`);
parts.push(`  -- ============================================================`);
parts.push(facultyBlock('teacher1@demo.com', 'Prof. Anand Mehta',  'dept_cs',  'Associate Professor', '2020-06-01'));
parts.push(facultyBlock('teacher2@demo.com', 'Prof. Kavitha Nair', 'dept_ec',  'Assistant Professor', '2021-07-15'));
parts.push(facultyBlock('teacher3@demo.com', 'Prof. Suresh Babu',  'dept_me',  'Professor',           '2018-08-01'));
parts.push(facultyBlock('teacher4@demo.com', 'Prof. Deepa Reddy',  'dept_mba', 'Associate Professor', '2019-06-01'));
parts.push(facultyBlock('teacher5@demo.com', 'Prof. Vikram Singh',  'dept_cs',  'Assistant Professor', '2022-01-10'));

parts.push(`  -- ============================================================`);
parts.push(`  -- STUDENTS (20)`);
parts.push(`  -- ============================================================`);
parts.push(studentBlock('student01@demo.com', 'Aarav Sharma',    '2004-03-15', 'dept_cs',  'course_btcs', 'sec_cs_a'));
parts.push(studentBlock('student02@demo.com', 'Aisha Khan',      '2004-07-22', 'dept_cs',  'course_btcs', 'sec_cs_a'));
parts.push(studentBlock('student03@demo.com', 'Arjun Patel',     '2004-01-10', 'dept_cs',  'course_btcs', 'sec_cs_b'));
parts.push(studentBlock('student04@demo.com', 'Divya Menon',     '2003-11-05', 'dept_cs',  'course_btcs', 'sec_cs_b'));
parts.push(studentBlock('student05@demo.com', 'Karan Verma',     '2004-06-18', 'dept_cs',  'course_btcs', 'sec_cs_a'));
parts.push(studentBlock('student06@demo.com', 'Meera Iyer',      '2004-02-28', 'dept_ec',  'course_btec', 'sec_ec_a'));
parts.push(studentBlock('student07@demo.com', 'Nikhil Rao',      '2003-09-14', 'dept_ec',  'course_btec', 'sec_ec_a'));
parts.push(studentBlock('student08@demo.com', 'Pooja Desai',     '2004-04-30', 'dept_ec',  'course_btec', 'sec_ec_a'));
parts.push(studentBlock('student09@demo.com', 'Rahul Gupta',     '2004-08-12', 'dept_ec',  'course_btec', 'sec_ec_a'));
parts.push(studentBlock('student10@demo.com', 'Sneha Pillai',    '2003-12-03', 'dept_me',  'course_btme', 'sec_me_a'));
parts.push(studentBlock('student11@demo.com', 'Tanmay Joshi',    '2004-05-20', 'dept_me',  'course_btme', 'sec_me_a'));
parts.push(studentBlock('student12@demo.com', 'Usha Nambiar',    '2004-01-25', 'dept_me',  'course_btme', 'sec_me_a'));
parts.push(studentBlock('student13@demo.com', 'Vikram Tiwari',   '2003-10-08', 'dept_me',  'course_btme', 'sec_me_a'));
parts.push(studentBlock('student14@demo.com', 'Yamini Krishnan', '2004-03-22', 'dept_ce',  'course_btce', 'sec_ce_a'));
parts.push(studentBlock('student15@demo.com', 'Zara Ahmed',      '2004-07-15', 'dept_ce',  'course_btce', 'sec_ce_a'));
parts.push(studentBlock('student16@demo.com', 'Akash Bose',      '2003-11-18', 'dept_ce',  'course_btce', 'sec_ce_a'));
parts.push(studentBlock('student17@demo.com', 'Bhavna Kapoor',   '2001-06-05', 'dept_mba', 'course_mba1', 'sec_mba_a'));
parts.push(studentBlock('student18@demo.com', 'Chirag Malhotra', '2000-09-27', 'dept_mba', 'course_mba1', 'sec_mba_a'));
parts.push(studentBlock('student19@demo.com', 'Deepika Shetty',  '2001-03-11', 'dept_mba', 'course_mba1', 'sec_mba_a'));
parts.push(studentBlock('student20@demo.com', 'Eshan Dubey',     '2004-12-01', 'dept_cs',  'course_btcs', 'sec_cs_a'));

parts.push(`  RAISE NOTICE 'Demo seed: 2 principals, 5 faculty, 20 students created.';`);
parts.push(`END $$;`);

const out = parts.join('\n') + '\n';
const dest = path.join(__dirname, '..', 'supabase', 'migrations', '20260909000005_demo_seed.sql');
fs.writeFileSync(dest, out, 'utf8');
console.log('Written', out.length, 'bytes to', dest);
