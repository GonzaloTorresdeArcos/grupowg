import { useAuth } from "@/hooks/useAuth";
import { Link, Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PROVINCIAS } from "@/lib/spain-provinces";
import { DISTRITOS_PT } from "@/lib/portugal-distritos";
import {
  Wrench, Timer, CheckCircle2, ArrowRight,
  MapPin, AlertTriangle, Inbox, ClipboardList,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { STATUS_LABELS, familiaLabel } from "@/lib/catalogos";
import { ImpactoNegocio } from "@/components/portal/ImpactoNegocio";
import { CumplimientoPagos } from "@/components/portal/CumplimientoPagos";
import { useTranslation } from "react-i18next";

const ACTIVE = ["open", "assigned", "in_progress"];

type Incidence = {
  id: string; ref: string; customer_name: string; city: string | null;
  product_family: string; brand: string | null; status: string; urgency: string;
  created_at: string; updated_at: string;
};
type Appt = {
  id: string; title: string; customer_name: string | null; address: string | null;
  city: string | null; brand: string | null; scheduled_at: string; duration_minutes: number | null;
};

const regionName = (code: string): string =>
  PROVINCIAS.find((p) => p.code === code)?.name ??
  DISTRITOS_PT.find((d) => d.code === code)?.name ?? code;

const PortalDashboard = () => {
  const { t, i18n } = useTranslation("portal");
  const locale = i18n.language?.startsWith("es") ? "es-ES"
    : i18n.language?.startsWith("pt") ? "pt-PT"
    : i18n.language?.startsWith("fr") ? "fr-FR" : "en-GB";
  const { profile, user } = useAuth();
  const { isClient, isCollaborator, loading: roleLoading } = useUserRole();

  const nf = useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }), [locale]);
  const eur = (n: number) => nf.format(n || 0);

  const [loading, setLoading] = useState(true);
  const [incidences, setIncidences] = useState<Incidence[]>([]);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [invoiceMonth, setInvoiceMonth] = useState(0);
  const [pending, setPending] = useState(0);
  const [servicesYtd, setServicesYtd] = useState(0);
  const [docsAlert, setDocsAlert] = useState(0);
  const [coverage, setCoverage] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    (async () => {
      const [inc, ap, inv, docs, prof] = await Promise.all([
        supabase.from("wg_incidences")
          .select("id, ref, customer_name, city, product_family, brand, status, urgency, created_at, updated_at")
          .eq("assigned_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(400),
        supabase.from("wg_appointments")
          .select("id, title, customer_name, address, city, brand, scheduled_at, duration_minutes")
          .eq("user_id", user.id)
          .gte("scheduled_at", dayStart)
          .lt("scheduled_at", dayEnd)
          .order("scheduled_at", { ascending: true }),
        supabase.from("wg_invoices")
          .select("amount_total, status, service_count, issued_at")
          .eq("user_id", user.id),
        supabase.from("wg_collaborator_documents")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("status", ["expiring", "expired"]),
        profile?.application_id
          ? supabase.from("wg_network_applications").select("provincias_codes").eq("id", profile.application_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;

      setIncidences((inc.data ?? []) as Incidence[]);
      setAppts((ap.data ?? []) as Appt[]);

      const invoices = inv.data ?? [];
      setInvoiceMonth(invoices.filter((r) => r.issued_at >= monthStart).reduce((a, r) => a + Number(r.amount_total || 0), 0));
      setPending(invoices.filter((r) => r.status === "pending" || r.status === "overdue").reduce((a, r) => a + Number(r.amount_total || 0), 0));
      setServicesYtd(invoices.filter((r) => r.issued_at >= yearStart).reduce((a, r) => a + Number(r.service_count || 0), 0));
      setDocsAlert(docs.count ?? 0);

      const cov = (prof.data as { provincias_codes?: string[] } | null)?.provincias_codes ?? [];
      setCoverage(cov);

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, profile?.application_id]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

  const active = incidences.filter((i) => ACTIVE.includes(i.status));
  const closedMonth = incidences.filter((i) => i.status === "closed" && i.updated_at >= monthStart);
  const casesYtd = incidences.filter((i) => i.created_at >= yearStart).length;
  const tatDays = (() => {
    const closed = incidences.filter((i) => i.status === "closed");
    if (!closed.length) return null;
    const avg = closed.reduce((a, i) => a + (new Date(i.updated_at).getTime() - new Date(i.created_at).getTime()), 0) / closed.length;
    return Math.max(0, avg / 86400000);
  })();

  const trend = useMemo(() => {
    const d0 = new Date();
    const buckets: { key: string; month: string; incidences: number }[] = [];
    for (let k = 11; k >= 0; k--) {
      const d = new Date(d0.getFullYear(), d0.getMonth() - k, 1);
      buckets.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        month: d.toLocaleDateString(locale, { month: "short" }),
        incidences: 0,
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const i of incidences) {
      const d = new Date(i.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const pos = idx.get(key);
      if (pos !== undefined) buckets[pos].incidences += 1;
    }
    return buckets;
  }, [incidences, locale]);

  if (!roleLoading && isClient && !isCollaborator) {
    return <Navigate to="/portal/service-os" replace />;
  }

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow mb-2">{t("dashboard.eyebrow")}</p>
        <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">
          {t("dashboard.greeting")}{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground mt-2">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Wrench} label={t("dashboard.kpis.active")} value={active.length} suffix={t("dashboard.kpis.activeSuffix")} tone="amber" />
        <KpiCard icon={CheckCircle2} label={t("dashboard.kpis.closed")} value={closedMonth.length} suffix={t("dashboard.kpis.closedSuffix")} tone="emerald" />
        <KpiCard icon={Timer} label={t("dashboard.kpis.tat")} value={tatDays === null ? "—" : tatDays.toFixed(1)} suffix={tatDays === null ? "" : t("dashboard.kpis.tatSuffix")} tone="ink" />
        <KpiCard icon={ClipboardList} label={t("dashboard.kpis.casesYear", { defaultValue: "Casos" })} value={casesYtd} suffix={t("dashboard.kpis.casesYearSuffix", { defaultValue: "este año" })} tone="teal" />
      </div>

      <ImpactoNegocio />

      <Card className="p-6 md:p-8 rounded-2xl border-black/[0.06] shadow-none">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-ink/[0.04] text-ink/70 flex items-center justify-center">
              <Inbox className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <p className="eyebrow mb-0.5">{t("dashboard.assigned.eyebrow")}</p>
              <h2 className="font-display text-xl text-ink tracking-tight">{t("dashboard.assigned.title")}</h2>
            </div>
          </div>
          <Badge variant="outline" className="border-black/10 bg-transparent text-ink/70">{active.length}</Badge>
        </div>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {t("dashboard.assigned.empty", { defaultValue: "No tienes avisos activos ahora mismo." })}
          </p>
        ) : (
          <ul className="divide-y divide-black/[0.06] -mx-2">
            {active.slice(0, 6).map((i) => (
              <li key={i.id}>
                <Link to={`/portal/incidencias/${i.id}`} className="flex items-center justify-between gap-3 px-2 py-3 rounded-lg hover:bg-black/[0.02] transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-mono text-ink/40 tracking-wider">{i.ref}</p>
                    <p className="text-sm text-ink truncate mt-0.5">
                      {i.customer_name} · {familiaLabel(i.product_family)}{i.city ? ` · ${i.city}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="border-black/10 bg-transparent text-ink/70 font-normal">{STATUS_LABELS[i.status] ?? i.status}</Badge>
                    <ArrowRight className="h-4 w-4 text-ink/30" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <Card className="p-6 md:p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="eyebrow mb-2">{t("dashboard.trend.eyebrow")}</p>
              <h2 className="font-display text-xl text-ink">{t("dashboard.trend.title")}</h2>
            </div>
          </div>
          <div className="h-64">
            {incidences.length === 0 && !loading ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                {t("dashboard.trend.empty", { defaultValue: "Aún no hay histórico de avisos." })}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--teal))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--teal))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="incidences" stroke="hsl(var(--teal))" strokeWidth={2} fill="url(#g1)" name={t("dashboard.kpis.active")} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-6 md:p-8 bg-ink text-bone border-ink">
          <p className="text-xs font-mono uppercase tracking-widest text-teal mb-3">{t("dashboard.earnings.eyebrow")}</p>
          <p className="font-display text-4xl md:text-5xl mb-1">{eur(invoiceMonth)}</p>
          <p className="text-sm text-bone/60">{t("dashboard.earnings.subtitle", { count: closedMonth.length })}</p>
          <div className="mt-8 pt-6 border-t border-bone/10 space-y-3">
            <Row label={t("dashboard.earnings.pending")} value={eur(pending)} />
            <Row label={t("dashboard.earnings.servicesYtd", { defaultValue: "Servicios facturados (año)" })} value={String(servicesYtd)} />
          </div>
          <Button asChild variant="secondary" className="w-full mt-8 gap-2 bg-teal text-ink hover:bg-teal/90">
            <Link to="/portal/facturacion">
              {t("dashboard.earnings.cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="eyebrow mb-1">{t("dashboard.today.eyebrow")}</p>
              <h2 className="font-display text-xl text-ink">{t("dashboard.today.title")}</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to="/portal/calendario">{t("dashboard.today.viewAgenda")}<ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          {appts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("dashboard.today.empty")}</p>
          ) : (
            <ul className="space-y-3">
              {appts.map((a) => (
                <li key={a.id} className="flex items-start gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="text-center shrink-0 w-14">
                    <p className="font-display text-lg text-ink leading-none">
                      {new Date(a.scheduled_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {a.duration_minutes ? <p className="text-[10px] font-mono text-muted-foreground mt-1">{a.duration_minutes} {t("dashboard.today.min")}</p> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{[a.customer_name, a.brand].filter(Boolean).join(" · ")}</p>
                    {(a.address || a.city) && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />{[a.address, a.city].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="eyebrow mb-1">{t("dashboard.coverage.eyebrow", { defaultValue: "Tu red" })}</p>
              <h2 className="font-display text-xl text-ink">{t("dashboard.coverage.title", { defaultValue: "Mi cobertura" })}</h2>
            </div>
            <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" />{coverage.length}</Badge>
          </div>
          {coverage.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t("dashboard.coverage.empty", { defaultValue: "Todavía no has definido tu zona de cobertura." })}
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3">
                <Link to="/portal/perfil">{t("dashboard.coverage.cta", { defaultValue: "Definir cobertura" })}</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {coverage.slice(0, 12).map((code) => (
                  <span key={code} className="text-xs px-2 py-1 rounded-md bg-secondary text-ink/80 border border-border">
                    {regionName(code)}
                  </span>
                ))}
                {coverage.length > 12 && (
                  <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">+{coverage.length - 12}</span>
                )}
              </div>
              <Button asChild variant="ghost" size="sm" className="mt-4 gap-1 px-0 text-teal-deep">
                <Link to="/portal/perfil">
                  {t("dashboard.coverage.manage", { defaultValue: "Gestionar cobertura" })}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </>
          )}
        </Card>
      </div>

      <CumplimientoPagos />

      {docsAlert > 0 && (
        <Card className="p-5 md:p-6 border-amber-500/30 bg-amber-50/50">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-ink">{t("dashboard.docAlert.title")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("dashboard.docAlert.subtitleCount", { defaultValue: "Tienes {{count}} documento(s) caducado(s) o a punto de caducar.", count: docsAlert })}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/portal/documentos">{t("dashboard.docAlert.cta")}</Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-sm">
    <span className="text-bone/60">{label}</span>
    <span className="font-mono text-bone">{value}</span>
  </div>
);

const toneAccent: Record<string, string> = {
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  ink: "bg-ink",
  teal: "bg-ink/60",
};

const KpiCard = ({ icon: Icon, label, value, suffix, tone }: {
  icon: typeof Wrench; label: string; value: number | string; suffix?: string;
  tone: "amber" | "emerald" | "ink" | "teal";
}) => (
  <div className="group relative rounded-2xl border border-black/[0.06] bg-white p-6 transition-all hover:border-black/[0.12] hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.08)]">
    <div className="flex items-start justify-between mb-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
      <Icon className="h-4 w-4 text-ink/30" strokeWidth={1.5} />
    </div>
    <p className="font-display text-[2.5rem] leading-none text-ink tracking-tight tabular-nums">
      {value}
    </p>
    {suffix && (
      <p className="text-[12px] text-ink/50 mt-2">{suffix}</p>
    )}
    <div className={`absolute left-6 right-6 bottom-0 h-px ${toneAccent[tone]} opacity-40 group-hover:opacity-80 transition-opacity`} />
  </div>
);

export default PortalDashboard;
