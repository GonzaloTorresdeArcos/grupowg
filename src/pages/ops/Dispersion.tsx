import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmtNum, fmtDec } from "@/lib/ops-filters";
import { Loader2 } from "lucide-react";
import { OpsPeriodPicker } from "@/components/ops/OpsPeriodPicker";

type Kpis = { n: number; km_medio: number; km_mediana: number; km_total_ida_vuelta: number; lejanas: number };
type TecRow = {
  tecnico: string; delegacion: string | null; salidas: number;
  km_medio: number; km_mediana: number; km_total: number;
  salidas_60km: number; km_max: number;
};
type FamRow = { familia: string; salidas: number; km_medio: number; km_mediana: number; km_total: number };
type DelRow = { delegacion: string; salidas: number; km_medio: number; km_total: number };
type Payload = { kpis: Kpis; tecnicos: TecRow[]; familias: FamRow[]; delegaciones: DelRow[] };

const iso = (d: Date) => d.toISOString().slice(0, 10);
const defaultRange = () => {
  const now = new Date();
  return {
    from: iso(new Date(Date.UTC(now.getUTCFullYear(), 0, 1))),
    to: iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))),
  };
};

const kmTone = (km: number) => {
  if (km < 25) return "text-emerald-600";
  if (km <= 40) return "text-amber-600";
  return "text-red-600";
};

const Card = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-xl border border-black/[0.06] bg-white p-4">
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
    <p className="mt-2 heading-display text-3xl text-ink">{value}</p>
    {hint && <p className="mt-1 text-[11px] text-ink/50">{hint}</p>}
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-xl border border-black/[0.06] bg-white overflow-hidden">
    <div className="px-4 py-3 border-b border-black/[0.06]">
      <h2 className="text-sm font-medium text-ink tracking-tight">{title}</h2>
    </div>
    <div className="overflow-x-auto">{children}</div>
  </section>
);

