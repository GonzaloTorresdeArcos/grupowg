import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useIsManagement = () => {
  const { user } = useAuth();
  const [isManagement, setIsManagement] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsManagement(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "management")
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setIsManagement(!!data);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  return { isManagement, loading };
};
