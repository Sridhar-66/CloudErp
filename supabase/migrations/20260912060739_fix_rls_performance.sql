-- ============================================================
-- College ERP — Migration 007: RLS Performance Fix
-- ============================================================
-- Addresses four Supabase Performance Advisor warnings:
--
--   1. Auth RLS Initialization Plan (6 tables)
--      profiles, departments, courses, sections, subjects, books
--      Root cause: auth.uid() / custom auth functions called directly
--      in policy USING/WITH CHECK clauses — evaluated once per row.
--      Fix: wrap in (select ...) subqueries so the result is cached
--      once per query.
--
--   2. Multiple Permissive Policies (all 21 RLS tables)
--      Root cause: one PERMISSIVE policy per role per action. Postgres
--      must evaluate and OR every policy on every query.
--      Fix: DROP ALL POLICIES per table, recreate ONE policy per
--      command (SELECT/INSERT/UPDATE/DELETE) with OR-combined
--      role conditions.
--
--   3. Security Definer Views (13 views)
--      Root cause: views run as the view owner (postgres, which has
--      BYPASSRLS), so RLS is bypassed entirely on underlying tables.
--      Fix: ALTER VIEW ... SET (security_invoker = true) so the
--      querying user's own RLS policies apply.
--
--   4. Function Search Path Mutable (5 functions)
--      Root cause: functions don't pin search_path, allowing
--      search_path hijacking via schema manipulation.
--      Fix: ALTER FUNCTION ... SET search_path = public.
--
-- NO access-control logic is changed. The same roles retain the
-- same permissions — only HOW the policies are evaluated changes.
-- ============================================================


-- ============================================================
-- Part A: Fix Function Search Path Mutable warnings (5 functions)
-- ============================================================
-- Pin search_path to public for every custom function so that
-- unqualified object references inside them resolve to the
-- public schema only, preventing search_path injection.

ALTER FUNCTION public.get_my_role()              SET search_path = public;
ALTER FUNCTION public.get_my_student_id()        SET search_path = public;
ALTER FUNCTION public.get_my_faculty_id()        SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_new_user()          SET search_path = public;


-- ============================================================
-- Part B: Consolidate RLS policies + wrap auth calls in subqueries
-- ============================================================
-- For each table: DROP ALL POLICIES, then CREATE one policy per
-- command (SELECT/INSERT/UPDATE/DELETE) with OR-combined role
-- conditions and every auth call wrapped in (select ...).
--
-- FOR ALL policies are split into 4 command types so each table
-- ends up with exactly 1 PERMISSIVE policy per command, eliminating
-- the Multiple Permissive Policies warning.

-- ------------------------------------------------------------
-- PROFILES
-- SELECT: any auth user reads own + super_admin reads all
-- WRITE:  super_admin only
-- ------------------------------------------------------------
DROP ALL POLICIES ON profiles;

CREATE POLICY "profiles_select_combined" ON profiles FOR SELECT
  USING (
    (select auth.uid()) = id
    OR (select get_my_role()) = 'super_admin'
  );

CREATE POLICY "profiles_insert_combined" ON profiles FOR INSERT
  WITH CHECK ((select get_my_role()) = 'super_admin');

CREATE POLICY "profiles_update_combined" ON profiles FOR UPDATE
  USING ((select get_my_role()) = 'super_admin')
  WITH CHECK ((select get_my_role()) = 'super_admin');

CREATE POLICY "profiles_delete_combined" ON profiles FOR DELETE
  USING ((select get_my_role()) = 'super_admin');

-- ------------------------------------------------------------
-- DEPARTMENTS
-- SELECT: any auth user + super_admin
-- WRITE:  super_admin only
-- ------------------------------------------------------------
DROP ALL POLICIES ON departments;

CREATE POLICY "departments_select_combined" ON departments FOR SELECT
  USING (
    (select auth.uid()) IS NOT NULL
    OR (select get_my_role()) = 'super_admin'
  );

CREATE POLICY "departments_insert_combined" ON departments FOR INSERT
  WITH CHECK ((select get_my_role()) = 'super_admin');

CREATE POLICY "departments_update_combined" ON departments FOR UPDATE
  USING ((select get_my_role()) = 'super_admin')
  WITH CHECK ((select get_my_role()) = 'super_admin');

CREATE POLICY "departments_delete_combined" ON departments FOR DELETE
  USING ((select get_my_role()) = 'super_admin');

-- ------------------------------------------------------------
-- COURSES
-- SELECT: any auth user + super_admin
-- WRITE:  super_admin only
-- ------------------------------------------------------------
DROP ALL POLICIES ON courses;

CREATE POLICY "courses_select_combined" ON courses FOR SELECT
  USING (
    (select auth.uid()) IS NOT NULL
    OR (select get_my_role()) = 'super_admin'
  );

CREATE POLICY "courses_insert_combined" ON courses FOR INSERT
  WITH CHECK ((select get_my_role()) = 'super_admin');

CREATE POLICY "courses_update_combined" ON courses FOR UPDATE
  USING ((select get_my_role()) = 'super_admin')
  WITH CHECK ((select get_my_role()) = 'super_admin');

CREATE POLICY "courses_delete_combined" ON courses FOR DELETE
  USING ((select get_my_role()) = 'super_admin');

-- ------------------------------------------------------------
-- SECTIONS
-- SELECT: any auth user + super_admin
-- WRITE:  super_admin only
-- ------------------------------------------------------------
DROP ALL POLICIES ON sections;

CREATE POLICY "sections_select_combined" ON sections FOR SELECT
  USING (
    (select auth.uid()) IS NOT NULL
    OR (select get_my_role()) = 'super_admin'
  );

CREATE POLICY "sections_insert_combined" ON sections FOR INSERT
  WITH CHECK ((select get_my_role()) = 'super_admin');

CREATE POLICY "sections_update_combined" ON sections FOR UPDATE
  USING ((select get_my_role()) = 'super_admin')
  WITH CHECK ((select get_my_role()) = 'super_admin');

CREATE POLICY "sections_delete_combined" ON sections FOR DELETE
  USING ((select get_my_role()) = 'super_admin');
