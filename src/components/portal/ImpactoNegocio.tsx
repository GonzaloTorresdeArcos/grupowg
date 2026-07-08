import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Package, Store, ShieldCheck } from "lucide-react";
import { AVG_MARGIN_EUR, type SaleKind } from "@/lib/impacto";

type Sale = { kind: SaleKind; units: number; amount_margin: number; created_at: string };

const KIND_ORDER: SaleKind[] = ["parts", "equipment", "warranty"];
const KIND_ICON = { parts: Package, equipment: Store, warranty: ShieldCheck } as const;

export const ImpactoNegocio = () => {
  const { t, i18n } = useTranslation("portal");
  const locale = i18n.language?.startsWith("es") ? "es-ES" : i18n.language?.startsWith("pt") ? "pt-PT" : "en-GB";
  const { user } = useAuth();
  const nf = useMemo(() => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }), [locale]);
  const eur = (n: number) => nf.format(n || 0);

  const [sales, setSales] = useState<Sale[]>([]);
  const [interventionsMonth, setInterventionsMonth] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const now = new Date();
    const twelveMo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    (async () => {
      const [s, inc] = await Promise.all([
        supabase.from("wg_collaborator_sales").select("kind, units, amount_margin, created_at").eq("user_id", user.id).gte("created_at", twelveMo).limit(2000),
        supabase.from("wg_incidences").select("id", { count: "exact", head: true }).eq("assigned_user_id", user.id).gte("created_at", monthStart),
      ]);
      if (cancelled) return;
      setSales((s.data ?? []) as Sale[]);
      setInterventionsMonth(inc.count ?? 0);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const incomeOf = (s: Sale) => (s.amount_margin && Number(s.amount_margin) > 0) ? Number(s.amount_margin) : (s.units || 0) * AVG_MARGIN_EUR[s.kind];

  const streams = KIND_ORDER.map((kind) => {
    const rows = sales.filter((s) => s.kind === kind && s.created_at >= monthStart);
    const units = rows.reduce((a, s) => a + (s.units || 0), 0);
    const income = rows.reduce((a, s) => a + incomeOf(s), 0);
    const ops = rows.length;
    const conv = interventionsMonth > 0 ? Math.min(100, (ops / interventionsMonth) * 100) : 0;
    return { kind, units, income, ops, conv };
  });
  const totalMonth = streams.reduce((a, s) => a + s.income, 0);

  const trend = useMemo(() => {
    const d0 = new Date();
    const buckets: { key: string; month: string; total: number }[] = [];
    for (let k = 11; k >= 0; k--) {
      const d = new Date(d0.getFullYear(), d0.getMonth() - k, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleDateString(locale, { month: "short" }), total: 0 });
    }
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const s of sales) {
      const d = new Date(s.created_at);
      const pos = idx.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (pos !== undefined) buckets[pos].total += incomeOf(s);
    }
    return buckets;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, locale]);

  const KIND_LABEL: Record<SaleKind, string> = {
    parts: t("impacto.parts", { defaultValue: "Componentes" }),
    equipment: t("impacto.equipment", { defaultValue: "Equipos" }),
    warranty: t("impacto.warranty", { defaultValue: "Garantías" }),
  };

  return (
    <Card className="p-6 md:p-8">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-1">{t("impacto.eyebrow", { defaultValue: "Impacto de negocio" })}</p>
          <h2 className="font-display text-xl text-ink">{t("impacto.title", { defaultValue: "Ingresos generados por la red" })}</h2>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{t("impacto.monthTotal", { defaultValue: "Este mes" })}</p>
          <p className="font-display text-3xl text-ink leading-none">{eur(totalMonth)}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {streams.map((s) => {
          const Icon = KIND_ICON[s.kind];
          return (
            <div key={s.kind} className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-teal/10 text-teal flex items-center justify-center"><Icon className="h-4 w-4" strokeWidth={1.75} /></div>
                <p className="text-sm font-medium text-ink">{KIND_LABEL[s.kind]}</p>
              </div>
              <p className="font-display text-2xl text-ink leading-none">{eur(s.income)}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.units} {t("impacto.units", { defaultValue: "uds." })}</p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                  <span>{t("impacto.conversion", { defaultValue: "Conversión" })}</span>
                  <span className="font-mono">{s.conv.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-teal" style={{ width: `${s.conv}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-40 mt-6">
        {sales.length === 0 && !loading ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-4">
            {t("impacto.empty", { defaultValue: "Aún no hay ventas registradas. Aquí verás el impacto según se vendan componentes, equipos y garantías." })}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/50" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
              <Tooltip formatter={(v: number) => eur(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="total" fill="hsl(var(--teal))" radius={[4, 4, 0, 0]} name={t("impacto.title", { defaultValue: "Impacto" })} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mt-3">
        {t("impacto.conversionHint", { defaultValue: "Conversión = operaciones de venta sobre tus intervenciones del mes." })}
      </p>
    </Card>
  );
};
