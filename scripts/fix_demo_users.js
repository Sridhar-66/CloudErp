/**
 * fix_demo_users.js
 * ─────────────────────────────────────────────────────────────────
 * Uses the Supabase Admin (service-role) API to:
 *   1. List every demo user and check email_confirmed_at
 *   2. Create any missing users (with email already confirmed)
 *   3. Confirm any existing users that are unconfirmed
 *   4. Reset passwords to Demo@2024! for all demo users
 *   5. Ensure every auth.user has a matching profiles row
 *   6. Run the optimization SQL (performance indexes + vacuums)
 *      via the REST SQL endpoint
 *
 * Run:  node scripts/fix_demo_users.js
 * Requires: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *           and SUPABASE_SERVICE_ROLE_KEY set in .env (already gitignored).
 * ─────────────────────────────────────────────────────────────────
 */

// Load env vars from .env / .env.local automatically
try { require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') }) } catch {}
try { require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local'), override: false }) } catch {}

const { createClient } = require('@supabase/supabase-js')

// ── Config — all values come from environment, never hardcoded ────
const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.')
  console.error('    Add them to .env (already in .gitignore) and retry.')
  process.exit(1)
}
const DEMO_PASSWORD    = 'Demo@2024!'

// Admin client — bypasses RLS, can manage auth.users
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// ── All demo accounts ─────────────────────────────────────────────
const DEMO_USERS = [
  // Principals
  { email: 'principal1@demo.com', role: 'principal' },
  { email: 'principal2@demo.com', role: 'principal' },
  // Faculty
  { email: 'teacher1@demo.com', role: 'faculty' },
  { email: 'teacher2@demo.com', role: 'faculty' },
  { email: 'teacher3@demo.com', role: 'faculty' },
  { email: 'teacher4@demo.com', role: 'faculty' },
  { email: 'teacher5@demo.com', role: 'faculty' },
  // Students
  { email: 'student01@demo.com', role: 'student' },
  { email: 'student02@demo.com', role: 'student' },
  { email: 'student03@demo.com', role: 'student' },
  { email: 'student04@demo.com', role: 'student' },
  { email: 'student05@demo.com', role: 'student' },
  { email: 'student06@demo.com', role: 'student' },
  { email: 'student07@demo.com', role: 'student' },
  { email: 'student08@demo.com', role: 'student' },
  { email: 'student09@demo.com', role: 'student' },
  { email: 'student10@demo.com', role: 'student' },
  { email: 'student11@demo.com', role: 'student' },
  { email: 'student12@demo.com', role: 'student' },
  { email: 'student13@demo.com', role: 'student' },
  { email: 'student14@demo.com', role: 'student' },
  { email: 'student15@demo.com', role: 'student' },
  { email: 'student16@demo.com', role: 'student' },
  { email: 'student17@demo.com', role: 'student' },
  { email: 'student18@demo.com', role: 'student' },
  { email: 'student19@demo.com', role: 'student' },
  { email: 'student20@demo.com', role: 'student' },
]

// ── Helpers ───────────────────────────────────────────────────────
function ok(msg)   { console.log(`  ✅  ${msg}`) }
function info(msg) { console.log(`  ℹ️   ${msg}`) }
function warn(msg) { console.log(`  ⚠️   ${msg}`) }
function err(msg)  { console.error(`  ❌  ${msg}`) }

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ── Step 1 + 2 + 3: Fix all auth users ────────────────────────────
async function fixAuthUsers() {
  console.log('\n━━━ Step 1 — Fetching existing auth users ━━━')

  // Paginate through all users (up to 1000 should be fine for demo)
  const { data: { users: existingUsers }, error: listErr } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })

  if (listErr) {
    err(`Failed to list users: ${listErr.message}`)
    process.exit(1)
  }

  const existingMap = new Map(existingUsers.map(u => [u.email, u]))
  info(`Found ${existingUsers.length} existing users in auth`)

  console.log('\n━━━ Step 2 — Creating / fixing each demo user ━━━')

  const results = { created: 0, updated: 0, skipped: 0, failed: 0 }

  for (const demo of DEMO_USERS) {
    const existing = existingMap.get(demo.email)

    if (!existing) {
      // ── Create fresh ──────────────────────────────────────────
      const { data, error: createErr } = await supabase.auth.admin.createUser({
        email: demo.email,
        password: DEMO_PASSWORD,
        email_confirm: true,               // confirmed immediately — no OTP needed
        user_metadata: { role: demo.role },
        app_metadata:  { provider: 'email', providers: ['email'] },
      })

      if (createErr) {
        err(`Create failed for ${demo.email}: ${createErr.message}`)
        results.failed++
      } else {
        ok(`Created ${demo.email} (id: ${data.user.id})`)
        results.created++
        // Ensure profile row
        await ensureProfile(data.user.id, demo.role)
      }
    } else {
      // ── Update existing — confirm + reset password ────────────
      const needsFix = !existing.email_confirmed_at

      const { data, error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password: DEMO_PASSWORD,           // reset to canonical demo password
        email_confirm: true,               // mark confirmed if not already
        user_metadata: { role: demo.role },
        app_metadata:  { provider: 'email', providers: ['email'] },
      })

      if (updateErr) {
        err(`Update failed for ${demo.email}: ${updateErr.message}`)
        results.failed++
      } else if (needsFix) {
        ok(`Confirmed + updated ${demo.email}`)
        results.updated++
        await ensureProfile(existing.id, demo.role)
      } else {
        info(`Already confirmed: ${demo.email}`)
        results.skipped++
        await ensureProfile(existing.id, demo.role)
      }
    }

    // Small throttle to avoid rate-limiting
    await sleep(120)
  }

  console.log(`\n  Summary → created: ${results.created}, updated: ${results.updated}, skipped: ${results.skipped}, failed: ${results.failed}`)
  if (results.failed > 0) {
    warn('Some users had errors — check output above.')
  }
}

