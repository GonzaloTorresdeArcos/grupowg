/**
 * Validación de NIF/NIE/CIF español.
 * Retorna { valid, type, formatted, reason? }
 */

export type DocType = "NIF" | "NIE" | "CIF" | "UNKNOWN";

const NIF_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE";

export interface CifValidationResult {
  valid: boolean;
  type: DocType;
  formatted: string;
  reason?: string;
}

const cleanInput = (raw: string) => raw.replace(/[\s-]/g, "").toUpperCase();

function validateNIF(value: string): CifValidationResult {
  const m = value.match(/^(\d{8})([A-Z])$/);
  if (!m) return { valid: false, type: "NIF", formatted: value, reason: "Formato NIF incorrecto" };
  const expected = NIF_LETTERS[parseInt(m[1], 10) % 23];
  if (expected !== m[2]) return { valid: false, type: "NIF", formatted: value, reason: "Letra de control NIF incorrecta" };
  return { valid: true, type: "NIF", formatted: value };
}

function validateNIE(value: string): CifValidationResult {
  const m = value.match(/^([XYZ])(\d{7})([A-Z])$/);
  if (!m) return { valid: false, type: "NIE", formatted: value, reason: "Formato NIE incorrecto" };
  const prefix = { X: "0", Y: "1", Z: "2" }[m[1] as "X" | "Y" | "Z"];
  const expected = NIF_LETTERS[parseInt(prefix + m[2], 10) % 23];
  if (expected !== m[3]) return { valid: false, type: "NIE", formatted: value, reason: "Letra de control NIE incorrecta" };
  return { valid: true, type: "NIE", formatted: value };
}

function validateCIF(value: string): CifValidationResult {
  const m = value.match(/^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/);
  if (!m) return { valid: false, type: "CIF", formatted: value, reason: "Formato CIF incorrecto" };

  const central = m[2];
  let sumPair = 0;
  let sumOdd = 0;
  for (let i = 0; i < 7; i++) {
    const d = parseInt(central[i], 10);
    if (i % 2 === 0) {
      const doubled = d * 2;
      sumOdd += Math.floor(doubled / 10) + (doubled % 10);
    } else {
      sumPair += d;
    }
  }
  const total = sumOdd + sumPair;
  const lastDigit = total % 10 === 0 ? 0 : 10 - (total % 10);
  const controlLetter = "JABCDEFGHI"[lastDigit];

  const provided = m[3];
  const isLetter = /[A-J]/.test(provided);
  const isDigit = /\d/.test(provided);

  // Letras del primer carácter que requieren letra obligatoria al final: P, Q, R, S, N, W
  const lettersOnly = ["P", "Q", "R", "S", "N", "W"].includes(m[1]);

  let ok = false;
  if (lettersOnly) ok = isLetter && provided === controlLetter;
  else if (isDigit) ok = parseInt(provided, 10) === lastDigit;
  else if (isLetter) ok = provided === controlLetter;

  if (!ok) return { valid: false, type: "CIF", formatted: value, reason: "Dígito de control CIF incorrecto" };
  return { valid: true, type: "CIF", formatted: value };
}

export function validateSpanishDoc(raw: string): CifValidationResult {
  const value = cleanInput(raw);
  if (!value) return { valid: false, type: "UNKNOWN", formatted: value, reason: "Vacío" };

  if (/^\d{8}[A-Z]$/.test(value)) return validateNIF(value);
  if (/^[XYZ]\d{7}[A-Z]$/.test(value)) return validateNIE(value);
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(value)) return validateCIF(value);

  return { valid: false, type: "UNKNOWN", formatted: value, reason: "Formato no reconocido (NIF/NIE/CIF)" };
}

/**
 * Reservado para integración futura con un proveedor real de datos
 * empresariales (eInforma, Axesor, INE, registro mercantil…).
 * Devuelve siempre `null` hasta que se conecte una fuente verificable:
 * preferimos no sugerir nada antes que sugerir un nombre incorrecto.
 */
export function lookupCompanyName(_doc: string): string | null {
  return null;
}
