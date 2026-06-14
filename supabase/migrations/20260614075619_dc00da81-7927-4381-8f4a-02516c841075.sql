
-- 1) Tighten storage upload policies: require UUID-prefixed path so uploads
-- are linked to a specific application/draft folder.
DROP POLICY IF EXISTS "Anyone can upload wg docs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload signed agreements" ON storage.objects;

CREATE POLICY "Upload wg docs with uuid path"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'wg-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND lower(right(name, 4)) IN ('.pdf','.jpg','.png')
       OR lower(right(name, 5)) IN ('.jpeg','.webp')
);

CREATE POLICY "Upload signed agreements with uuid path"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'wg-agreements'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND lower(right(name, 4)) = '.pdf'
);

-- 2) Revoke EXECUTE on SECURITY DEFINER functions from anon/authenticated
-- where they don't need to be callable directly via PostgREST.
-- has_role is invoked from RLS policies (definer ctx), so revoking client EXECUTE is safe.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_application_scoring() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_candidates_for_incidence(text, text, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.grant_admin_by_email(text) FROM PUBLIC, anon;
-- Keep authenticated EXECUTE on grant_admin_by_email and match_candidates_for_incidence
-- (they self-check admin role inside).
