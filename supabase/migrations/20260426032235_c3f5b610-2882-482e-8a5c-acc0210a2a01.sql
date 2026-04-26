
-- ===========================================================
-- 1. wg_application_drafts: lock down all anon access
-- ===========================================================
DROP POLICY IF EXISTS "Anyone can read drafts" ON public.wg_application_drafts;
DROP POLICY IF EXISTS "Anyone can update drafts" ON public.wg_application_drafts;
DROP POLICY IF EXISTS "Anyone can insert drafts" ON public.wg_application_drafts;

-- Only admins can read/update via direct DB; all client traffic goes through edge function w/ service role
CREATE POLICY "Admins read drafts"
ON public.wg_application_drafts
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins delete already exists; keep it.

-- ===========================================================
-- 2. wg_application_scoring: only service role inserts
-- ===========================================================
DROP POLICY IF EXISTS "Anyone can create scoring" ON public.wg_application_scoring;
-- (No policy for INSERT means anon/authenticated cannot insert; service_role bypasses RLS.)

-- Re-harden the trigger so it only runs for service-role-driven inserts and clamps values
CREATE OR REPLACE FUNCTION public.sync_application_scoring()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only propagate to applications when current role is service_role (i.e. trusted edge function path)
  IF current_setting('request.jwt.claims', true) IS NULL
     OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role'
  THEN
    IF NEW.application_id IS NOT NULL THEN
      UPDATE public.wg_network_applications
         SET current_score = LEAST(100, GREATEST(0, NEW.total_score)),
             current_tier  = CASE
               WHEN NEW.tier IN ('basic','advanced','premium') THEN NEW.tier
               ELSE 'basic'
             END
       WHERE id = NEW.application_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Make sure trigger exists (recreate cleanly)
DROP TRIGGER IF EXISTS trg_sync_application_scoring ON public.wg_application_scoring;
CREATE TRIGGER trg_sync_application_scoring
AFTER INSERT ON public.wg_application_scoring
FOR EACH ROW EXECUTE FUNCTION public.sync_application_scoring();

-- ===========================================================
-- 3. wg_network_applications: force status=pending on anon insert
-- ===========================================================
DROP POLICY IF EXISTS "Anyone can create applications" ON public.wg_network_applications;
CREATE POLICY "Anyone can create applications (pending only)"
ON public.wg_network_applications
FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND current_score IS NULL OR current_score = 0
  AND (current_tier IS NULL OR current_tier = 'basic')
  AND approved_at IS NULL
);

-- ===========================================================
-- 4. wg_signed_agreements: only service role inserts (via edge fn)
-- ===========================================================
DROP POLICY IF EXISTS "Anyone can create signed agreements" ON public.wg_signed_agreements;
-- service_role bypasses RLS, so no policy needed for INSERT from the edge function.

-- ===========================================================
-- 5. wg_network_documents: keep open insert but tie to a real application
-- ===========================================================
DROP POLICY IF EXISTS "Anyone can create documents" ON public.wg_network_documents;
CREATE POLICY "Anyone can create documents for existing application"
ON public.wg_network_documents
FOR INSERT TO anon, authenticated
WITH CHECK (
  application_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.wg_network_applications a WHERE a.id = application_id)
);

-- ===========================================================
-- 6. Realtime: scope wg_incidence_messages topic subscriptions
-- ===========================================================
-- Enable RLS on realtime.messages (no-op if already enabled)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop our prior policy if rerunning
DROP POLICY IF EXISTS "Incidence chat topic auth" ON realtime.messages;

CREATE POLICY "Incidence chat topic auth"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- topic format: incidence-chat-<incidence_id>
  CASE
    WHEN realtime.topic() LIKE 'incidence-chat-%' THEN
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.wg_incidences i
        WHERE i.id::text = substring(realtime.topic() FROM 'incidence-chat-(.*)')
          AND i.assigned_user_id = auth.uid()
      )
    ELSE false
  END
);
