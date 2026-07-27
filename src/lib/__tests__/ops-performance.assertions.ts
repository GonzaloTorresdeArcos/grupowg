/**
 * Aserciones ejecutables para ops-performance.ts.
 *
 * El proyecto tiene vitest configurado, así que exponemos una suite estándar
 * y también una función runAssertions() invocable manualmente si se prefiere
 * ejecutar sin runner (throw en el primer fallo).
 */
import {
  variacion,
  ratioBajas,
  estadoDelegacion,
  estadoTecnico,
  indicadorProvisionalIncentivo,
  computePrevPeriod,
} from "../ops-performance";

type Case = { name: string; run: () => void };

const cases: Case[] = [
  {
    name: "variacion: previo null → abs y pct null",
    run: () => {
      const v = variacion(10, null);
      if (v.abs !== null || v.pct !== null) throw new Error("previo null debe dar {null,null}");
    },
  },
  {
    name: "variacion: previo 0 → pct null pero abs = actual",
    run: () => {
      const v = variacion(5, 0);
      if (v.abs !== 5 || v.pct !== null) throw new Error("previo 0 debe evitar división por cero");
    },
  },
  {
    name: "variacion: cálculo normal",
    run: () => {
      const v = variacion(120, 100);
      if (v.abs !== 20 || Math.abs((v.pct ?? 0) - 0.2) > 1e-9) throw new Error("cálculo incorrecto");
    },
  },
  {
    name: "ratioBajas: cerradas 0 → null",
    run: () => {
      if (ratioBajas(3, 0) !== null) throw new Error("cerradas 0 debe dar null");
    },
  },
  {
    name: "ratioBajas: correcto",
    run: () => {
      const r = ratioBajas(20, 100);
      if (Math.abs((r ?? 0) - 0.2) > 1e-9) throw new Error("ratio incorrecto");
    },
  },
  {
    name: "estadoDelegacion: caída >25% + bajas empeoran → critico",
    run: () => {
      const res = estadoDelegacion(
        { delegacion: "X", cerradas: 60, pct_bajas: 0.3 },
        { delegacion: "X", cerradas: 100, pct_bajas: 0.2 },
        0.2,
      );
      if (res.estado !== "critico") throw new Error("debe ser crítico");
    },
  },
  {
    name: "estadoDelegacion: bajas > 1,5× media → critico",
    run: () => {
      const res = estadoDelegacion(
        { delegacion: "X", cerradas: 100, pct_bajas: 0.5 },
        { delegacion: "X", cerradas: 100, pct_bajas: 0.5 },
        0.2,
      );
      if (res.estado !== "critico") throw new Error("bajas 50% vs media 20% debe ser crítico");
    },
  },
  {
    name: "estadoDelegacion: señales contradictorias → atencion",
    run: () => {
      const res = estadoDelegacion(
        { delegacion: "X", cerradas: 110, pct_bajas: 0.4, bajas: 44 },
        { delegacion: "X", cerradas: 100, pct_bajas: 0.2, bajas: 20 },
        0.25,
      );
      if (res.estado !== "atencion") throw new Error("cerradas +10% con bajas +120% debe ser atención");
    },
  },
  {
    name: "estadoTecnico: <15 cerradas → sin_contexto",
    run: () => {
      const res = estadoTecnico(
        { tecnico: "A", delegacion: "X", cerradas: 8, pct_bajas: 0.9 },
        null,
        0.2,
      );
      if (res.estado !== "sin_contexto") throw new Error("bajo volumen NUNCA crítico");
    },
  },
  {
    name: "estadoTecnico: contradictorio (más cerradas, bajas peor) → atencion",
    run: () => {
      const res = estadoTecnico(
        { tecnico: "A", delegacion: "X", cerradas: 40, pct_bajas: 0.4, pct_bajas_esp: 0.2 },
        { tecnico: "A", delegacion: "X", cerradas: 30, pct_bajas: 0.2, pct_bajas_esp: 0.2 },
        0.25,
      );
      if (res.estado !== "atencion") throw new Error("debe ser atención por señales contradictorias");
    },
  },
  {
    name: "indicadorIncentivo: sin_contexto → informacion_insuficiente",
    run: () => {
      const r = indicadorProvisionalIncentivo({
        estado: "sin_contexto",
        produccion: "estable",
        calidad: "esperado",
        razones: [],
      });
      if (r !== "informacion_insuficiente") throw new Error();
    },
  },
  {
    name: "indicadorIncentivo: producción mejora + calidad no peor → reconocimiento",
    run: () => {
      const r = indicadorProvisionalIncentivo({
        estado: "ok",
        produccion: "mejora",
        calidad: "esperado",
        razones: [],
      });
      if (r !== "reconocimiento_potencial") throw new Error();
    },
  },
  {
    name: "indicadorIncentivo: producción mejora pero calidad peor NO se premia",
    run: () => {
      const r = indicadorProvisionalIncentivo({
        estado: "atencion",
        produccion: "mejora",
        calidad: "peor",
        razones: [],
      });
      if (r !== "requiere_validacion") throw new Error();
    },
  },
  {
    name: "computePrevPeriod: mes natural → mes natural anterior",
    run: () => {
      const p = computePrevPeriod("2026-06-01", "2026-06-30");
      if (p.from !== "2026-05-01" || p.to !== "2026-05-31") throw new Error(`prev=${JSON.stringify(p)}`);
    },
  },
  {
    name: "computePrevPeriod: rango arbitrario → mismo nº de días previos",
    run: () => {
      const p = computePrevPeriod("2026-06-10", "2026-06-20"); // 11 días
      if (p.to !== "2026-06-09" || p.from !== "2026-05-30") throw new Error(`prev=${JSON.stringify(p)}`);
    },
  },
];

export function runAssertions(): void {
  for (const c of cases) {
    c.run();
  }
}

// Integración opcional con vitest si está disponible en runtime.
declare const describe: ((n: string, fn: () => void) => void) | undefined;
declare const it: ((n: string, fn: () => void) => void) | undefined;
if (typeof describe === "function" && typeof it === "function") {
  describe("ops-performance", () => {
    for (const c of cases) it(c.name, c.run);
  });
}
