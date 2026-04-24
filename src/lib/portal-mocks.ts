// Datos mock realistas para el portal del colaborador.
// Pensados para validar UX. Se sustituirán por queries reales contra Supabase.

export type Incidence = {
  id: string;
  ref: string;
  customer: string;
  brand: string;
  family: string;
  city: string;
  status: "abierta" | "en_curso" | "esperando_repuesto" | "cerrada";
  openedAt: string; // ISO
  tat_h: number;
};

export const mockKpis = {
  active: 14,
  closed_month: 87,
  ftf_pct: 89.2,
  tat_avg_days: 5.4,
  rating: 4.7,
  cases_ytd: 642,
  earnings_month: 8420,
  pending_settlement: 2350,
};

export const mockIncidences: Incidence[] = [
  { id: "1", ref: "WG-2024-1842", customer: "M. Rodríguez", brand: "Vestel", family: "Lavadora", city: "Madrid", status: "en_curso", openedAt: "2025-04-22T09:14:00Z", tat_h: 38 },
  { id: "2", ref: "WG-2024-1838", customer: "C. Pérez", brand: "Cecotec", family: "Robot cocina", city: "Alcobendas", status: "esperando_repuesto", openedAt: "2025-04-20T11:30:00Z", tat_h: 88 },
  { id: "3", ref: "WG-2024-1825", customer: "J. García", brand: "Sauber", family: "Frigorífico", city: "Madrid", status: "abierta", openedAt: "2025-04-23T16:00:00Z", tat_h: 8 },
  { id: "4", ref: "WG-2024-1820", customer: "L. Martín", brand: "Evvo", family: "Lavavajillas", city: "Getafe", status: "en_curso", openedAt: "2025-04-21T10:00:00Z", tat_h: 60 },
  { id: "5", ref: "WG-2024-1815", customer: "P. Ruiz", brand: "Vestel", family: "Horno", city: "Móstoles", status: "abierta", openedAt: "2025-04-23T08:30:00Z", tat_h: 10 },
];

// Tendencia mensual (12 meses) para gráfico
export const mockMonthlyTrend = [
  { month: "May", incidences: 68, ftf: 84 },
  { month: "Jun", incidences: 72, ftf: 86 },
  { month: "Jul", incidences: 75, ftf: 85 },
  { month: "Ago", incidences: 64, ftf: 87 },
  { month: "Sep", incidences: 78, ftf: 88 },
  { month: "Oct", incidences: 82, ftf: 86 },
  { month: "Nov", incidences: 85, ftf: 89 },
  { month: "Dic", incidences: 70, ftf: 88 },
  { month: "Ene", incidences: 88, ftf: 90 },
  { month: "Feb", incidences: 91, ftf: 89 },
  { month: "Mar", incidences: 95, ftf: 91 },
  { month: "Abr", incidences: 87, ftf: 89 },
];

// Citas (calendario)
export type Appointment = {
  id: string;
  caseRef: string;
  title: string;
  customer: string;
  address: string;
  city: string;
  brand: string;
  family: string;
  scheduledAt: string; // ISO
  durationMin: number;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
};

