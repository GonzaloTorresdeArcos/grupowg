import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export interface AgreementData {
  signerName: string;
  signerDni?: string;
  signerEmail: string;
  companyName: string;
  cif: string;
  signatureDataUrl: string;
  signedAt: Date;
  applicationId?: string;
  draftId?: string;
}

/** Cláusulas del acuerdo, reutilizables en pantalla y en PDF. */
export const AGREEMENT_TITLE = "Acuerdo de colaboración";
export const AGREEMENT_SUBTITLE = "WG Professional Network";

export const AGREEMENT_INTRO =
  "El firmante declara, como representante legal o autorizado de la empresa indicada, que:";

export const AGREEMENT_CLAUSES: string[] = [
  "Los datos aportados en el formulario de inscripción son veraces y completos.",
  "Acepta las condiciones generales del programa WG Professional Network y se compromete a aportar la documentación obligatoria pendiente para la activación operativa.",
  "Autoriza a Welife Group a tratar los datos facilitados con la finalidad de gestionar esta inscripción y, si procede, formalizar la relación de colaboración.",
  "Se compromete a comunicar cualquier cambio relevante en su capacidad operativa, estructura societaria, seguros o documentación obligatoria.",
];

export const AGREEMENT_CLOSING =
  "El presente acuerdo manifiesta la voluntad inicial de incorporación a la red. La formalización contractual definitiva se realizará tras la validación documental y la firma del contrato mercantil correspondiente.";

interface DraftPdfData {
  signerName?: string;
  signerDni?: string;
  signerEmail?: string;
  companyName?: string;
  cif?: string;
}

/** Genera un PDF borrador (sin firma) para que el usuario lo lea/descargue. Devuelve un Blob. */
export function generateDraftAgreementPdf(d: DraftPdfData = {}): Blob {
  const doc = buildAgreementDoc({
    signerName: d.signerName || "—",
    signerDni: d.signerDni,
    signerEmail: d.signerEmail || "—",
    companyName: d.companyName || "—",
    cif: d.cif || "—",
    signatureDataUrl: "",
    signedAt: new Date(),
    isDraft: true,
  });
  return doc.output("blob");
}

function buildAgreementDoc(d: AgreementData & { isDraft?: boolean }): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const margin = 56;
  const contentWidth = w - margin * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 30, 40);
  doc.text(AGREEMENT_TITLE, margin, 80);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80, 90, 100);
  doc.text(AGREEMENT_SUBTITLE, margin, 100);

  if (d.isDraft) {
    doc.setFontSize(10);
    doc.setTextColor(180, 110, 30);
    doc.text("BORRADOR — sin firma", w - margin, 100, { align: "right" });
  }

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, 115, w - margin, 115);

  let y = 145;
  doc.setFontSize(10);
  doc.setTextColor(120, 130, 140);
  doc.text("FIRMANTE", margin, y);
  y += 18;
  doc.setFontSize(11);
  doc.setTextColor(20, 30, 40);
  doc.text(`Nombre: ${d.signerName}`, margin, y); y += 16;
  if (d.signerDni) { doc.text(`DNI/NIE: ${d.signerDni}`, margin, y); y += 16; }
  doc.text(`Email: ${d.signerEmail}`, margin, y); y += 16;

  y += 12;
  doc.setFontSize(10);
  doc.setTextColor(120, 130, 140);
  doc.text("EMPRESA", margin, y);
  y += 18;
  doc.setFontSize(11);
  doc.setTextColor(20, 30, 40);
  doc.text(`Razón social: ${d.companyName}`, margin, y); y += 16;
  doc.text(`CIF/NIF: ${d.cif}`, margin, y); y += 24;

  doc.setFontSize(11);
  doc.setTextColor(40, 50, 60);
  const introLines = doc.splitTextToSize(AGREEMENT_INTRO, contentWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 14 + 6;

  AGREEMENT_CLAUSES.forEach((clause, i) => {
    const text = `${i + 1}. ${clause}`;
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin, y);
    y += lines.length * 14 + 4;
  });

  y += 6;
  const closingLines = doc.splitTextToSize(AGREEMENT_CLOSING, contentWidth);
  doc.text(closingLines, margin, y);
  y += closingLines.length * 14;

  y += 24;
  doc.setFontSize(10);
  doc.setTextColor(120, 130, 140);
  doc.text("FIRMA DEL COLABORADOR", margin, y);
  y += 10;

  if (d.signatureDataUrl) {
    try {
      doc.addImage(d.signatureDataUrl, "PNG", margin, y, 200, 80);
    } catch {
      // ignorar errores de imagen
    }
    y += 90;
  } else {
    y += 90;
  }
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, margin + 220, y);
  y += 14;
  doc.setFontSize(9);
  doc.setTextColor(120, 130, 140);
  if (!d.isDraft) {
    doc.text(`Firmado: ${d.signedAt.toLocaleString("es-ES")}`, margin, y);
  } else {
    doc.text("Pendiente de firma", margin, y);
  }

  doc.setFontSize(8);
  doc.setTextColor(160, 170, 180);
  doc.text(
    "Documento generado electrónicamente por WG Professional Network · Welife Group",
    margin,
    doc.internal.pageSize.getHeight() - 30,
  );

  return doc;
}

/** Genera el PDF del acuerdo y lo sube a Storage. Devuelve { path }. */
export async function generateAndUploadAgreement(d: AgreementData): Promise<{ path: string; blob: Blob }> {
  const doc = buildAgreementDoc(d);
  const blob = doc.output("blob");
  const path = `${d.applicationId || d.draftId || "anon"}/${Date.now()}-acuerdo.pdf`;

  const { error } = await supabase.storage.from("wg-agreements").upload(path, blob, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw error;

  return { path, blob };
}
