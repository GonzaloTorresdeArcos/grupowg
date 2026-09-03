DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='supabase_read_only_user') THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.ctr_e13_selftest(text,text) TO supabase_read_only_user';
  END IF;
END $$;