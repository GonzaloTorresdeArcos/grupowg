import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { mockAppointments, type Appointment } from "@/lib/portal-mocks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ChevronLeft, ChevronRight, MapPin, Clock, User, Package, CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

const localeFor = (lng?: string) =>
  lng?.startsWith("es") ? "es-ES" : lng?.startsWith("pt") ? "pt-PT" : lng?.startsWith("fr") ? "fr-FR" : "en-GB";

const startOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Lunes = 0
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
};

const PortalCalendar = () => {
  const { t, i18n } = useTranslation("portal");
  const locale = localeFor(i18n.language);
  const dayNames = t("calendar.days", { returnObjects: true }) as string[];
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState<Appointment | null>(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }),
    [weekStart],
  );

  const apptsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    days.forEach((d) => map.set(d.toDateString(), []));
    mockAppointments.forEach((a) => {
      const k = new Date(a.scheduledAt).toDateString();
      if (map.has(k)) map.get(k)!.push(a);
    });
    map.forEach((arr) => arr.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
    return map;
  }, [days]);

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString();

  const monthLabel = weekStart.toLocaleDateString(locale, { month: "long", year: "numeric" });

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow mb-2">{t("calendar.eyebrow")}</p>
        <h1 className="font-display text-3xl md:text-4xl text-ink leading-tight">{t("calendar.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("calendar.subtitle")}</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => {
            const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d);
          }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => {
            const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d);
          }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(startOfWeek(new Date()))}>
            {t("calendar.today")}
          </Button>
          <p className="font-display text-lg text-ink ml-2 capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-teal" />{t("calendar.legend.scheduled")}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" />{t("calendar.legend.inProgress")}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />{t("calendar.legend.completed")}</span>
        </div>
      </div>

      {/* Week grid */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {days.map((d, i) => (
            <div
              key={i}
              className={cn(
                "p-3 text-center border-r border-border last:border-r-0",
                isToday(d) && "bg-ink/5",
              )}
            >
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">{dayNames[i]}</p>
              <p className={cn("font-display text-2xl mt-1", isToday(d) ? "text-teal" : "text-ink")}>
                {d.getDate()}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 min-h-[300px]">
          {days.map((d, i) => {
            const appts = apptsByDay.get(d.toDateString()) ?? [];
            return (
              <div
                key={i}
                className={cn(
                  "p-2 border-r border-border last:border-r-0 space-y-1.5",
                  isToday(d) && "bg-ink/5",
                )}
              >
                {appts.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground/50 text-center mt-4">—</p>
                ) : (
                  appts.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className="w-full text-left p-2 rounded-md bg-card border border-border hover:border-teal hover:bg-teal/5 transition-colors group"
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          a.status === "scheduled" && "bg-teal",
                          a.status === "in_progress" && "bg-amber-500",
                          a.status === "completed" && "bg-emerald-500",
                        )} />
                        <p className="text-[11px] font-mono text-muted-foreground">
                          {new Date(a.scheduledAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <p className="text-xs font-medium text-ink line-clamp-1">{a.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{a.customer}</p>
                    </button>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Upcoming list */}
      <div>
        <h2 className="font-display text-xl text-ink mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-teal" />
          {t("calendar.upcoming")}
        </h2>
        <div className="space-y-2">
          {mockAppointments.slice(0, 6).map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className="w-full text-left p-4 rounded-lg border border-border bg-card hover:border-teal transition-colors flex items-start gap-4"
            >
              <div className="text-center shrink-0 w-16">
                <p className="font-display text-2xl text-ink leading-none">
                  {new Date(a.scheduledAt).getDate()}
                </p>
                <p className="text-[11px] font-mono uppercase text-muted-foreground mt-1">
                  {new Date(a.scheduledAt).toLocaleDateString(locale, { month: "short" })}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-mono text-muted-foreground">{a.caseRef}</p>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5">{a.brand}</Badge>
                </div>
                <p className="text-sm font-medium text-ink">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.customer}</p>
              </div>
              <div className="hidden sm:block text-right text-xs text-muted-foreground">
                <p className="flex items-center gap-1 justify-end">
                  <Clock className="h-3 w-3" />
                  {new Date(a.scheduledAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                </p>
                <p className="flex items-center gap-1 justify-end mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {a.city}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <p className="text-xs font-mono text-muted-foreground">{selected.caseRef}</p>
                <DialogTitle className="font-display text-xl">{selected.title}</DialogTitle>
                <DialogDescription>
                  {new Date(selected.scheduledAt).toLocaleDateString(locale, {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })} · {new Date(selected.scheduledAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 mt-2">
                <DetailRow icon={User} label={t("calendar.detail.customer")} value={selected.customer} />
                <DetailRow icon={MapPin} label={t("calendar.detail.address")} value={`${selected.address}, ${selected.city}`} />
                <DetailRow icon={Package} label={t("calendar.detail.product")} value={`${selected.brand} · ${selected.family}`} />
                <DetailRow icon={Clock} label={t("calendar.detail.duration")} value={`${selected.durationMin} ${t("calendar.detail.minutes")}`} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1">{t("calendar.detail.viewCase")}</Button>
                <Button className="flex-1">{t("calendar.detail.confirmArrival")}</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DetailRow = ({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) => (
  <div className="flex items-start gap-3">
    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
      <Icon className="h-4 w-4 text-muted-foreground" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-ink">{value}</p>
    </div>
  </div>
);

export default PortalCalendar;
