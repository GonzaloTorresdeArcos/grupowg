/**
 * Calcula un scoring de idoneidad y un tier (basic / advanced / premium)
 * según los datos del formulario de inscripción.
 */

export type Tier = "basic" | "advanced" | "premium";

export interface ScoringInput {
  familias: string[];
  servicios: string[];
  tecnicos: number;
  capacidadMensualText: string;
  coberturas: string[];
  documentosSubidos: number;
  zonaCobertura: number; // nº de provincias seleccionadas
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface ScoringResult {
  total: number;
  tier: Tier;
  breakdown: Record<string, number>;
  recommendations: string[];
}

const tierLabels: Record<Tier, string> = {
  basic: "Básico",
  advanced: "Avanzado",
  premium: "Premium",
};

export const tierLabel = (t: Tier) => tierLabels[t];

const parseCapacidad = (s: string): number => {
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
};

export function computeScoring(input: ScoringInput): ScoringResult {
  const breakdown: Record<string, number> = {};
  const recs: string[] = [];

  // Familias y servicios → capacidad de oferta (0–25)
  const oferta = Math.min(25, input.familias.length * 4 + input.servicios.length * 3);
  breakdown["Oferta de servicios"] = oferta;
  if (input.familias.length < 2) recs.push("Indica al menos 2 familias de producto para ampliar oportunidades.");

  // Capacidad operativa (0–25)
  const cap = parseCapacidad(input.capacidadMensualText);
  let capScore = 0;
  if (input.tecnicos >= 1) capScore += 5;
  if (input.tecnicos >= 3) capScore += 5;
  if (input.tecnicos >= 8) capScore += 5;
  if (cap >= 50) capScore += 4;
  if (cap >= 200) capScore += 6;
  capScore = Math.min(25, capScore);
  breakdown["Capacidad operativa"] = capScore;
  if (input.tecnicos === 0) recs.push("Añade el número de técnicos para evaluar la capacidad operativa.");

  // Cobertura geográfica (0–15)
  const cob = Math.min(15, input.zonaCobertura * 2);
  breakdown["Cobertura geográfica"] = cob;
  if (input.zonaCobertura === 0) recs.push("Marca al menos una provincia en el mapa de cobertura.");

  // Compliance documental (0–20)
  const docs = Math.min(20, input.documentosSubidos * 2);
  breakdown["Documentación aportada"] = docs;
  if (input.documentosSubidos < 5) recs.push("Sube al menos 5 documentos clave (seguro RC, AEAT, TGSS, PRL...).");

  // Coberturas adicionales (0–10)
  const cobs = Math.min(10, input.coberturas.length * 2);
  breakdown["Coberturas activadas"] = cobs;

  // Verificación (0–5)
  let ver = 0;
  if (input.emailVerified) ver += 3;
  if (input.phoneVerified) ver += 2;
  breakdown["Verificación de contacto"] = ver;
  if (!input.emailVerified) recs.push("Verifica tu email para acelerar el alta.");

  const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

  let tier: Tier = "basic";
  if (total >= 75) tier = "premium";
  else if (total >= 50) tier = "advanced";

  return { total, tier, breakdown, recommendations: recs };
}
