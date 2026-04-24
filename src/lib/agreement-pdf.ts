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

/** Genera el PDF del acuerdo y lo sube a Storage. Devuelve { path }. */
export async function generateAndUploadAgreement(d: AgreementData): Promise<{ path: string; blob: Blob }> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const margin = 56;

  // Encabezado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(20, 30, 40);
  doc.text("Acuerdo de colaboración", margin, 80);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80, 90, 100);
  doc.text("WG Professional Network", margin, 100);

  // Línea
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, 115, w - margin, 115);

  // Datos del colaborador
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

  // Cuerpo legal
  doc.setFontSize(11);
  doc.setTextColor(40, 50, 60);
  const body = [
    "El firmante declara, como representante legal o autorizado de la empresa indicada, que:",
    "",
    "1. Los datos aportados en el formulario de inscripción son veraces y completos.",
    "2. Acepta las condiciones generales del programa WG Professional Network y se compromete",
    "   a aportar la documentación obligatoria pendiente para la activación operativa.",
    "3. Autoriza a Welife Group a tratar los datos facilitados con la finalidad de gestionar",
    "   esta inscripción y, si procede, formalizar la relación de colaboración.",
    "4. Se compromete a comunicar cualquier cambio relevante en su capacidad operativa,",
    "   estructura societaria, seguros o documentación obligatoria.",
    "",
    "El presente acuerdo manifiesta la voluntad inicial de incorporación a la red. La",
    "formalización contractual definitiva se realizará tras la validación documental y",
    "la firma del contrato mercantil correspondiente.",
  ];
  for (const line of body) {
    doc.text(line, margin, y);
    y += 14;
  }

  // Firma
  y += 24;
  doc.setFontSize(10);
  doc.setTextColor(120, 130, 140);
  doc.text("FIRMA DEL COLABORADOR", margin, y);
  y += 10;

  try {
    doc.addImage(d.signatureDataUrl, "PNG", margin, y, 200, 80);
  } catch {
    // ignorar errores de imagen
  }
  y += 90;
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, margin + 220, y);
  y += 14;
  doc.setFontSize(9);
  doc.setTextColor(120, 130, 140);
  doc.text(`Firmado: ${d.signedAt.toLocaleString("es-ES")}`, margin, y);

  // Pie
  doc.setFontSize(8);
  doc.setTextColor(160, 170, 180);
  doc.text(
    "Documento generado electrónicamente por WG Professional Network · Welife Group",
    margin,
    doc.internal.pageSize.getHeight() - 30,
  );

  const blob = doc.output("blob");
  const path = `${d.applicationId || d.draftId || "anon"}/${Date.now()}-acuerdo.pdf`;

  const { error } = await supabase.storage.from("wg-agreements").upload(path, blob, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw error;

  return { path, blob };
}
