import { useState } from "react";
import { useTranslation } from "react-i18next";
import { mockInvoices, formatEUR, formatDate, type Invoice } from "@/lib/portal-mocks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Receipt, Download, Eye, TrendingUp, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusCfg = {
  paid: { color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: CheckCircle2 },
  pending: { color: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: Clock },
  overdue: { color: "bg-red-500/10 text-red-700 border-red-500/20", icon: AlertCircle },
};

const PortalInvoices = () => {
  const { t } = useTranslation("portal");
  const [selected, setSelected] = useState<Invoice | null>(null);

  const totalYear = mockInvoices.reduce((sum, i) => sum + i.total, 0);
  const totalPending = mockInvoices.filter((i) => i.status === "pending").reduce((s, i) => s + i.total, 0);
  const totalPaid = mockInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const avgPerService = totalYear / mockInvoices.reduce((s, i) => s + i.serviceCount, 0);

  const handleDownload = (inv: Invoice) => {
    toast.success(t("invoices.toasts.downloadStarted"), { description: `${inv.number}.pdf` });
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">{t("invoices.eyebrow")}</p>
        <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">
          {t("invoices.title")}
        </h1>
        <p className="text-muted-foreground mt-2">{t("invoices.subtitle")}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="h-9 w-9 rounded-lg bg-teal/10 text-teal flex items-center justify-center">
              <TrendingUp className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            {t("invoices.summary.total")}
          </p>
          <p className="font-display text-2xl text-ink leading-none">{formatEUR(totalYear)}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            {t("invoices.summary.paid")}
          </p>
          <p className="font-display text-2xl text-ink leading-none">{formatEUR(totalPaid)}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Clock className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            {t("invoices.summary.pending")}
          </p>
          <p className="font-display text-2xl text-ink leading-none">{formatEUR(totalPending)}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="h-9 w-9 rounded-lg bg-ink/5 text-ink flex items-center justify-center">
              <Receipt className="h-4 w-4" strokeWidth={1.75} />
            </div>
          </div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-1">
            {t("invoices.summary.average")}
          </p>
          <p className="font-display text-2xl text-ink leading-none">{formatEUR(avgPerService)}</p>
        </Card>
      </div>

      {/* Invoice table */}
      <Card>
        <div className="p-6 border-b border-border">
          <h2 className="font-display text-xl text-ink">{t("invoices.tableTitle")}</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("invoices.columns.number")}</TableHead>
              <TableHead>{t("invoices.columns.period")}</TableHead>
              <TableHead className="text-right">{t("invoices.columns.services")}</TableHead>
              <TableHead className="text-right">{t("invoices.columns.amount")}</TableHead>
              <TableHead>{t("invoices.columns.status")}</TableHead>
              <TableHead className="text-right">{t("invoices.columns.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockInvoices.map((inv) => {
              const cfg = statusCfg[inv.status];
              const StatusIcon = cfg.icon;
              return (
                <TableRow key={inv.id} className="cursor-pointer" onClick={() => setSelected(inv)}>
                  <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                  <TableCell>{inv.period}</TableCell>
                  <TableCell className="text-right tabular-nums">{inv.serviceCount}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatEUR(inv.total)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("gap-1", cfg.color)}>
                      <StatusIcon className="h-3 w-3" />
                      {t(`invoices.status.${inv.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => setSelected(inv)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(inv)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <p className="text-xs font-mono text-muted-foreground">{selected.number}</p>
                <DialogTitle className="font-display text-2xl">{t("invoices.detail.title")} {selected.period}</DialogTitle>
                <DialogDescription>
                  {t("invoices.detail.issuedOn")} {formatDate(selected.issuedAt)}
                  {selected.paidAt && ` · ${t("invoices.detail.paidOn")} ${formatDate(selected.paidAt)}`}
                  {selected.dueAt && !selected.paidAt && ` · ${t("invoices.detail.dueOn")} ${formatDate(selected.dueAt)}`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div className="rounded-lg bg-muted/40 p-4 space-y-2">
                  <Row label={t("invoices.detail.servicesBilled")} value={selected.serviceCount.toString()} />
                  <Row label={t("invoices.detail.net")} value={formatEUR(selected.amountNet)} />
                  <Row label={t("invoices.detail.vat")} value={formatEUR(selected.vat)} />
                  <div className="pt-2 mt-2 border-t border-border">
                    <Row label={t("invoices.detail.total")} value={formatEUR(selected.total)} bold />
                  </div>
                </div>

                <Badge variant="outline" className={cn("gap-1", statusCfg[selected.status].color)}>
                  {t(`invoices.status.${selected.status}`)}
                </Badge>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1">{t("invoices.detail.viewServices")}</Button>
                  <Button className="flex-1 gap-2" onClick={() => handleDownload(selected)}>
                    <Download className="h-4 w-4" />
                    {t("invoices.detail.downloadPdf")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className="flex justify-between text-sm">
    <span className={bold ? "font-medium text-ink" : "text-muted-foreground"}>{label}</span>
    <span className={cn("tabular-nums", bold ? "font-display text-lg text-ink" : "font-mono text-ink")}>
      {value}
    </span>
  </div>
);

export default PortalInvoices;
