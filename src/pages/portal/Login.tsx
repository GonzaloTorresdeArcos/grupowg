import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User as UserIcon, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

const PortalLogin = () => {
  const { t } = useTranslation("portal");
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  const from = (location.state as { from?: string } | null)?.from || "/portal";

  useEffect(() => {
    if (!authLoading && user) navigate(from, { replace: true });
  }, [user, authLoading, navigate, from]);

  useEffect(() => {
    document.title = t("seo.loginTitle");
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("seo.loginDescription"));
  }, [t]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
    });
    setLoading(false);
    if (error) {
      toast.error(t("login.toasts.signinError"), { description: error.message });
      return;
    }
    toast.success(t("login.toasts.signinOk"));
    navigate(from, { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      options: {
        emailRedirectTo: `${window.location.origin}/portal`,
        data: { full_name: String(fd.get("name")) },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(t("login.toasts.signupError"), { description: error.message });
      return;
    }
    toast.success(t("login.toasts.signupOk"), {
      description: t("login.toasts.signupOkDesc"),
    });
    navigate(from, { replace: true });
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/portal`,
    });
    if (result.error) {
      setLoading(false);
      toast.error(t("login.toasts.googleError"), { description: String(result.error) });
    }
  };

  return (
    <div className="min-h-screen bg-bone flex flex-col">
      <div className="container-tight py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink/60 hover:text-ink transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t("login.back")}
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <p className="eyebrow mb-3">{t("login.eyebrow")}</p>
            <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">
              {t("login.title")}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("login.subtitle")}
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="signin">{t("login.tabs.signin")}</TabsTrigger>
                <TabsTrigger value="signup">{t("login.tabs.signup")}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t("login.fields.email")}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signin-email" name="email" type="email" required placeholder={t("login.fields.emailPlaceholder")} className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t("login.fields.password")}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signin-password" name="password" type="password" required minLength={6} className="pl-9" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("login.submit.signin")}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t("login.fields.name")}</Label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-name" name="name" required placeholder={t("login.fields.namePlaceholder")} className="pl-9" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t("login.fields.applicationEmail")}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-email" name="email" type="email" required placeholder={t("login.fields.emailPlaceholder")} className="pl-9" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("login.fields.applicationHelp")}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t("login.fields.password")}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-password" name="password" type="password" required minLength={6} className="pl-9" />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("login.submit.signup")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t("login.divider")}</span>
              </div>
            </div>

            <Button type="button" variant="outline" className="w-full gap-2" onClick={handleGoogle} disabled={loading}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {t("login.google")}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            {t("login.footer")}{" "}
            <Link to="/wg-network/inscripcion" className="text-ink underline-offset-4 hover:underline">
              {t("login.footerLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PortalLogin;
