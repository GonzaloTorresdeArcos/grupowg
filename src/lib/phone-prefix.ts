// Inferencia de prefijo internacional según el código postal introducido.
// Pensado para los países donde Grupo WG opera (España, Portugal, …).
// Si no podemos inferirlo, devolvemos `null` y el usuario lo elige manualmente.

export interface CountryPhone {
  /** ISO-3166-1 alpha-2 */
  code: "ES" | "PT" | "FR" | "IT" | "DE" | "OTHER";
  /** Prefijo internacional con `+` (ej. "+34"). */
  dial: string;
  /** Etiqueta amigable. */
  label: string;
  /** Bandera emoji (cosmético). */
  flag: string;
}

export const COUNTRIES: Record<CountryPhone["code"], CountryPhone> = {
  ES: { code: "ES", dial: "+34",  label: "España",   flag: "🇪🇸" },
  PT: { code: "PT", dial: "+351", label: "Portugal", flag: "🇵🇹" },
  FR: { code: "FR", dial: "+33",  label: "Francia",  flag: "🇫🇷" },
  IT: { code: "IT", dial: "+39",  label: "Italia",   flag: "🇮🇹" },
  DE: { code: "DE", dial: "+49",  label: "Alemania", flag: "🇩🇪" },
  OTHER: { code: "OTHER", dial: "+", label: "Otro país", flag: "🌐" },
};

/** Devuelve el país más probable para un CP dado o null si no podemos inferir. */
export function countryFromPostalCode(cp: string): CountryPhone | null {
  const raw = (cp ?? "").trim();
  if (!raw) return null;

  // Portugal: NNNN o NNNN-NNN
  if (/^\d{4}(-\d{3})?$/.test(raw)) return COUNTRIES.PT;

  // España: 5 dígitos cuyos 2 primeros estén en 01..52 (provincias)
  if (/^\d{5}$/.test(raw)) {
    const prefix = parseInt(raw.slice(0, 2), 10);
    if (prefix >= 1 && prefix <= 52) return COUNTRIES.ES;
    // Otros países que también usan 5 dígitos: dejamos que el usuario elija.
    return null;
  }

  return null;
}

/** Limpia el número local: quita espacios, guiones, paréntesis y prefijos duplicados. */
export function sanitizeLocalNumber(input: string, dial: string): string {
  let v = (input ?? "").replace(/[^\d+]/g, "");
  if (v.startsWith(dial)) v = v.slice(dial.length);
  else if (v.startsWith("00")) v = v.slice(2 + dial.replace("+", "").length);
  else if (v.startsWith("+")) v = v.replace(/^\+\d{1,4}/, "");
  return v.replace(/\D/g, "");
}

/** Compone el E.164 a enviar al backend OTP. */
export function composeE164(dial: string, local: string): string {
  const clean = local.replace(/\D/g, "");
  if (!clean) return "";
  return `${dial}${clean}`;
}
