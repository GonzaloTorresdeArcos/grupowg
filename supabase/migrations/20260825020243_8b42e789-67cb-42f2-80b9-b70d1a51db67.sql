-- A6 · ops_evolucion sin materialización del CTE base.
-- Antes: CTE `base` referenciado dos veces => Postgres lo materializaba
-- (copia completa de las OT filtradas) y perdía los índices parciales.
-- Ahora: predicados inline en cada agregación, cada una acotada a la ventana
-- de 18 meses (VENTANAS_PROPIAS.panorama_evolucion) desde ops_as_of('ot').
CREATE OR REPLACE FUNCTION public.ops_evolucion(
  p_delegacion text DEFAULT NULL, p_cliente text DEFAULT NULL, p_gama text DEFAULT NULL,
  p_familia text DEFAULT NULL, p_marca text DEFAULT NULL, p_provincia text DEFAULT NULL,
  p_sat text DEFAULT NULL, p_tecnico text DEFAULT NULL, p_canal text DEFAULT NULL)
RETURNS TABLE(mes date, creadas bigint, cerradas bigint, pct_sla20 numeric, pct_bajas numeric)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH lim AS (
    SELECT (date_trunc('month', public.ops_as_of('ot')) - INTERVAL '17 months')::date AS desde,
           (date_trunc('month', public.ops_as_of('ot')))::date AS hasta
  ),
  meses AS (
    SELECT generate_series(l.desde, l.hasta, '1 month')::date AS mes FROM lim l
  ),
  cre AS (
    SELECT date_trunc('month', o.fecha_creacion)::date AS mes, COUNT(*) AS n
    FROM public.ops_fact_ot o, lim l
    WHERE o.es_anulado = false
      AND o.fecha_creacion >= l.desde
      AND (p_delegacion IS NULL OR o.delegacion = p_delegacion)
      AND (p_cliente IS NULL OR o.cliente_wg = p_cliente)
      AND (p_gama IS NULL OR o.gama_real = p_gama)
      AND (p_familia IS NULL OR o.familia = p_familia)
      AND (p_marca IS NULL OR o.marca = p_marca)
      AND (p_provincia IS NULL OR o.provincia = p_provincia)
      AND (p_sat IS NULL OR o.sat = p_sat)
      AND (p_tecnico IS NULL OR o.tecnico = p_tecnico)
      AND (p_canal IS NULL OR o.canal = p_canal)
    GROUP BY 1
  ),
  cer AS (
    SELECT date_trunc('month', o.fecha_cierre)::date AS mes, COUNT(*) AS n,
      COUNT(*) FILTER (WHERE o.kpi_20d)::numeric / NULLIF(COUNT(*),0) AS sla,
      COUNT(*) FILTER (WHERE o.es_baja)::numeric / NULLIF(COUNT(*),0) AS bajas
    FROM public.ops_fact_ot o, lim l
    WHERE o.es_anulado = false
      AND o.situacion IN ('Cerrado','Baja')
      AND o.fecha_cierre >= l.desde
      AND (p_delegacion IS NULL OR o.delegacion = p_delegacion)
      AND (p_cliente IS NULL OR o.cliente_wg = p_cliente)
      AND (p_gama IS NULL OR o.gama_real = p_gama)
      AND (p_familia IS NULL OR o.familia = p_familia)
      AND (p_marca IS NULL OR o.marca = p_marca)
      AND (p_provincia IS NULL OR o.provincia = p_provincia)
      AND (p_sat IS NULL OR o.sat = p_sat)
      AND (p_tecnico IS NULL OR o.tecnico = p_tecnico)
      AND (p_canal IS NULL OR o.canal = p_canal)
    GROUP BY 1
  )
  SELECT m.mes, COALESCE(cre.n,0), COALESCE(cer.n,0), COALESCE(cer.sla,0), COALESCE(cer.bajas,0)
  FROM meses m LEFT JOIN cre ON cre.mes = m.mes LEFT JOIN cer ON cer.mes = m.mes
  ORDER BY m.mes;
$function$;