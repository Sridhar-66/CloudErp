-- ============================================================
-- College ERP — COMBINED MIGRATION
-- Run this entire script in Supabase Dashboard → SQL Editor
-- Run in order: schema first, then RLS, then views
-- ============================================================

-- NOTE: Run each section separately if you encounter errors.
-- The migrations are split into 3 files under supabase/migrations/
-- but can also be run here as a combined script.

\i supabase/migrations/20260909000001_schema.sql
\i supabase/migrations/20260909000002_rls.sql
\i supabase/migrations/20260909000003_views.sql