const today = new Date();
const day = (offset: number, h: number, m = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const mockAppointments: Appointment[] = [
  { id: "a1", caseRef: "WG-2024-1842", title: "Diagnóstico lavadora", customer: "M. Rodríguez", address: "C/ Alcalá 142, 4º B", city: "Madrid", brand: "Vestel", family: "Lavadora", scheduledAt: day(0, 10, 0), durationMin: 60, status: "scheduled" },
  { id: "a2", caseRef: "WG-2024-1838", title: "Instalación repuesto", customer: "C. Pérez", address: "Av. Europa 22", city: "Alcobendas", brand: "Cecotec", family: "Robot cocina", scheduledAt: day(0, 12, 30), durationMin: 90, status: "scheduled" },
  { id: "a3", caseRef: "WG-2024-1820", title: "Reparación lavavajillas", customer: "L. Martín", address: "C/ Mayor 8", city: "Getafe", brand: "Evvo", family: "Lavavajillas", scheduledAt: day(0, 16, 0), durationMin: 60, status: "scheduled" },
  { id: "a4", caseRef: "WG-2024-1815", title: "Diagnóstico horno", customer: "P. Ruiz", address: "C/ Castilla 5", city: "Móstoles", brand: "Vestel", family: "Horno", scheduledAt: day(1, 9, 30), durationMin: 45, status: "scheduled" },
  { id: "a5", caseRef: "WG-2024-1825", title: "Visita frigorífico", customer: "J. García", address: "C/ Goya 88", city: "Madrid", brand: "Sauber", family: "Frigorífico", scheduledAt: day(1, 11, 30), durationMin: 60, status: "scheduled" },
  { id: "a6", caseRef: "WG-2024-1810", title: "Cierre incidencia", customer: "A. Lopez", address: "C/ Serrano 23", city: "Madrid", brand: "Vestel", family: "Microondas", scheduledAt: day(2, 10, 0), durationMin: 30, status: "scheduled" },
  { id: "a7", caseRef: "WG-2024-1808", title: "Instalación", customer: "R. Sanz", address: "C/ Princesa 4", city: "Madrid", brand: "Cecotec", family: "Aspirador", scheduledAt: day(3, 17, 0), durationMin: 60, status: "scheduled" },
  { id: "a8", caseRef: "WG-2024-1801", title: "Reparación", customer: "I. Romero", address: "C/ Velázquez 100", city: "Madrid", brand: "Evvo", family: "Lavadora", scheduledAt: day(4, 9, 0), durationMin: 90, status: "scheduled" },
];

// Documentos (renovación documental — set completo)
export type CollabDocument = {
  id: string;
  type: string;
  name: string;
  fileName?: string;
  issuedAt?: string;
  expiresAt?: string;
  status: "valid" | "expiring" | "expired" | "missing";
};

const futureDate = (daysFromNow: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};

export const mockDocuments: CollabDocument[] = [
  { id: "d1", type: "seguro_rc", name: "Seguro Responsabilidad Civil", fileName: "RC_2024_2025.pdf", issuedAt: "2024-06-15", expiresAt: futureDate(45), status: "valid" },
  { id: "d2", type: "certificado_tecnico", name: "Certificado técnico — Gama Blanca", fileName: "Cert_GB_2023.pdf", issuedAt: "2023-09-01", expiresAt: futureDate(12), status: "expiring" },
  { id: "d3", type: "certificado_tecnico", name: "Certificado técnico — Climatización (RITE)", fileName: "RITE_2024.pdf", issuedAt: "2024-02-10", expiresAt: futureDate(180), status: "valid" },
  { id: "d4", type: "itv_vehiculo", name: "ITV vehículo de servicio (4521-LXY)", fileName: "ITV_4521LXY.pdf", issuedAt: "2024-08-20", expiresAt: futureDate(90), status: "valid" },
  { id: "d5", type: "itv_vehiculo", name: "ITV vehículo de servicio (8870-MNB)", expiresAt: futureDate(-15), status: "expired" },
  { id: "d6", type: "alta_autonomos", name: "Alta autónomos / TGSS", fileName: "TGSS_alta.pdf", issuedAt: "2018-01-15", status: "valid" },
  { id: "d7", type: "prl", name: "Prevención Riesgos Laborales", fileName: "PRL_2024.pdf", issuedAt: "2024-03-01", expiresAt: futureDate(320), status: "valid" },
  { id: "d8", type: "iae", name: "Alta IAE", status: "missing" },
];

// Facturación
export type Invoice = {
  id: string;
  number: string;
  period: string;
  issuedAt: string;
  dueAt?: string;
  paidAt?: string;
  amountNet: number;
  vat: number;
  total: number;
  status: "paid" | "pending" | "overdue";
  serviceCount: number;
};

export const mockInvoices: Invoice[] = [
  { id: "i1", number: "WG-LIQ-2025-04", period: "Abril 2025", issuedAt: "2025-04-30", dueAt: "2025-05-30", amountNet: 6958.68, vat: 1461.32, total: 8420.00, status: "pending", serviceCount: 87 },
  { id: "i2", number: "WG-LIQ-2025-03", period: "Marzo 2025", issuedAt: "2025-03-31", paidAt: "2025-04-15", amountNet: 7280.00, vat: 1528.80, total: 8808.80, status: "paid", serviceCount: 95 },
  { id: "i3", number: "WG-LIQ-2025-02", period: "Febrero 2025", issuedAt: "2025-02-28", paidAt: "2025-03-12", amountNet: 6420.00, vat: 1348.20, total: 7768.20, status: "paid", serviceCount: 91 },
  { id: "i4", number: "WG-LIQ-2025-01", period: "Enero 2025", issuedAt: "2025-01-31", paidAt: "2025-02-14", amountNet: 6890.00, vat: 1446.90, total: 8336.90, status: "paid", serviceCount: 88 },
  { id: "i5", number: "WG-LIQ-2024-12", period: "Diciembre 2024", issuedAt: "2024-12-31", paidAt: "2025-01-13", amountNet: 5320.00, vat: 1117.20, total: 6437.20, status: "paid", serviceCount: 70 },
  { id: "i6", number: "WG-LIQ-2024-11", period: "Noviembre 2024", issuedAt: "2024-11-30", paidAt: "2024-12-12", amountNet: 6450.00, vat: 1354.50, total: 7804.50, status: "paid", serviceCount: 85 },
];

export const formatEUR = (n: number) =>
  n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

export const formatDate = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
};
