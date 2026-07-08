import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CheckCircle2, AlertTriangle, Clock, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

type Doc = { document_type: string; document_name: string; status: string; expires_at: string | null };
type CertState = "vigente" | "por_caducar" | "caducado" | "pendiente";

const AEAT_RE = /aeat|agencia\s*tribut|tribut|hacienda/i;
const TGSS_RE = /tgss|seguridad\s*social|social/i;
const RANK: Record<CertState, number> = { vigente: 3, por_caducar: 2, caducado: 1, pendiente: 0 };

const docState = (d: Doc): CertState => {
  const st = (d.status || "").toLowerCase();
  const exp = d.expires_at ? new Date(d.expires_at).getTime() : null;
  const now = Date.now();
  if (st === "missing") return "pendiente";
  if (st === "expired" || (exp !== null && exp < now)) return "caducado";
  if (st === "expiring" || (exp !== null && exp - now < 30 * 86400000)) return "por_caducar";
  return "vigente";
};
const bestState = (docs: Doc[]): CertState =>
  docs.length ? docs.map(docState).reduce((a, b) => (RANK[b] > RANK[a] ? b : a), "pendiente" as CertState) : "pendiente";

export const CumplimientoPagos = () => {
  const { t } = useTranslation("portal");
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase.from("wg_collaborator_documents").select("document_type, document_name, status, expires_at").eq("user_id", user.id)
      .then(({ data }) => { if (!cancelled) setDocs((data ?? []) as Doc[]); });
    return () => { cancelled = true; };
  }, [user]);

  const match = (re: RegExp) => docs.filter((d) => re.test(`${d.document_type} ${d.document_name}`));
  const aeat = bestState(match(AEAT_RE));
  const tgss = bestState(match(TGSS_RE));
  const worst = RANK[aeat] < RANK[tgss] ? aeat : tgss;
  const allOk = aeat === "vigente" && tgss === "vigente";

  const META: Record<CertState, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
    vigente: { label: t("compliance.state.valid", { defaultValue: "Vigente" }), cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: CheckCircle2 },
    por_caducar: { label: t("compliance.state.expiring", { defaultValue: "Por caducar" }), cls: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: Clock },
    caducado: { label: t("compliance.state.expired", { defaultValue: "Caducado" }), cls: "bg-red-500/10 text-red-700 border-red-500/20", icon: AlertTriangle },
    pendiente: { label: t("compliance.state.missing", { defaultValue: "Pendiente" }), cls: "bg-muted text-muted-foreground border-border", icon: CircleDashed },
  };

  const Line = ({ label, state }: { label: string; state: CertState }) => {
    const m = META[state];
    const Icon = m.icon;
    return (
      <div className="flex items-center justify-between gap-3 py-2">
        <span className="text-sm text-ink">{label}</span>
        <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border", m.cls)}>
          <Icon className="h-3.5 w-3.5" />{m.label}
        </span>
      </div>
    );
  };

  return (
    <Card className={cn("p-6 md:p-8", !allOk && "border-amber-500/40 bg-amber-50/40")}>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", allOk ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700")}>
          <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div>
          <p className="eyebrow mb-0.5">{t("compliance.eyebrow", { defaultValue: "Cumplimiento" })}</p>
          <h2 className="font-display text-xl text-ink">{t("compliance.title", { defaultValue: "Estar al corriente (para cobrar)" })}</h2>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {t("compliance.body", { defaultValue: "La Administración puede exigir retener pagos a colaboradores con deudas con Hacienda o la Seguridad Social. Mantén vigentes tus certificados de estar al corriente." })}
      </p>

      <div className="rounded-xl border border-border divide-y divide-border px-4">
        <Line label={t("compliance.aeat", { defaultValue: "Hacienda (AEAT)" })} state={aeat} />
        <Line label={t("compliance.tgss", { defaultValue: "Seguridad Social (TGSS)" })} state={tgss} />
      </div>

      {!allOk && (
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-amber-800">
            {worst === "caducado"
              ? t("compliance.warnExpired", { defaultValue: "Certificado caducado: tu cobro puede quedar retenido hasta regularizarlo." })
              : worst === "pendiente"
                ? t("compliance.warnMissing", { defaultValue: "Falta aportar el certificado: necesario para poder tramitar tus cobros." })
                : t("compliance.warnExpiring", { defaultValue: "Certificado próximo a caducar: renuévalo para no bloquear cobros." })}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/portal/documentos">{t("compliance.cta", { defaultValue: "Actualizar documentación" })}</Link>
          </Button>
        </div>
      )}
    </Card>
  );
};
