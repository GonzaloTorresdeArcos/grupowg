-- Harden wg-documents / wg-agreements storage policies.
-- 1) Restrict anon INSERT to only folders that match a pending application row
--    (mitigates arbitrary UUID guessing / overwriting).
-- 2) Add admin-scoped UPDATE and DELETE policies so file lifecycle is manageable.

DROP POLICY IF EXISTS "Upload wg docs with uuid path" ON storage.objects;
DROP POLICY IF EXISTS "Upload signed agreements with uuid path" ON storage.objects;

CREATE POLICY "Upload wg docs into pending application folder"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'wg-documents'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    lower(right(name, 4)) IN ('.pdf', '.jpg', '.png')
    OR lower(right(name, 5)) IN ('.jpeg', '.webp')
  )
  AND EXISTS (
    SELECT 1
    FROM public.wg_network_applications a
    WHERE a.id::text = (storage.foldername(name))[1]
      AND a.status IN ('pending', 'in_review', 'draft')
      AND a.created_at > now() - interval '30 days'
  )
);

CREATE POLICY "Upload signed agreement into own application folder"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'wg-agreements'
  AND (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND lower(right(name, 4)) = '.pdf'
  AND EXISTS (
    SELECT 1
    FROM public.wg_network_applications a
    WHERE a.id::text = (storage.foldername(name))[1]
      AND a.status IN ('pending', 'in_review', 'draft', 'approved')
      AND a.created_at > now() - interval '90 days'
  )
);

-- Admin-scoped UPDATE / DELETE policies for both buckets (lifecycle management).
DROP POLICY IF EXISTS "Admins can update wg documents" ON storage.objects;
CREATE POLICY "Admins can update wg documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'wg-documents' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'wg-documents' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete wg documents" ON storage.objects;
CREATE POLICY "Admins can delete wg documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'wg-documents' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update wg agreements" ON storage.objects;
CREATE POLICY "Admins can update wg agreements"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'wg-agreements' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'wg-agreements' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete wg agreements" ON storage.objects;
CREATE POLICY "Admins can delete wg agreements"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'wg-agreements' AND public.has_role(auth.uid(), 'admin'));
