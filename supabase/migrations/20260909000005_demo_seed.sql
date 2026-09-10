-- ============================================================
-- College ERP - Migration 005: Complete ERP Demo Seed
-- 2 principals, 5 faculty, 20 students, 10 staff
-- Full module records across all 21 tables
-- ============================================================
DO $$
DECLARE
  dept_cs UUID; dept_ec UUID; dept_me UUID; dept_ce UUID; dept_mba UUID;
  course_btcs UUID; course_btec UUID; course_btme UUID; course_btce UUID; course_mba1 UUID;
  sec_cs_a UUID; sec_cs_b UUID; sec_ec_a UUID; sec_me_a UUID; sec_ce_a UUID; sec_mba_a UUID;
  f1 UUID; f2 UUID; f3 UUID; f4 UUID; f5 UUID;
  sub_cs201 UUID; sub_cs202 UUID; sub_cs203 UUID; sub_cs204 UUID;
  sub_ec201 UUID; sub_ec202 UUID; sub_ec203 UUID;
  sub_me201 UUID; sub_me202 UUID; sub_me203 UUID;
  sub_ce201 UUID; sub_ce202 UUID;
  sub_mba201 UUID; sub_mba202 UUID; sub_mba203 UUID;
  new_uid UUID; fid UUID; sid UUID; st_id UUID; bk_id UUID; plc_id UUID;
  hashed_pw TEXT;
  iid UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  hashed_pw := extensions.crypt('Demo@2024!', extensions.gen_salt('bf'));

  SELECT id INTO dept_cs  FROM departments WHERE code = 'CS';
  SELECT id INTO dept_ec  FROM departments WHERE code = 'EC';
  SELECT id INTO dept_me  FROM departments WHERE code = 'ME';
  SELECT id INTO dept_ce  FROM departments WHERE code = 'CE';
  SELECT id INTO dept_mba FROM departments WHERE code = 'MBA';
  SELECT id INTO course_btcs FROM courses WHERE code = 'BTCS';
  SELECT id INTO course_btec FROM courses WHERE code = 'BTEC';
  SELECT id INTO course_btme FROM courses WHERE code = 'BTME';
  SELECT id INTO course_btce FROM courses WHERE code = 'BTCE';
  SELECT id INTO course_mba1 FROM courses WHERE code = 'MBA1';
  SELECT id INTO sec_cs_a  FROM sections WHERE name = 'CS-A 2024';
  SELECT id INTO sec_cs_b  FROM sections WHERE name = 'CS-B 2024';
  SELECT id INTO sec_ec_a  FROM sections WHERE name = 'EC-A 2024';
  SELECT id INTO sec_me_a  FROM sections WHERE name = 'ME-A 2024';
  SELECT id INTO sec_ce_a  FROM sections WHERE name = 'CE-A 2024';
  SELECT id INTO sec_mba_a FROM sections WHERE name = 'MBA-A 2024';

  -- ============================================================
  -- PRINCIPALS (2)
  -- ============================================================
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'principal1@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'principal1@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"principal"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'principal1@demo.com';
  INSERT INTO profiles (id, role) VALUES (new_uid, 'principal') ON CONFLICT (id) DO NOTHING;

  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'principal2@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'principal2@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"principal"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'principal2@demo.com';
  INSERT INTO profiles (id, role) VALUES (new_uid, 'principal') ON CONFLICT (id) DO NOTHING;

  -- ============================================================
  -- FACULTY (5)
  -- ============================================================
  -- Prof. Anand Mehta
  fid := NULL;
  INSERT INTO faculty (name, email, department_id, designation, joining_date, status)
  VALUES ('Prof. Anand Mehta', 'teacher1@demo.com', dept_cs, 'Associate Professor', '2020-06-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO fid;
  IF fid IS NULL THEN SELECT id INTO fid FROM faculty WHERE email = 'teacher1@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'teacher1@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'teacher1@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"faculty"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'teacher1@demo.com';
  INSERT INTO profiles (id, role, faculty_id) VALUES (new_uid, 'faculty', fid) ON CONFLICT (id) DO UPDATE SET faculty_id = fid;

  -- Prof. Kavitha Nair
  fid := NULL;
  INSERT INTO faculty (name, email, department_id, designation, joining_date, status)
  VALUES ('Prof. Kavitha Nair', 'teacher2@demo.com', dept_ec, 'Assistant Professor', '2021-07-15', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO fid;
  IF fid IS NULL THEN SELECT id INTO fid FROM faculty WHERE email = 'teacher2@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'teacher2@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'teacher2@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"faculty"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'teacher2@demo.com';
  INSERT INTO profiles (id, role, faculty_id) VALUES (new_uid, 'faculty', fid) ON CONFLICT (id) DO UPDATE SET faculty_id = fid;

  -- Prof. Suresh Babu
  fid := NULL;
  INSERT INTO faculty (name, email, department_id, designation, joining_date, status)
  VALUES ('Prof. Suresh Babu', 'teacher3@demo.com', dept_me, 'Professor', '2018-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO fid;
  IF fid IS NULL THEN SELECT id INTO fid FROM faculty WHERE email = 'teacher3@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'teacher3@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'teacher3@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"faculty"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'teacher3@demo.com';
  INSERT INTO profiles (id, role, faculty_id) VALUES (new_uid, 'faculty', fid) ON CONFLICT (id) DO UPDATE SET faculty_id = fid;

  -- Prof. Deepa Reddy
  fid := NULL;
  INSERT INTO faculty (name, email, department_id, designation, joining_date, status)
  VALUES ('Prof. Deepa Reddy', 'teacher4@demo.com', dept_mba, 'Associate Professor', '2019-06-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO fid;
  IF fid IS NULL THEN SELECT id INTO fid FROM faculty WHERE email = 'teacher4@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'teacher4@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'teacher4@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"faculty"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'teacher4@demo.com';
  INSERT INTO profiles (id, role, faculty_id) VALUES (new_uid, 'faculty', fid) ON CONFLICT (id) DO UPDATE SET faculty_id = fid;

  -- Prof. Vikram Singh
  fid := NULL;
  INSERT INTO faculty (name, email, department_id, designation, joining_date, status)
  VALUES ('Prof. Vikram Singh', 'teacher5@demo.com', dept_cs, 'Assistant Professor', '2022-01-10', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO fid;
  IF fid IS NULL THEN SELECT id INTO fid FROM faculty WHERE email = 'teacher5@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'teacher5@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'teacher5@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"faculty"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'teacher5@demo.com';
  INSERT INTO profiles (id, role, faculty_id) VALUES (new_uid, 'faculty', fid) ON CONFLICT (id) DO UPDATE SET faculty_id = fid;

  -- Fetch Faculty IDs
  SELECT id INTO f1 FROM faculty WHERE email = 'teacher1@demo.com';
  SELECT id INTO f2 FROM faculty WHERE email = 'teacher2@demo.com';
  SELECT id INTO f3 FROM faculty WHERE email = 'teacher3@demo.com';
  SELECT id INTO f4 FROM faculty WHERE email = 'teacher4@demo.com';
  SELECT id INTO f5 FROM faculty WHERE email = 'teacher5@demo.com';
  -- ============================================================
  -- STUDENTS (20)
  -- ============================================================
  -- Aarav Sharma
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Aarav Sharma', 'student01@demo.com', '2004-03-15', dept_cs, course_btcs, sec_cs_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student01@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student01@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student01@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student01@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Aisha Khan
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Aisha Khan', 'student02@demo.com', '2004-07-22', dept_cs, course_btcs, sec_cs_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student02@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student02@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student02@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student02@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Arjun Patel
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Arjun Patel', 'student03@demo.com', '2004-01-10', dept_cs, course_btcs, sec_cs_b, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student03@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student03@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student03@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student03@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Divya Menon
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Divya Menon', 'student04@demo.com', '2003-11-05', dept_cs, course_btcs, sec_cs_b, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student04@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student04@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student04@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student04@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Karan Verma
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Karan Verma', 'student05@demo.com', '2004-06-18', dept_cs, course_btcs, sec_cs_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student05@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student05@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student05@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student05@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Meera Iyer
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Meera Iyer', 'student06@demo.com', '2004-02-28', dept_ec, course_btec, sec_ec_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student06@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student06@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student06@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student06@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Nikhil Rao
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Nikhil Rao', 'student07@demo.com', '2003-09-14', dept_ec, course_btec, sec_ec_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student07@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student07@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student07@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student07@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Pooja Desai
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Pooja Desai', 'student08@demo.com', '2004-04-30', dept_ec, course_btec, sec_ec_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student08@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student08@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student08@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student08@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Rahul Gupta
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Rahul Gupta', 'student09@demo.com', '2004-08-12', dept_ec, course_btec, sec_ec_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student09@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student09@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student09@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student09@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Sneha Pillai
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Sneha Pillai', 'student10@demo.com', '2003-12-03', dept_me, course_btme, sec_me_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student10@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student10@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student10@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student10@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Tanmay Joshi
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Tanmay Joshi', 'student11@demo.com', '2004-05-20', dept_me, course_btme, sec_me_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student11@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student11@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student11@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student11@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Usha Nambiar
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Usha Nambiar', 'student12@demo.com', '2004-01-25', dept_me, course_btme, sec_me_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student12@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student12@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student12@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student12@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Vikram Tiwari
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Vikram Tiwari', 'student13@demo.com', '2003-10-08', dept_me, course_btme, sec_me_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student13@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student13@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student13@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student13@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Yamini Krishnan
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Yamini Krishnan', 'student14@demo.com', '2004-03-22', dept_ce, course_btce, sec_ce_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student14@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student14@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student14@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student14@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Zara Ahmed
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Zara Ahmed', 'student15@demo.com', '2004-07-15', dept_ce, course_btce, sec_ce_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student15@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student15@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student15@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student15@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Akash Bose
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Akash Bose', 'student16@demo.com', '2003-11-18', dept_ce, course_btce, sec_ce_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student16@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student16@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student16@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student16@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Bhavna Kapoor
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Bhavna Kapoor', 'student17@demo.com', '2001-06-05', dept_mba, course_mba1, sec_mba_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student17@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student17@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student17@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student17@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Chirag Malhotra
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Chirag Malhotra', 'student18@demo.com', '2000-09-27', dept_mba, course_mba1, sec_mba_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student18@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student18@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student18@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student18@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Deepika Shetty
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Deepika Shetty', 'student19@demo.com', '2001-03-11', dept_mba, course_mba1, sec_mba_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student19@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student19@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student19@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student19@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  -- Eshan Dubey
  sid := NULL;
  INSERT INTO students (name, email, dob, department_id, course_id, section_id, enrollment_date, status)
  VALUES ('Eshan Dubey', 'student20@demo.com', '2004-12-01', dept_cs, course_btcs, sec_cs_a, '2024-08-01', 'active')
  ON CONFLICT (email) DO NOTHING RETURNING id INTO sid;
  IF sid IS NULL THEN SELECT id INTO sid FROM students WHERE email = 'student20@demo.com'; END IF;
  new_uid := gen_random_uuid();
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'student20@demo.com') THEN
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change)
    VALUES (iid, new_uid, 'authenticated', 'authenticated', 'student20@demo.com', hashed_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"student"}'::jsonb,
      NOW(), NOW(), '', '', '', '');
  END IF;
  SELECT id INTO new_uid FROM auth.users WHERE email = 'student20@demo.com';
  INSERT INTO profiles (id, role, student_id) VALUES (new_uid, 'student', sid) ON CONFLICT (id) DO UPDATE SET student_id = sid;

  RAISE NOTICE 'Demo seed completed.';
END $$;
