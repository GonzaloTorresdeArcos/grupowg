import { useAuth } from "@/hooks/useAuth";
import { Link, Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  mockKpis, mockIncidences, mockMonthlyTrend, mockAppointments, formatEUR, formatDate,
} from "@/lib/portal-mocks";
import {
  Wrench, Star, Timer, CheckCircle2, Euro, TrendingUp, ArrowRight,
  Calendar, MapPin, AlertTriangle, Inbox,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { STATUS_LABELS, familiaLabel } from "@/lib/catalogos";
import { useTranslation } from "react-i18next";

type AssignedIncidence = {
  id: string;
  ref: string;
  customer_name: string;
  city: string | null;
  product_family: string;
  status: string;
  urgency: string;
  created_at: string;
};

const statusColor: Record<string, string> = {
  abierta: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  en_curso: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  esperando_repuesto: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  cerrada: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
};

// statusLabel se obtiene desde i18n en runtime


const PortalDashboard = () => {
  const { t, i18n } = useTranslation("portal");
  const locale = i18n.language?.startsWith("es") ? "es-ES" :
                 i18n.language?.startsWith("pt") ? "pt-PT" :
                 i18n.language?.startsWith("fr") ? "fr-FR" : "en-GB";
  const { profile, user } = useAuth();
  const todayAppts = mockAppointments
    .filter((a) => new Date(a.scheduledAt).toDateString() === new Date().toDateString())
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  const [assigned, setAssigned] = useState<AssignedIncidence[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("wg_incidences")
      .select("id, ref, customer_name, city, product_family, status, urgency, created_at")
      .eq("assigned_user_id", user.id)
      .neq("status", "closed")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setAssigned((data ?? []) as AssignedIncidence[]));
  }, [user]);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <p className="eyebrow mb-2">{t("dashboard.eyebrow")}</p>
        <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">
          {t("dashboard.greeting")}{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* Incidencias asignadas reales */}
      {assigned.length > 0 && (
        <Card className="p-6 md:p-8 border-teal/30 bg-teal/5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-teal/15 text-teal flex items-center justify-center">
                <Inbox className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <p className="eyebrow mb-0.5">{t("dashboard.assigned.eyebrow")}</p>
                <h2 className="font-display text-xl text-ink">{t("dashboard.assigned.title")}</h2>
              </div>
            </div>
            <Badge variant="outline">{assigned.length}</Badge>
          </div>
          <ul className="space-y-2">
            {assigned.map((i) => (
              <li key={i.id}>
                <Link
                  to={`/portal/incidencias/${i.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono text-muted-foreground">{i.ref}</p>
                    <p className="text-sm text-ink truncate">
                      {i.customer_name} · {familiaLabel(i.product_family)}
                      {i.city ? ` · ${i.city}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline">{STATUS_LABELS[i.status] ?? i.status}</Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Wrench} label={t("dashboard.kpis.active")} value={mockKpis.active} suffix={t("dashboard.kpis.activeSuffix")} tone="amber" />
        <KpiCard icon={CheckCircle2} label={t("dashboard.kpis.closed")} value={mockKpis.closed_month} suffix={t("dashboard.kpis.closedSuffix")} tone="emerald" delta="+12%" />
        <KpiCard icon={Timer} label={t("dashboard.kpis.tat")} value={mockKpis.tat_avg_days} suffix={t("dashboard.kpis.tatSuffix")} tone="ink" delta="-0.4d" />
        <KpiCard icon={Star} label={t("dashboard.kpis.rating")} value={mockKpis.rating} suffix={t("dashboard.kpis.ratingSuffix")} tone="teal" delta="+0.2" />
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* Trend chart */}
        <Card className="p-6 md:p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="eyebrow mb-2">{t("dashboard.trend.eyebrow")}</p>
              <h2 className="font-display text-xl text-ink">{t("dashboard.trend.title")}</h2>
            </div>
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              +18%
            </Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockMonthlyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--teal))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--teal))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="incidences"
                  stroke="hsl(var(--teal))"
                  strokeWidth={2}
                  fill="url(#g1)"
                  name={t("dashboard.kpis.active")}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Earnings */}
        <Card className="p-6 md:p-8 bg-ink text-bone border-ink">
          <p className="text-xs font-mono uppercase tracking-widest text-teal mb-3">{t("dashboard.earnings.eyebrow")}</p>
          <p className="font-display text-4xl md:text-5xl mb-1">{formatEUR(mockKpis.earnings_month)}</p>
          <p className="text-sm text-bone/60">{t("dashboard.earnings.subtitle", { count: mockKpis.closed_month })}</p>

          <div className="mt-8 pt-6 border-t border-bone/10 space-y-3">
            <Row label={t("dashboard.earnings.pending")} value={formatEUR(mockKpis.pending_settlement)} />
            <Row label={t("dashboard.earnings.ytd")} value={mockKpis.cases_ytd.toString()} />
            <Row label={t("dashboard.earnings.ftf")} value={`${mockKpis.ftf_pct}%`} />
          </div>

          <Button asChild variant="secondary" className="w-full mt-8 gap-2 bg-teal text-ink hover:bg-teal/90">
            <Link to="/portal/facturacion">
              {t("dashboard.earnings.cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </div>

      {/* Today's appointments + Active incidences */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="eyebrow mb-1">{t("dashboard.today.eyebrow")}</p>
              <h2 className="font-display text-xl text-ink">{t("dashboard.today.title")}</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to="/portal/calendario">
                {t("dashboard.today.viewAgenda")}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          {todayAppts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("dashboard.today.empty")}</p>
          ) : (
            <ul className="space-y-3">
              {todayAppts.map((a) => (
                <li key={a.id} className="flex items-start gap-4 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="text-center shrink-0 w-14">
                    <p className="font-display text-lg text-ink leading-none">
                      {new Date(a.scheduledAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1">{a.durationMin} {t("dashboard.today.min")}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.customer} · {a.brand}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {a.address}, {a.city}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="eyebrow mb-1">{t("dashboard.backlog.eyebrow")}</p>
              <h2 className="font-display text-xl text-ink">{t("dashboard.backlog.title")}</h2>
            </div>
            <Badge variant="outline">{mockIncidences.length}</Badge>
          </div>
          <ul className="space-y-2">
            {mockIncidences.slice(0, 5).map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono text-muted-foreground">{i.ref}</p>
                  <p className="text-sm text-ink truncate">{i.customer} · {i.brand} {i.family}</p>
                </div>
                <div className="text-right shrink-0">
                  <Badge variant="outline" className={statusColor[i.status]}>
                    {t(`dashboard.status.${i.status}`)}
                  </Badge>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">
                    {i.tat_h < 48 ? `${i.tat_h}h` : `${Math.round(i.tat_h / 24)}d`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Document alert */}
      <Card className="p-5 md:p-6 border-amber-500/30 bg-amber-50/50">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-ink">{t("dashboard.docAlert.title")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("dashboard.docAlert.subtitle")}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/portal/documentos">{t("dashboard.docAlert.cta")}</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-sm">
    <span className="text-bone/60">{label}</span>
    <span className="font-mono text-bone">{value}</span>
  </div>
);

const toneClass: Record<string, string> = {
  amber: "bg-amber-500/10 text-amber-700",
  emerald: "bg-emerald-500/10 text-emerald-700",
  ink: "bg-ink/5 text-ink",
  teal: "bg-teal/10 text-teal",
};

const KpiCard = ({
  icon: Icon, label, value, suffix, tone, delta,
}: {
  icon: typeof Wrench;
  label: string;
  value: number | string;
  suffix?: string;
  tone: "amber" | "emerald" | "ink" | "teal";
  delta?: string;
}) => (
  <Card className="p-5">
    <div className="flex items-start justify-between mb-4">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${toneClass[tone]}`}>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </div>
      {delta && <span className="text-xs font-mono text-emerald-700">{delta}</span>}
    </div>
    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
    <p className="font-display text-2xl text-ink leading-none">
      {value}
      {suffix && <span className="text-sm text-muted-foreground ml-1">{suffix}</span>}
    </p>
  </Card>
);

export default PortalDashboard;
