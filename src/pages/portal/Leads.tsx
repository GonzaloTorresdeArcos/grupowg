import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertCircle, Search, TrendingUp, Users, Wallet, Percent,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip,
} from "recharts";
import { useUserRole } from "@/hooks/useUserRole";

type Lead = {
  id: string;
  created_at: string;
  nombre: string | null;
  empresa: string | null;
  email: string;
  telefono: string | null;
  cp: string | null;
  intervenciones_mes: number | null;
  ticket_medio: number | null;
  gama: string | null;
  impacto_total: number | null;
  multiplicador: number | null;
  caja_liberada: number | null;
};

type Application = { email: string; status: string | null; created_at: string };

const eur = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const dateFmt = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  year: "2-digit",
});
const norm = (e: string | null | undefined) => (e ?? "").trim().toLowerCase();

const toneClass = {
  ink: "bg-ink text-bone",
  teal: "bg-teal/15 text-teal-deep",
  emerald: "bg-emerald-100 text-emerald-900",
  amber: "bg-amber-100 text-amber-900",
} as const;

const KpiCard = ({
  icon: Icon, label, value, tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone: keyof typeof toneClass;
}) => (
  <Card className="p-5">
    <div className="flex items-start justify-between mb-4">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${toneClass[tone]}`}>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
    </div>
    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
    <p className="font-display text-2xl text-ink leading-none">{value}</p>
  </Card>
);

const Leads = () => {
  const { t } = useTranslation("portal");
  const { isAdmin, loading: roleLoading } = useUserRole();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [appsByEmail, setAppsByEmail] = useState<Map<string, Application> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "converted" | "pending">("all");
  const [query, setQuery] = useState("");

  const appsAvailable = appsByEmail !== null;

  useEffect(() => {
    if (roleLoading || !isAdmin) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("wg_network_leads")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (mounted) setLeads((data ?? []) as Lead[]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(msg);
      }

      try {
        const { data, error } = await supabase
          .from("wg_network_applications")
          .select("email, status, created_at");
        if (error) throw error;
        if (mounted) {
          const map = new Map<string, Application>();
          for (const a of (data ?? []) as Application[]) {
            const k = norm(a.email);
            if (k) map.set(k, a);
          }
          setAppsByEmail(map);
        }
      } catch {
        // Degrada con elegancia: sin datos de conversión.
        if (mounted) setAppsByEmail(null);
      }

      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [roleLoading, isAdmin]);

  const isConverted = (l: Lead) => !!(appsByEmail && appsByEmail.has(norm(l.email)));

  // KPIs
  const total = leads.length;
  const impactoValues = leads.map((l) => Number(l.impacto_total ?? 0)).filter((n) => n > 0);
  const impactoAvg = impactoValues.length
    ? impactoValues.reduce((a, b) => a + b, 0) / impactoValues.length
    : 0;
  const pipeline = impactoValues.reduce((a, b) => a + b, 0);
  const converted = appsByEmail ? leads.filter(isConverted).length : 0;
  const conversionPct = appsByEmail && total > 0 ? (converted / total) * 100 : 0;

  // Weekly chart (last 12 weeks)
  const weekly = useMemo(() => {
    const buckets = new Map<string, number>();
    const now = new Date();
    const weekStart = (d: Date) => {
      const x = new Date(d);
      const day = (x.getDay() + 6) % 7; // Monday start
      x.setDate(x.getDate() - day);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    for (let i = 11; i >= 0; i--) {
      const ws = weekStart(new Date(now.getTime() - i * 7 * 86400000));
      buckets.set(ws.toISOString().slice(0, 10), 0);
    }
    for (const l of leads) {
      const ws = weekStart(new Date(l.created_at));
      const k = ws.toISOString().slice(0, 10);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    return Array.from(buckets.entries()).map(([k, v]) => ({
      week: new Date(k).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
      leads: v,
    }));
  }, [leads]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (filter === "converted" && !isConverted(l)) return false;
      if (filter === "pending" && isConverted(l)) return false;
      if (!q) return true;
      return (
        norm(l.email).includes(q) ||
        (l.nombre ?? "").toLowerCase().includes(q) ||
        (l.empresa ?? "").toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, filter, query, appsByEmail]);

  if (roleLoading) {
    return <p className="text-muted-foreground">{t("leads.loading")}</p>;
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="font-display text-xl text-ink mb-2">{t("leads.restricted.title")}</p>
        <p className="text-sm text-muted-foreground">{t("leads.restricted.subtitle")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow mb-2">{t("leads.eyebrow")}</p>
        <h1 className="font-display text-3xl md:text-4xl text-ink">{t("leads.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("leads.subtitle")}</p>
      </header>

      {/* KPIs */}
      <div className={`grid gap-3 grid-cols-2 ${appsAvailable ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <KpiCard icon={Users} label={t("leads.kpis.total")} value={String(total)} tone="ink" />
        <KpiCard icon={TrendingUp} label={t("leads.kpis.avg")} value={eur.format(impactoAvg)} tone="teal" />
        <KpiCard icon={Wallet} label={t("leads.kpis.pipeline")} value={eur.format(pipeline)} tone="emerald" />
        {appsAvailable && (
          <KpiCard icon={Percent} label={t("leads.kpis.conversion")} value={`${conversionPct.toFixed(1)}%`} tone="amber" />
        )}
      </div>

      {/* Chart */}
      <Card className="p-5">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          {t("leads.chart.title")}
        </p>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weekly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--teal))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--teal))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area type="monotone" dataKey="leads" stroke="hsl(var(--teal))" fill="url(#leadsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Filters + search */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            {t("leads.filters.all")}
          </Button>
          {appsAvailable && (
            <>
              <Button size="sm" variant={filter === "converted" ? "default" : "outline"} onClick={() => setFilter("converted")}>
                {t("leads.filters.converted")}
              </Button>
              <Button size="sm" variant={filter === "pending" ? "default" : "outline"} onClick={() => setFilter("pending")}>
                {t("leads.filters.pending")}
              </Button>
            </>
          )}
        </div>
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("leads.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List / table */}
      {loading ? (
        <p className="text-muted-foreground">{t("leads.loadingList")}</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Search className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-ink font-medium mb-1">{t("leads.empty.title")}</p>
          <p className="text-sm text-muted-foreground">{t("leads.empty.subtitle")}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
                    <th className="px-4 py-3">{t("leads.cols.date")}</th>
                    <th className="px-4 py-3">{t("leads.cols.who")}</th>
                    <th className="px-4 py-3">{t("leads.cols.contact")}</th>
                    <th className="px-4 py-3">{t("leads.cols.zone")}</th>
                    <th className="px-4 py-3">{t("leads.cols.ops")}</th>
                    <th className="px-4 py-3 text-right">{t("leads.cols.impact")}</th>
                    {appsAvailable && <th className="px-4 py-3">{t("leads.cols.status")}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((l) => {
                    const conv = appsAvailable && isConverted(l);
                    return (
                      <tr key={l.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {dateFmt.format(new Date(l.created_at))}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{l.nombre || "—"}</p>
                          <p className="text-xs text-muted-foreground">{l.empresa || "—"}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-ink truncate max-w-[200px]">{l.email}</p>
                          <p className="text-xs text-muted-foreground">{l.telefono || "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {l.cp || "—"} · {l.gama || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {l.intervenciones_mes ?? "—"}/m · {l.ticket_medio ? eur.format(Number(l.ticket_medio)) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <p className="font-display text-ink">{eur.format(Number(l.impacto_total ?? 0))}</p>
                          {l.multiplicador ? (
                            <p className="text-xs text-teal">+{Math.round((Number(l.multiplicador) - 1) * 100)}%</p>
                          ) : null}
                        </td>
                        {appsAvailable && (
                          <td className="px-4 py-3">
                            {conv ? (
                              <Badge className="bg-emerald-100 text-emerald-900 border-emerald-200" variant="outline">
                                {t("leads.status.converted")}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-muted text-muted-foreground">
                                {t("leads.status.pending")}
                              </Badge>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <ul className="md:hidden space-y-3">
            {filtered.map((l) => {
              const conv = appsAvailable && isConverted(l);
              return (
                <li key={l.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-ink truncate">{l.nombre || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{l.empresa || "—"}</p>
                    </div>
                    {appsAvailable && (
                      <Badge
                        variant="outline"
                        className={conv
                          ? "bg-emerald-100 text-emerald-900 border-emerald-200"
                          : "bg-muted text-muted-foreground"}
                      >
                        {conv ? t("leads.status.converted") : t("leads.status.pending")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-ink truncate">{l.email}</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    {l.telefono || "—"} · {l.cp || "—"} · {l.gama || "—"}
                  </p>
                  <div className="flex items-end justify-between gap-2">
                    <div className="text-xs text-muted-foreground">
                      <p>{dateFmt.format(new Date(l.created_at))}</p>
                      <p>{l.intervenciones_mes ?? "—"}/m · {l.ticket_medio ? eur.format(Number(l.ticket_medio)) : "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-ink">{eur.format(Number(l.impacto_total ?? 0))}</p>
                      {l.multiplicador ? (
                        <p className="text-xs text-teal">+{Math.round((Number(l.multiplicador) - 1) * 100)}%</p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};

export default Leads;
