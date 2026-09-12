-- ============================================================
-- College ERP — Migration 008: Restore valid fees access rules
-- ============================================================
-- Root cause:
-- The performance-oriented RLS cleanup migration removed the custom
-- fee policies without replacing them, so principal/super_admin
-- users lost access to fee data and students could not read their
-- own fee records.
--
-- Fix:
-- 1. Recreate fees policies explicitly for SELECT/INSERT/UPDATE/DELETE
-- 2. Keep access strictly to principal/super_admin for writes
-- 3. Allow students to read only their own fee rows
-- 4. Ensure the fee summary views honor caller RLS
-- ============================================================

DROP POLICY IF EXISTS "fees: super_admin all" ON fees;
DROP POLICY IF EXISTS "fees: principal all" ON fees;
DROP POLICY IF EXISTS "fees: student read own" ON fees;
DROP ALL POLICIES ON fees;

CREATE POLICY "fees_select_combined" ON fees
  FOR SELECT
  USING (
    (
      (SELECT auth.uid()) IS NOT NULL
      AND (
        student_id = get_my_student_id()
        OR (SELECT get_my_role()) IN ('principal', 'super_admin')
      )
    )
  );

CREATE POLICY "fees_insert_combined" ON fees
  FOR INSERT
  WITH CHECK (
    (SELECT get_my_role()) IN ('principal', 'super_admin')
  );

CREATE POLICY "fees_update_combined" ON fees
  FOR UPDATE
  USING (
    (SELECT get_my_role()) IN ('principal', 'super_admin')
  )
  WITH CHECK (
    (SELECT get_my_role()) IN ('principal', 'super_admin')
  );

CREATE POLICY "fees_delete_combined" ON fees
  FOR DELETE
  USING (
    (SELECT get_my_role()) IN ('principal', 'super_admin')
  );

ALTER VIEW public.v_fee_summary SET (security_invoker = true);
ALTER VIEW public.v_student_fee_summary SET (security_invoker = true);