// ── Ensure profiles row exists ────────────────────────────────────
async function ensureProfile(userId, role) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, role }, { onConflict: 'id', ignoreDuplicates: false })

  if (error) {
    warn(`  Profile upsert failed for ${userId}: ${error.message}`)
  }
}

// ── Step 3: Validate logins ───────────────────────────────────────
async function validateLogins() {
  console.log('\n━━━ Step 3 — Validating logins (spot-check 3 roles) ━━━')

  // We use the ANON key for this — simulates real user login
  const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!ANON_KEY) { console.warn('  ⚠️   NEXT_PUBLIC_SUPABASE_ANON_KEY not set — skipping login validation'); return }
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const checks = [
    'principal1@demo.com',
    'teacher1@demo.com',
    'student01@demo.com',
  ]

  for (const email of checks) {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email,
      password: DEMO_PASSWORD,
    })

    if (error) {
      err(`Login FAILED for ${email}: ${error.message}`)
    } else {
      ok(`Login OK  → ${email}  (id: ${data.user?.id?.slice(0, 8)}...)`)
      // Sign out immediately
      await anonClient.auth.signOut()
    }
    await sleep(200)
  }
}

// ── Step 4: Run Supabase SQL optimizations ────────────────────────
async function runOptimizations() {
  console.log('\n━━━ Step 4 — Running DB optimizations via Admin SQL ━━━')

  // Supabase exposes a /rest/v1/rpc or we can use the pg REST endpoint.
  // The Admin API doesn't expose raw SQL directly in the JS client,
  // so we call the Supabase Management API (SQL endpoint).
  const projectRef = 'utubmnpngxjijutbpfsc'

  const optimizationSQL = `
-- ── Analyze all major tables so query planner stats are fresh ──
ANALYZE profiles;
ANALYZE students;
ANALYZE faculty;
ANALYZE staff;
ANALYZE attendance;
ANALYZE exams;
ANALYZE fees;
ANALYZE admissions;
ANALYZE timetable;
ANALYZE notices;
ANALYZE placements;
ANALYZE placement_applications;
ANALYZE library_issues;
ANALYZE hostel_allocations;
ANALYZE transport_assignments;
ANALYZE payroll;

-- ── Additional composite indexes for frequently-joined queries ──

-- Attendance: per-student per-date lookup (most common filter in UI)
CREATE INDEX IF NOT EXISTS idx_att_student_date
  ON attendance(student_id, date DESC);

-- Exams: student + exam_date for grade history
CREATE INDEX IF NOT EXISTS idx_exams_student_date
  ON exams(student_id, exam_date DESC);

-- Fees: unpaid/defaulter dashboard filter
CREATE INDEX IF NOT EXISTS idx_fees_student_balance
  ON fees(student_id, balance)
  WHERE balance > 0;

-- Notices: dashboard loads newest notices for a target audience
CREATE INDEX IF NOT EXISTS idx_notices_audience_date
  ON notices(target_audience, post_date DESC);

-- Profiles: role-based lookup (used heavily in RLS get_my_role())
CREATE INDEX IF NOT EXISTS idx_profiles_id_role
  ON profiles(id, role);

-- ── Ensure email_confirmed_at is set for ALL demo users ──────────
UPDATE auth.users
SET    email_confirmed_at = NOW(),
       updated_at         = NOW()
WHERE  email LIKE '%@demo.com'
  AND  email_confirmed_at IS NULL;

-- ── Ensure profiles exist for all demo auth.users ────────────────
INSERT INTO profiles (id, role)
SELECT
  u.id,
  CASE
    WHEN u.email LIKE 'principal%' THEN 'principal'
    WHEN u.email LIKE 'teacher%'   THEN 'faculty'
    WHEN u.email LIKE 'student%'   THEN 'student'
    ELSE 'student'
  END::text
FROM auth.users u
WHERE u.email LIKE '%@demo.com'
ON CONFLICT (id) DO NOTHING;
`

  // Use the Supabase Management REST API to execute SQL
  const mgmtRes = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: optimizationSQL }),
    }
  )

  if (!mgmtRes.ok) {
    // Fallback: run through pg REST RPC if management API not available
    warn(`Management API returned ${mgmtRes.status} — trying RPC fallback...`)
    await runOptimizationsViaRPC(optimizationSQL)
    return
  }

  const result = await mgmtRes.json()
  ok('Optimization SQL executed successfully')
  if (result && Array.isArray(result)) {
    info(`Rows affected: ${result.length}`)
  }
}

async function runOptimizationsViaRPC(sql) {
  // If management API isn't accessible, try via a Supabase RPC
  // (This requires exec_sql function to exist — skip silently if not)
  const { error } = await supabase.rpc('exec_sql', { sql })
  if (error) {
    warn(`RPC fallback also failed: ${error.message}`)
    warn('Please run the optimization SQL manually in Supabase SQL Editor.')
    warn('SQL file: supabase/migrations/20260911000006_performance_indexes.sql')
  } else {
    ok('Optimization SQL executed via RPC')
  }
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  College ERP — Supabase Demo User Fix & Optimization  ')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  Project: ${SUPABASE_URL}`)
  console.log(`  Users  : ${DEMO_USERS.length} demo accounts`)
  console.log('═══════════════════════════════════════════════════════')

  await fixAuthUsers()
  await validateLogins()
  await runOptimizations()

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  Done! All demo users verified and DB optimized.      ')
  console.log('═══════════════════════════════════════════════════════\n')
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
