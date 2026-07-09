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
  valid: { color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: CheckCircle2 },
  expiring: { color: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: Clock },
  expired: { color: "bg-red-500/10 text-red-700 border-red-500/20", icon: XCircle },
  missing: { color: "bg-muted text-muted-foreground border-border", icon: AlertTriangle },
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
    toast.success(t("documents.toasts.updated"), { description: t("documents.toasts.updatedDesc", { name: uploading.name }) });
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
        <SummaryCard label={t("documents.filters.valid")} count={counts.valid} active={filter === "valid"} onClick={() => setFilter(filter === "valid" ? "all" : "valid")} tone="emerald" />
        <SummaryCard label={t("documents.filters.expiring")} count={counts.expiring} active={filter === "expiring"} onClick={() => setFilter(filter === "expiring" ? "all" : "expiring")} tone="amber" />
        <SummaryCard label={t("documents.filters.expired")} count={counts.expired} active={filter === "expired"} onClick={() => setFilter(filter === "expired" ? "all" : "expired")} tone="red" />
        <SummaryCard label={t("documents.filters.missing")} count={counts.missing} active={filter === "missing"} onClick={() => setFilter(filter === "missing" ? "all" : "missing")} tone="muted" />
      </div>

      {filter !== "all" && (
        <button onClick={() => setFilter("all")} className="text-sm text-ink hover:text-ink/60 underline underline-offset-4">
          {t("documents.filters.viewAll")}
        </button>
      )}

      {/* Document list — hairline rows */}
      <div className="rounded-2xl border border-black/[0.06] bg-white overflow-hidden">
        <ul className="divide-y divide-black/[0.06]">
          {filtered.map((doc) => {
            const Icon = typeIcon[doc.type] ?? FileText;
            const cfg = statusConfig[doc.status];
            const StatusIcon = cfg.icon;
            return (
              <li key={doc.id} className="group px-5 md:px-6 py-4 hover:bg-black/[0.02] transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                    doc.status === "valid" && "bg-emerald-500/10 text-emerald-700",
                    doc.status === "expiring" && "bg-amber-500/10 text-amber-700",
                    doc.status === "expired" && "bg-red-500/10 text-red-700",
                    doc.status === "missing" && "bg-ink/[0.04] text-ink/50",
                  )}>
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-ink tracking-tight">{doc.name}</p>
                      <Badge variant="outline" className={cn("gap-1 text-[11px] font-normal border-0", cfg.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {t(`documents.status.${doc.status}`)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-ink/50">
                      {doc.fileName && <span>📎 {doc.fileName}</span>}
                      {doc.issuedAt && <span>{t("documents.fields.issued")}: {formatDate(doc.issuedAt)}</span>}
                      {doc.expiresAt && <span>{t("documents.fields.expires")}: {formatDate(doc.expiresAt)}</span>}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {doc.fileName && (
                      <Button variant="ghost" size="sm" className="gap-1 text-ink/60 hover:text-ink hover:bg-black/[0.04] rounded-full">
                        <Download className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t("documents.actions.download")}</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={doc.status === "missing" || doc.status === "expired" ? "default" : "outline"}
                      className={cn(
                        "gap-1 rounded-full",
                        doc.status === "missing" || doc.status === "expired"
                          ? "bg-ink text-bone hover:bg-ink/90"
                          : "border-black/10 bg-transparent text-ink hover:bg-black/[0.04]"
                      )}
                      onClick={() => setUploading(doc)}
                    >
                      {doc.status === "missing" ? <Upload className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">
                        {doc.status === "missing" ? t("documents.actions.upload") : t("documents.actions.renew")}
                      </span>
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Upload dialog */}
      <Dialog open={!!uploading} onOpenChange={(o) => !o && setUploading(null)}>
        <DialogContent className="sm:max-w-md">
          {uploading && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {uploading.status === "missing" ? t("documents.dialog.uploadTitle") : t("documents.dialog.renewTitle")}
                </DialogTitle>
                <DialogDescription>{uploading.name}</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleUpload} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="file">{t("documents.fields.file")}</Label>
                  <Input id="file" name="file" type="file" accept=".pdf,.jpg,.png" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires_at">{t("documents.fields.expiresLabel")}</Label>
                  <Input id="expires_at" name="expires_at" type="date" />
                  <p className="text-xs text-muted-foreground">
                    {t("documents.fields.expiresHelp")}
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setUploading(null)} className="flex-1">
                    {t("documents.actions.cancel")}
                  </Button>
                  <Button type="submit" className="flex-1 gap-2">
                    <Upload className="h-4 w-4" />
                    {t("documents.actions.upload")}
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

const toneAccent: Record<string, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  muted: "bg-ink/30",
};

const SummaryCard = ({
  label, count, active, onClick, tone,
}: {
  label: string; count: number; active: boolean; onClick: () => void; tone: keyof typeof toneAccent;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "group relative p-5 rounded-2xl border bg-white text-left transition-all",
      active
        ? "border-ink/30 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.10)]"
        : "border-black/[0.06] hover:border-black/[0.12]",
    )}
  >
    <p className="font-display text-[2rem] leading-none text-ink tracking-tight tabular-nums">{count}</p>
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40 mt-3">{label}</p>
    <div className={cn("absolute left-5 right-5 bottom-0 h-px transition-opacity", toneAccent[tone], active ? "opacity-80" : "opacity-30 group-hover:opacity-60")} />
  </button>
);

export default PortalDocuments;
