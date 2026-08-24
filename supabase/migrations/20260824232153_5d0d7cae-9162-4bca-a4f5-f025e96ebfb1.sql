ALTER TABLE public.ops_carga_log DROP CONSTRAINT ops_carga_log_dominio_check;
ALTER TABLE public.ops_carga_log ADD CONSTRAINT ops_carga_log_dominio_check
  CHECK (dominio IN ('ot','rrhh','rrhh_logistica','coste','pieza_solicitud','expedicion','expedicion_linea',
                     'stock','geo','registry','alias','calendario','csat','reclamaciones'));