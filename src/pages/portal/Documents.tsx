import { useState } from "react";
import { useTranslation } from "react-i18next";
import { mockDocuments, formatDate, type CollabDocument } from "@/lib/portal-mocks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  FileText, Upload, AlertTriangle, CheckCircle2, XCircle, Clock,
  Shield, Award, Car, Briefcase, HardHat, FileCheck, Download, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const typeIcon: Record<string, typeof Shield> = {
  seguro_rc: Shield,
  certificado_tecnico: Award,
  itv_vehiculo: Car,
  alta_autonomos: Briefcase,
  prl: HardHat,
  iae: FileCheck,
};

const statusConfig = {
  valid: { label: "Vigente", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: CheckCircle2 },
  expiring: { label: "Próximo a vencer", color: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: Clock },
  expired: { label: "Vencido", color: "bg-red-500/10 text-red-700 border-red-500/20", icon: XCircle },
  missing: { label: "Pendiente", color: "bg-muted text-muted-foreground border-border", icon: AlertTriangle },
};

const PortalDocuments = () => {
  const { t } = useTranslation("portal");
  const [docs, setDocs] = useState<CollabDocument[]>(mockDocuments);
  const [uploading, setUploading] = useState<CollabDocument | null>(null);
  const [filter, setFilter] = useState<"all" | "valid" | "expiring" | "expired" | "missing">("all");

  const filtered = filter === "all" ? docs : docs.filter((d) => d.status === filter);

  const counts = {
    valid: docs.filter((d) => d.status === "valid").length,
    expiring: docs.filter((d) => d.status === "expiring").length,
    expired: docs.filter((d) => d.status === "expired").length,
    missing: docs.filter((d) => d.status === "missing").length,
  };

  const handleUpload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!uploading) return;
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File | null;
    const expires = String(fd.get("expires_at") || "");

    setDocs((prev) =>
      prev.map((d) =>
        d.id === uploading.id
          ? {
            ...d,
            fileName: file?.name || "documento.pdf",
            issuedAt: new Date().toISOString().slice(0, 10),
            expiresAt: expires || undefined,
            status: "valid" as const,
          }
          : d,
      ),
    );
    toast.success("Documento actualizado", { description: `${uploading.name} se ha renovado correctamente.` });
    setUploading(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">{t("documents.eyebrow")}</p>
        <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">
          {t("documents.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("documents.subtitle")}
        </p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Vigentes" count={counts.valid} active={filter === "valid"} onClick={() => setFilter(filter === "valid" ? "all" : "valid")} tone="emerald" />
        <SummaryCard label="Próximos" count={counts.expiring} active={filter === "expiring"} onClick={() => setFilter(filter === "expiring" ? "all" : "expiring")} tone="amber" />
        <SummaryCard label="Vencidos" count={counts.expired} active={filter === "expired"} onClick={() => setFilter(filter === "expired" ? "all" : "expired")} tone="red" />
        <SummaryCard label="Pendientes" count={counts.missing} active={filter === "missing"} onClick={() => setFilter(filter === "missing" ? "all" : "missing")} tone="muted" />
      </div>

      {filter !== "all" && (
        <button onClick={() => setFilter("all")} className="text-sm text-teal hover:underline">
          ← Ver todos los documentos
        </button>
      )}

      {/* Document list */}
      <div className="space-y-3">
        {filtered.map((doc) => {
          const Icon = typeIcon[doc.type] ?? FileText;
          const cfg = statusConfig[doc.status];
          const StatusIcon = cfg.icon;
          return (
            <Card key={doc.id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className={cn(
                  "h-12 w-12 rounded-lg flex items-center justify-center shrink-0",
                  doc.status === "valid" && "bg-emerald-500/10 text-emerald-700",
                  doc.status === "expiring" && "bg-amber-500/10 text-amber-700",
                  doc.status === "expired" && "bg-red-500/10 text-red-700",
                  doc.status === "missing" && "bg-muted text-muted-foreground",
                )}>
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-ink">{doc.name}</p>
                    <Badge variant="outline" className={cn("gap-1 text-xs", cfg.color)}>
                      <StatusIcon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                    {doc.fileName && <span>📎 {doc.fileName}</span>}
                    {doc.issuedAt && <span>Emitido: {formatDate(doc.issuedAt)}</span>}
                    {doc.expiresAt && <span>Vence: {formatDate(doc.expiresAt)}</span>}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  {doc.fileName && (
                    <Button variant="outline" size="sm" className="gap-1">
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Descargar</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={doc.status === "missing" || doc.status === "expired" ? "default" : "outline"}
                    className="gap-1"
                    onClick={() => setUploading(doc)}
                  >
                    {doc.status === "missing" ? <Upload className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">
                      {doc.status === "missing" ? "Subir" : "Renovar"}
                    </span>
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Upload dialog */}
      <Dialog open={!!uploading} onOpenChange={(o) => !o && setUploading(null)}>
        <DialogContent className="sm:max-w-md">
          {uploading && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {uploading.status === "missing" ? "Subir" : "Renovar"} documento
                </DialogTitle>
                <DialogDescription>{uploading.name}</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleUpload} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="file">Archivo (PDF, máx. 10 MB)</Label>
                  <Input id="file" name="file" type="file" accept=".pdf,.jpg,.png" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires_at">Fecha de vencimiento</Label>
                  <Input id="expires_at" name="expires_at" type="date" />
                  <p className="text-xs text-muted-foreground">
                    Te avisaremos 60, 30 y 7 días antes del vencimiento.
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setUploading(null)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 gap-2">
                    <Upload className="h-4 w-4" />
                    Subir
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const toneClasses: Record<string, string> = {
  emerald: "border-emerald-500/30 bg-emerald-50/50 text-emerald-700",
  amber: "border-amber-500/30 bg-amber-50/50 text-amber-700",
  red: "border-red-500/30 bg-red-50/50 text-red-700",
  muted: "border-border bg-muted/30 text-muted-foreground",
};

const SummaryCard = ({
  label, count, active, onClick, tone,
}: {
  label: string; count: number; active: boolean; onClick: () => void; tone: keyof typeof toneClasses;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "p-4 rounded-xl border-2 text-left transition-all",
      active ? toneClasses[tone] + " ring-2 ring-offset-2 ring-current/20" : "border-border bg-card hover:border-ink/20",
    )}
  >
    <p className="font-display text-3xl text-ink leading-none">{count}</p>
    <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mt-2">{label}</p>
  </button>
);

export default PortalDocuments;
