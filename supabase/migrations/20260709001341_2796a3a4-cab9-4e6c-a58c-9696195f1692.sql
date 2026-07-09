DROP POLICY IF EXISTS "Anyone can create applications (pending only)" ON public.wg_network_applications;

CREATE POLICY "Anyone can create applications (pending only)"
ON public.wg_network_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'pending'
  AND current_score = 0
  AND (current_tier IS NULL OR current_tier = 'basic')
  AND approved_at IS NULL
);