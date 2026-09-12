-- ============================================================
-- College ERP — Migration 009: Align fee RLS policies (canonical set)
-- ============================================================
-- Why this migration exists:
--   Migration 007 (fix_rls_performance) dropped every policy on `fees`
--   but never recreated them, which broke fee access for BOTH students
--   ("fees not showing") and principal/super_admin ("fee overview and
--   bulk-add unusable / missing"). Migration 008 restored a canonical
--   set locally, but live projects drifted to hand-edited `*_merged`
--   policy names, so the repo migrations were no longer the source of
--   truth for `fees` RLS.
--
-- Fix:
--   1. Drop every policy on `fees` — old role-per-table names, the
--      `*_merged` drift names, the canonical `*_combined` names, and
--      anything else — via a portable DO block. (`DROP ALL POLICIES`
--      is only a Supabase SQL-editor convenience and is NOT valid in a
--      plain migration file.)
--   2. Recreate the canonical, combined, role-scoped policy set.
--      - SELECT: authenticated users see their own student fee rows;
--        principal / super_admin see every row.
--      - INSERT / UPDATE / DELETE: principal / super_admin only.
--   3. Re-assert security_invoker on the fee summary views so the views
--      honour the calling user's RLS (idempotent; no-op if already set).
-- ============================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fees'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON fees', pol.policyname);
  END LOOP;
END $$;

-- SELECT: any authenticated user may read fee rows that belong to them
-- (via profiles.student_id) OR that they manage (principal / super_admin).
CREATE POLICY "fees_select_combined" ON fees
  FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      student_id = get_my_student_id()
      OR (SELECT get_my_role()) IN ('principal', 'super_admin')
    )
  );

-- Writes: strictly office roles. Students can never create/edit/delete
-- their own fee records.
CREATE POLICY "fees_insert_combined" ON fees
  FOR INSERT
  WITH CHECK (
    (SELECT get_my_role()) IN ('principal', 'super_admin')
  );

CREATE POLICY "fees_update_combined" ON fees
  FOR UPDATE
  USING ((SELECT get_my_role()) IN ('principal', 'super_admin'))
  WITH CHECK ((SELECT get_my_role()) IN ('principal', 'super_admin'));

CREATE POLICY "fees_delete_combined" ON fees
  FOR DELETE
  USING ((SELECT get_my_role()) IN ('principal', 'super_admin'));

-- Keep the fee summary views honouring the caller's RLS.
ALTER VIEW public.v_fee_summary SET (security_invoker = true);
ALTER VIEW public.v_student_fee_summary SET (security_invoker = true);