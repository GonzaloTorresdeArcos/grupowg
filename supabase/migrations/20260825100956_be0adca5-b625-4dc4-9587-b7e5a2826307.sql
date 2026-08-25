REVOKE ALL ON FUNCTION public.ops_delegaciones(date,date,text,text,text,text,text,text,text,text,text) FROM anon;
NOTIFY pgrst, 'reload schema';