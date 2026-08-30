-- =====================================================================
-- I1 · M-03 IDENTIDAD EXTERNA
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.ctr_contraparte_legal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  razon_social text NOT NULL UNIQUE,
  nif_vat text,
  pais text CHECK (pais IS NULL OR pais ~ '^[A-Z]{2}$'),
  grupo_legal text,
  notas text
);

CREATE TABLE IF NOT EXISTS public.ctr_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  carga_id uuid REFERENCES public.ctr_carga(id),
  nombre_display text NOT NULL UNIQUE,
  grupo_cliente text,
  estado text NOT NULL CHECK (estado IN ('activo','historico','prospecto'))
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ctr_contraparte_legal','ctr_cliente'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM authenticator', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('GRANT SELECT ON public.%I TO ctr_gobierno_owner', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='mgmt_select') THEN
      EXECUTE format($p$CREATE POLICY mgmt_select ON public.%I FOR SELECT TO authenticated
                        USING (public.is_management(auth.uid()))$p$, t);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE v_carga uuid; n_cp int; n_cl int;
BEGIN
  SELECT id INTO v_carga FROM public.ctr_carga
   WHERE origen='migracion_i1' AND artefacto_ref='I1/M-01..M-06 semilla catálogos';

  INSERT INTO public.ctr_contraparte_legal (carga_id, razon_social, nif_vat, pais, grupo_legal, notas) VALUES
    (v_carga,'Vestel',NULL,'TR','Vestel','Opera también en ES; razón social exacta pendiente de articulado'),
    (v_carga,'Organisation Intra-Groupe des Achats',NULL,'FR','Auchan',NULL),
    (v_carga,'Centros Comerciales Carrefour SA',NULL,'ES','Carrefour','Sociedad exacta pendiente de confirmar'),
    (v_carga,'Cecotec Innovaciones SLU',NULL,'ES','Cecotec',NULL),
    (v_carga,'Makro Autoservicio Mayorista',NULL,'ES','METRO','Razón social exacta pendiente de confirmar'),
    (v_carga,'Metro Markets GmbH',NULL,'DE','METRO',NULL),
    (v_carga,'Assurant Europe Insurance N.V.',NULL,'NL','Assurant',NULL),
    (v_carga,'PC Componentes y Multimedia SL',NULL,'ES','PC Componentes','Razón social exacta pendiente de confirmar'),
    (v_carga,'Brightway/Navee',NULL,NULL,'Navee','Según contrato 01-abr-2025; razón social exacta pendiente'),
    (v_carga,'Electro Depot España',NULL,'ES','Electro Depot','Matriz FR; sociedad exacta pendiente de confirmar'),
    (v_carga,'Sauber',NULL,'ES','Sauber','Razón social exacta pendiente de confirmar'),
    (v_carga,'Jocel',NULL,'PT','Jocel',NULL),
    (v_carga,'Neumesse SL',NULL,'ES','Neumesse',NULL),
    (v_carga,'MT Distribution',NULL,'IT','MT Distribution','Razón social exacta pendiente de confirmar'),
    (v_carga,'StreamView GmbH',NULL,'DE','StreamView / Thomson',NULL),
    (v_carga,'Telefac',NULL,'ES','Telefac','Razón social exacta pendiente de confirmar')
  ON CONFLICT (razon_social) DO NOTHING;

  INSERT INTO public.ctr_cliente (carga_id, nombre_display, grupo_cliente, estado) VALUES
    (v_carga,'Vestel','Vestel','activo'),
    (v_carga,'Alcampo/Auchan','Auchan','activo'),
    (v_carga,'Carrefour','Carrefour','activo'),
    (v_carga,'Cecotec','Cecotec','activo'),
    (v_carga,'METRO / MAKRO','METRO','activo'),
    (v_carga,'Assurant','Assurant','activo'),
    (v_carga,'PC Componentes','PC Componentes','activo'),
    (v_carga,'Navee/Brightway','Navee','activo'),
    (v_carga,'Electro Depot','Electro Depot','activo'),
    (v_carga,'Sauber','Sauber','activo'),
    (v_carga,'Jocel','Jocel','activo'),
    (v_carga,'Neumesse','Neumesse','activo'),
    (v_carga,'Thomson/StreamView','StreamView / Thomson','activo'),
    (v_carga,'MT Distribution','MT Distribution','activo'),
    (v_carga,'Telefac','Telefac','prospecto')
  ON CONFLICT (nombre_display) DO NOTHING;

  SELECT count(*) INTO n_cp FROM public.ctr_contraparte_legal;
  SELECT count(*) INTO n_cl FROM public.ctr_cliente;
  IF n_cp <> 16 OR n_cl <> 15 THEN
    RAISE EXCEPTION 'M-03 VERIFICACIÓN FALLIDA: contrapartes=% (esperado 16), clientes=% (esperado 15)', n_cp, n_cl;
  END IF;
  RAISE NOTICE 'M-03 OK: contrapartes=% clientes=% (14 activo + 1 prospecto)', n_cp, n_cl;
END $$;