-- Las comprobaciones de permisos aparecen en el predicado RLS de todas las
-- tablas ops_*. Al estar marcadas PARALLEL UNSAFE (valor por defecto para
-- funciones SECURITY DEFINER) el planificador desactivaba el paralelismo en
-- cualquier consulta ejecutada por un usuario real, con un coste medido de
-- 8,3 s frente a 0,32 s con el mismo cuerpo sin RLS. Son funciones de solo
-- lectura sobre user_roles, aptas para paralelo.
ALTER FUNCTION public.is_management(uuid) PARALLEL SAFE;
ALTER FUNCTION public.has_role(uuid, public.app_role) PARALLEL SAFE;
ALTER FUNCTION public.ops_clasifica_gama(text, text, text, text) PARALLEL SAFE;