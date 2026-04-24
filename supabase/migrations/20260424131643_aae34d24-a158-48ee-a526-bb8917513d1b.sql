
-- Tabla de log de SMS simulados (mock)
CREATE TABLE public.wg_sms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination TEXT NOT NULL,
  body TEXT NOT NULL,
  context TEXT,
  related_incidence_id UUID,
  related_appointment_id UUID,
  status TEXT NOT NULL DEFAULT 'simulated',
  provider TEXT NOT NULL DEFAULT 'mock',
  sent_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wg_sms_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read sms log"
  ON public.wg_sms_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert sms log"
  ON public.wg_sms_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_wg_sms_log_incidence ON public.wg_sms_log(related_incidence_id);
CREATE INDEX idx_wg_sms_log_created ON public.wg_sms_log(created_at DESC);

-- Tabla de mensajes de chat por incidencia
CREATE TABLE public.wg_incidence_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incidence_id UUID NOT NULL REFERENCES public.wg_incidences(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  sender_role TEXT NOT NULL,
  sender_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wg_incidence_messages ENABLE ROW LEVEL SECURITY;

-- Admins ven todo
CREATE POLICY "Admins manage incidence messages"
  ON public.wg_incidence_messages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Colaborador asignado puede ver/escribir en su incidencia
CREATE POLICY "Assignee reads own incidence messages"
  ON public.wg_incidence_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wg_incidences i
      WHERE i.id = incidence_id AND i.assigned_user_id = auth.uid()
    )
  );

CREATE POLICY "Assignee inserts own incidence messages"
  ON public.wg_incidence_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.wg_incidences i
      WHERE i.id = incidence_id AND i.assigned_user_id = auth.uid()
    )
  );

CREATE INDEX idx_wg_incidence_messages_incidence ON public.wg_incidence_messages(incidence_id, created_at);

-- Habilitar Realtime en mensajes
ALTER PUBLICATION supabase_realtime ADD TABLE public.wg_incidence_messages;
ALTER TABLE public.wg_incidence_messages REPLICA IDENTITY FULL;