export default function OpsDispersion() {
  const [range, setRange] = useState(defaultRange);
  const [delegacion, setDelegacion] = useState<string | null>(null);
  const [gama, setGama] = useState<string | null>(null);
  const [familia, setFamilia] = useState<string | null>(null);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [delOpts, setDelOpts] = useState<string[]>([]);
  const [gamaOpts, setGamaOpts] = useState<string[]>([]);
  const [famOpts, setFamOpts] = useState<string[]>([]);

  useEffect(() => {
    supabase.rpc("ops_filter_options" as never, {
      p_delegacion: null, p_cliente: null, p_gama: null, p_familia: null,
      p_marca: null, p_provincia: null, p_sat: null, p_tecnico: null, p_canal: null,
    } as never).then(({ data }) => {
      const src = (Array.isArray(data) ? (data as unknown[])[0] : data) as Record<string, unknown> | null;
      const toArr = (v: unknown) => Array.isArray(v) ? v.filter((x) => x != null && x !== "").map(String) : [];
      setDelOpts(toArr(src?.delegaciones));
      setGamaOpts(toArr(src?.gamas));
      setFamOpts(toArr(src?.familias));
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    supabase.rpc("ops_dispersion" as never, {
      p_from: range.from, p_to: range.to,
      p_delegacion: delegacion, p_gama: gama, p_familia: familia,
    } as never).then(({ data, error }) => {
      if (error) { console.error(error); setLoading(false); return; }
      setData(data as unknown as Payload);
      setLoading(false);
    });
  }, [range.from, range.to, delegacion, gama, familia]);

  const kpis = data?.kpis;
  const pctLejanas = useMemo(() => {
    if (!kpis || !kpis.n) return 0;
    return (kpis.lejanas / kpis.n) * 100;
  }, [kpis]);

  const Sel = ({ label, value, options, onChange }: {
    label: string; value: string | null; options: string[]; onChange: (v: string | null) => void;
  }) => (
    <label className="flex flex-col gap-1 min-w-[140px]">
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-8 px-2 rounded-md border border-black/[0.08] bg-white text-[13px] text-ink focus:outline-none focus:border-ink/40"
      >
        <option value="">Todas</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">Operaciones</p>
        <h1 className="heading-display text-3xl md:text-4xl text-ink mt-1">Dispersión y desplazamientos</h1>
        <p className="text-[13px] text-ink/60 mt-1">
          Salidas a domicilio de plantilla propia, distancia desde la base de la delegación al código postal del aviso.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-black/[0.06] bg-white p-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40">Período</span>
          <OpsPeriodPicker value={range} onChange={setRange} />
        </div>
        <Sel label="Delegación" value={delegacion} options={delOpts} onChange={setDelegacion} />
        <Sel label="Gama" value={gama} options={gamaOpts} onChange={setGama} />
        <Sel label="Familia" value={familia} options={famOpts} onChange={setFamilia} />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-ink/50 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Calculando…</div>
      )}

      {!loading && kpis && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card label="Salidas a domicilio" value={fmtNum(kpis.n)} />
            <Card label="Km medio por salida" value={`${fmtDec(kpis.km_medio, 1)} km`} hint={`Mediana ${fmtDec(kpis.km_mediana, 1)} km`} />
            <Card label="Km totales (ida y vuelta)" value={`${fmtNum(kpis.km_total_ida_vuelta)} km`} />
            <Card label="Salidas +60 km" value={fmtNum(kpis.lejanas)} hint={`${fmtDec(pctLejanas, 1)}% del total`} />
          </div>

          <Section title="Dispersión por técnico">
            <table className="min-w-full text-[13px]">
              <thead className="bg-black/[0.02] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/50">
                <tr>
                  <th className="text-left px-4 py-2">Técnico</th>
                  <th className="text-left px-4 py-2">Delegación</th>
                  <th className="text-right px-4 py-2">Salidas</th>
                  <th className="text-right px-4 py-2">Km medio</th>
                  <th className="text-right px-4 py-2">Km mediana</th>
                  <th className="text-right px-4 py-2">Km totales</th>
                  <th className="text-right px-4 py-2">+60 km</th>
                  <th className="text-right px-4 py-2">Km máx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {data!.tecnicos.map((t) => (
                  <tr key={t.tecnico} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-2 text-ink font-medium">{t.tecnico}</td>
                    <td className="px-4 py-2 text-ink/70">{t.delegacion ?? "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(t.salidas)}</td>
                    <td className={`px-4 py-2 text-right tabular-nums font-medium ${kmTone(t.km_medio)}`}>{fmtDec(t.km_medio, 1)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink/70">{fmtDec(t.km_mediana, 1)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(t.km_total)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(t.salidas_60km)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink/70">{fmtNum(t.km_max)}</td>
                  </tr>
                ))}
                {!data!.tecnicos.length && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-ink/50">Sin datos en el período</td></tr>
                )}
              </tbody>
            </table>
          </Section>

          <Section title="Comparativa por familia">
            <table className="min-w-full text-[13px]">
              <thead className="bg-black/[0.02] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/50">
                <tr>
                  <th className="text-left px-4 py-2">Familia</th>
                  <th className="text-right px-4 py-2">Salidas</th>
                  <th className="text-right px-4 py-2">Km medio</th>
                  <th className="text-right px-4 py-2">Km mediana</th>
                  <th className="text-right px-4 py-2">Km totales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {data!.familias.map((f) => (
                  <tr key={f.familia} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-2 text-ink font-medium">{f.familia}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(f.salidas)}</td>
                    <td className={`px-4 py-2 text-right tabular-nums font-medium ${kmTone(f.km_medio)}`}>{fmtDec(f.km_medio, 1)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink/70">{fmtDec(f.km_mediana, 1)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(f.km_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Por delegación">
            <table className="min-w-full text-[13px]">
              <thead className="bg-black/[0.02] text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/50">
                <tr>
                  <th className="text-left px-4 py-2">Delegación</th>
                  <th className="text-right px-4 py-2">Salidas</th>
                  <th className="text-right px-4 py-2">Km medio</th>
                  <th className="text-right px-4 py-2">Km totales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {data!.delegaciones.map((d) => (
                  <tr key={d.delegacion} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-2 text-ink font-medium">{d.delegacion}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(d.salidas)}</td>
                    <td className={`px-4 py-2 text-right tabular-nums font-medium ${kmTone(d.km_medio)}`}>{fmtDec(d.km_medio, 1)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{fmtNum(d.km_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <p className="text-[11px] text-ink/50 leading-relaxed">
            Distancia en línea recta entre la base de la delegación y el código postal del aviso (×2 ida/vuelta).
            No descuenta la agrupación de varios avisos en una misma ruta, por lo que los km totales son cota superior.
            Central mide desde el HUB de San Agustín de Guadalix; las delegaciones usan de momento el centro de su ciudad como base.
          </p>
        </>
      )}
    </div>
  );
}
