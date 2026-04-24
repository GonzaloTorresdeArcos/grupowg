import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Loader2, Building2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

const PortalProfile = () => {
  const { profile, user, refreshProfile } = useAuth();
  const { isAdmin } = useUserRole();
  const [saving, setSaving] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  const handleBootstrapAdmin = async () => {
    setBootstrapping(true);
    const { data, error } = await supabase.functions.invoke("bootstrap-admin");
    setBootstrapping(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Error");
      return;
    }
    toast.success("Ahora eres administrador. Recarga la página.");
    setTimeout(() => window.location.reload(), 1200);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!profile) return;
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: String(fd.get("display_name") || ""),
        phone: String(fd.get("phone") || ""),
        company_name: String(fd.get("company_name") || ""),
      })
      .eq("user_id", profile.user_id);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    await refreshProfile();
    toast.success("Perfil actualizado");
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <p className="eyebrow mb-2">Perfil</p>
        <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">
          Datos del colaborador
        </h1>
        <p className="text-muted-foreground mt-2">Información de tu cuenta y empresa</p>
      </div>

      {/* Application link status */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
            profile?.application_id ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"
          }`}>
            {profile?.application_id ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-ink">Vinculación con WG Network</p>
              {profile?.application_id ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                  Vinculado
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/20">
                  Sin vincular
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {profile?.application_id
                ? "Tu cuenta está vinculada a una solicitud aprobada en la red."
                : "No encontramos una solicitud activa con tu email. Contacta con nuestro equipo o inscríbete en la red."}
            </p>
          </div>
        </div>
      </Card>

      {/* Profile form */}
      <Card className="p-6 md:p-8">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email || ""} disabled />
            <p className="text-xs text-muted-foreground">El email se gestiona desde el inicio de sesión.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Nombre completo</Label>
            <Input id="display_name" name="display_name" defaultValue={profile?.display_name || ""} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_name">Empresa</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="company_name"
                name="company_name"
                defaultValue={profile?.company_name || ""}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={profile?.phone || ""} />
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar cambios
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default PortalProfile;
