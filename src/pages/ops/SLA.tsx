import { useEffect, useMemo, useState } from "react";
import { fetchOperationsData, type OtRow } from "@/lib/ops-queries";
import { Loader2 } from "lucide-react";

type Enriched = OtRow & { dias: number };

const fmtNum = (n: number) => new Intl.NumberFormat("es-ES").format(Math.round(n));

const SLA = () => {
  const [rows, setRows] = useState<OtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [provincia, setProvincia] = useState<string>("todas");
  const [cliente, setCliente] = useState<string>("todos");
  const [sat, setSat] = useState<string>("todos");

  useEffect(() => {
    fetchOperationsData().then((r) => { setRows(r); setLoading(false); });
  }, []);

  const abiertas: Enriched[] = useMemo(() => {
    const today = new Date();
    return rows
      .filter((r) => r.situacion === "Abierto" && r.fecha_creacion)
      .map((r) => ({ ...r, dias: Math.floor((today.getTime() - new Date(r.fecha_creacion!).getTime()) / 86400000) }));
  }, [rows]);

  const provincias = useMemo(() => Array.from(new Set(abiertas.map((r) => r.provincia).filter(Boolean))).sort() as string[], [abiertas]);
  const clientes = useMemo(() => Array.from(new Set(abiertas.map((r) => r.cliente_wg).filter(Boolean))).sort() as string[], [abiertas]);
  const sats = useMemo(() => Array.from(new Set(abiertas.map((r) => r.sat).filter(Boolean))).sort() as string[], [abiertas]);

  const filtered = useMemo(() => abiertas.filter((r) =>
    (provincia === "todas" || r.provincia === provincia) &&
    (cliente === "todos" || r.cliente_wg === cliente) &&
    (sat === "todos" || r.sat === sat)
  ), [abiertas, provincia, cliente, sat]);

  const tramos = useMemo(() => {
    const t = { hasta20: 0, entre20y30: 0, mas30: 0 };
    for (const r of filtered) {
      if (r.dias <= 20) t.hasta20++;
      else if (r.dias <= 30) t.entre20y30++;
      else t.mas30++;
    }
    return t;
  }, [filtered]);

  const lista30 = useMemo(() => filtered.filter((r) => r.dias > 30).sort((a, b) => b.dias - a.dias), [filtered]);
  const total = filtered.length || 1;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-ink/40" /></div>;
  }

  const Tramo = ({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "bad" }) => {
    const pct = (value / total) * 100;
    const bar = { ok: "bg-emerald-500", warn: "bg-amber-500", bad: "bg-red-500" }[tone];
    return (
      <div className="border border-black/[0.06] rounded-2xl bg-white p-6">
        <div className={`h-[2px] w-8 mb-5 ${bar}`} />
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">{label}</p>
        <div className="flex items-baseline gap-2 mt-2">
          <p className="font-display text-4xl tracking-tight text-ink tabular-nums">{fmtNum(value)}</p>
          <p className="text-xs text-ink/50 tabular-nums">{pct.toFixed(1)}%</p>
        </div>
        <div className="mt-3 h-1 rounded-full bg-black/[0.05] overflow-hidden">
          <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-2">Cartera abierta</p>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-ink">SLA · Envejecidos</h1>
        <p className="text-sm text-ink/60 mt-2 max-w-2xl">
          Distribución por antigüedad desde creación y lista de OTs con más de 30 días abiertas.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select value={provincia} onChange={(e) => setProvincia(e.target.value)} className="border border-black/[0.1] rounded-lg px-3 py-2 text-sm bg-white">
          <option value="todas">Todas las provincias</option>
          {provincias.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={cliente} onChange={(e) => setCliente(e.target.value)} className="border border-black/[0.1] rounded-lg px-3 py-2 text-sm bg-white">
          <option value="todos">Todos los clientes</option>
          {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sat} onChange={(e) => setSat(e.target.value)} className="border border-black/[0.1] rounded-lg px-3 py-2 text-sm bg-white">
          <option value="todos">Todos los SAT</option>
          {sats.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Tramo label="0 – 20 días" value={tramos.hasta20} tone="ok" />
        <Tramo label="20 – 30 días" value={tramos.entre20y30} tone="warn" />
        <Tramo label="Más de 30 días" value={tramos.mas30} tone="bad" />
      </section>

      <section>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 mb-3">
          Abiertas +30 días · {fmtNum(lista30.length)} OTs
        </p>
        {lista30.length === 0 ? (
          <div className="border border-dashed border-black/[0.12] rounded-2xl p-10 text-center bg-white">
            <p className="text-sm text-ink/50">Sin OTs con más de 30 días abiertas para el filtro actual. 👌</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-black/[0.06] rounded-2xl bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-ink/40 border-b border-black/[0.06]">
                  <th className="text-left font-medium px-4 py-3">OT</th>
                  <th className="text-left font-medium px-4 py-3">Cliente WG</th>
                  <th className="text-left font-medium px-4 py-3">Técnico / SAT</th>
                  <th className="text-left font-medium px-4 py-3">Provincia</th>
                  <th className="text-left font-medium px-4 py-3">Familia</th>
                  <th className="text-right font-medium px-4 py-3">Días</th>
                </tr>
              </thead>
              <tbody>
                {lista30.slice(0, 300).map((r) => (
                  <tr key={r.id} className="border-b border-black/[0.04] last:border-0 hover:bg-black/[0.02]">
                    <td className="px-4 py-3 text-ink font-medium">{r.num_ot}</td>
                    <td className="px-4 py-3 text-ink/70">{r.cliente_wg ?? "—"}</td>
                    <td className="px-4 py-3 text-ink/70">{r.tecnico ?? r.sat ?? "—"}</td>
                    <td className="px-4 py-3 text-ink/70">{r.provincia ?? "—"}</td>
                    <td className="px-4 py-3 text-ink/70">{r.familia ?? "—"}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${r.dias > 60 ? "text-red-600" : "text-ink"}`}>{r.dias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lista30.length > 300 && (
              <div className="px-4 py-3 text-[11px] text-ink/40 border-t border-black/[0.06]">
                Mostrando 300 de {fmtNum(lista30.length)} OTs. Refina los filtros para ver el resto.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default SLA;
