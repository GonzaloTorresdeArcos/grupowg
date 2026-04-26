-- Revoke default SELECT from anon/authenticated on all public tables.
-- RLS policies + explicit table grants (managed by Supabase per role)
-- continue to control row-level access. PostgREST uses the role's grants
-- combined with RLS; revoking blanket SELECT closes the pg_graphql
-- introspection surface without breaking the app, which uses targeted
-- RLS policies and edge functions (service_role) for all reads/writes.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE SELECT ON public.%I FROM anon', r.tablename);
  END LOOP;
END$$;

-- Re-grant the minimal privileges needed by RLS-protected flows for
-- authenticated users. RLS still gates which rows they can see.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wg_appointments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wg_collaborator_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wg_incidence_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wg_incidences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wg_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wg_network_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wg_network_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wg_application_drafts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wg_application_scoring TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wg_signed_agreements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wg_accessibility_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wg_otp_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wg_sms_log TO authenticated;

-- Anon role keeps INSERT-only on public-facing tables (RLS WITH CHECK
-- still enforces the conditions defined in the existing policies).
GRANT INSERT ON public.wg_accessibility_requests TO anon;
GRANT INSERT ON public.wg_network_applications TO anon;
GRANT INSERT ON public.wg_network_documents TO anon;