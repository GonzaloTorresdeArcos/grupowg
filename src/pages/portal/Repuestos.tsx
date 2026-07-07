import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  MOCK_REPUESTOS, GAMA_LABEL, MARCAS_REPUESTO, type Repuesto, type GamaRepuesto,
} from "@/lib/negocio-mocks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Search, ShoppingCart, Plus, Minus, Trash2, Package, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const eur = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const stockDot: Record<Repuesto["stock"], string> = {
  alto: "bg-emerald-500",
  medio: "bg-amber-500",
  bajo: "bg-rose-500",
};
const stockLabel: Record<Repuesto["stock"], string> = {
  alto: "Stock disponible",
  medio: "Stock limitado",
  bajo: "Últimas unidades",
};

type Line = { id: string; qty: number };

const GAMAS: GamaRepuesto[] = ["blanca", "marron", "climatizacion", "pae", "movilidad", "profesional"];

const Repuestos = () => {
  useTranslation("portal");
  const [q, setQ] = useState("");
  const [gama, setGama] = useState<GamaRepuesto | "all">("all");
  const [marca, setMarca] = useState<string>("all");
  const [cart, setCart] = useState<Line[]>([]);
  const [openCart, setOpenCart] = useState(false);

  const items = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return MOCK_REPUESTOS.filter((r) => {
      if (gama !== "all" && r.gama !== gama) return false;
      if (marca !== "all" && r.marca !== marca) return false;
      if (!qn) return true;
      return (
        r.nombre.toLowerCase().includes(qn) ||
        r.ref.toLowerCase().includes(qn) ||
        r.marca.toLowerCase().includes(qn)
      );
    });
  }, [q, gama, marca]);

  const add = (id: string) => {
    setCart((c) => {
      const e = c.find((l) => l.id === id);
      if (e) return c.map((l) => (l.id === id ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { id, qty: 1 }];
    });
    toast.success("Añadido al pedido");
  };
  const setQty = (id: string, qty: number) =>
    setCart((c) => (qty <= 0 ? c.filter((l) => l.id !== id) : c.map((l) => (l.id === id ? { ...l, qty } : l))));
  const remove = (id: string) => setCart((c) => c.filter((l) => l.id !== id));

  const detailed = cart.map((l) => ({ ...l, ref: MOCK_REPUESTOS.find((r) => r.id === l.id)! }));
  const total = detailed.reduce((acc, l) => acc + l.ref.precio * l.qty, 0);
  const totalUnits = cart.reduce((a, l) => a + l.qty, 0);

  const submit = () => {
    toast.success("Pedido de repuestos enviado", { description: "Recibirás confirmación por email." });
    setCart([]);
    setOpenCart(false);
  };

  return (
    <div className="space-y-10">
      <Helmet>
        <title>Repuesto a coste · Portal WG</title>
      </Helmet>

      {/* Header */}
      <div>
        <p className="eyebrow mb-2">Mi negocio</p>
        <h1 className="font-display text-3xl md:text-5xl text-ink leading-[1.02] tracking-tight max-w-3xl">
          Repuesto OEM al precio que a nosotros nos cuesta.
        </h1>
        <p className="text-muted-foreground mt-3 text-base md:text-lg max-w-2xl">
          Sin margen WG. Sin intermediarios. El mismo coste que aparece en nuestra factura de compra.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { k: "+100", v: "marcas gestionadas" },
            { k: "Vestel", v: "stock activado" },
            { k: "0 %", v: "margen WG sobre pieza" },
          ].map((s) => (
            <Card key={s.v} className="p-4 flex items-baseline gap-3 border-border">
              <span className="font-display text-2xl text-ink leading-none">{s.k}</span>
              <span className="text-sm text-muted-foreground">{s.v}</span>
            </Card>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por referencia, pieza o marca…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip active={gama === "all"} onClick={() => setGama("all")}>Todas las gamas</FilterChip>
          {GAMAS.map((g) => (
            <FilterChip key={g} active={gama === g} onClick={() => setGama(g)}>
              {GAMA_LABEL[g]}
            </FilterChip>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterChip active={marca === "all"} onClick={() => setMarca("all")} subtle>Todas las marcas</FilterChip>
          {MARCAS_REPUESTO.map((m) => (
            <FilterChip key={m} active={marca === m} onClick={() => setMarca(m)} subtle>
              {m}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Rejilla */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((r) => (
          <Card key={r.id} className="p-5 flex flex-col gap-3 border-border hover:border-ink/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {r.marca} · {GAMA_LABEL[r.gama]}
                </p>
                <h3 className="font-display text-lg text-ink leading-snug mt-1">{r.nombre}</h3>
                <p className="mt-1 text-xs font-mono text-ink/70">{r.ref}</p>
              </div>
              <Package className="h-5 w-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", stockDot[r.stock])} />
              {stockLabel[r.stock]}
            </div>

            <div className="mt-auto flex items-end justify-between gap-3 pt-2">
              <div>
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 hover:bg-emerald-500/10 mb-1">
                  Precio a coste
                </Badge>
                <p className="font-display text-2xl text-ink">{eur(r.precio)}</p>
              </div>
              <Button size="sm" onClick={() => add(r.id)} className="gap-1">
                <Plus className="h-4 w-4" /> Añadir
              </Button>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <p className="col-span-full text-muted-foreground text-sm py-10 text-center">
            No hay repuestos con esos filtros.
          </p>
        )}
      </div>

      {/* Cart trigger flotante */}
      <Sheet open={openCart} onOpenChange={setOpenCart}>
        <SheetTrigger asChild>
          <Button
            className="fixed bottom-6 right-6 z-30 h-14 rounded-full shadow-lg gap-2 px-5"
            size="lg"
          >
            <ShoppingCart className="h-5 w-5" />
            <span>{totalUnits} · {eur(total)}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">Tu pedido de repuestos</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {detailed.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">Aún no has añadido repuestos.</p>
            )}
            {detailed.map((l) => (
              <div key={l.id} className="border border-border rounded-lg p-3">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{l.ref.nombre}</p>
                    <p className="text-xs font-mono text-muted-foreground">{l.ref.ref} · {l.ref.marca}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(l.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(l.id, l.qty - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm">{l.qty}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setQty(l.id, l.qty + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm font-medium text-ink">{eur(l.ref.precio * l.qty)}</p>
                </div>
              </div>
            ))}
          </div>

          <SheetFooter className="border-t border-border pt-4">
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total a coste</span>
                <span className="font-display text-2xl text-ink">{eur(total)}</span>
              </div>
              <Button className="w-full h-11 gap-2" disabled={detailed.length === 0} onClick={submit}>
                <CheckCircle2 className="h-4 w-4" />
                Solicitar pedido
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

const FilterChip = ({
  active, onClick, children, subtle,
}: { active: boolean; onClick: () => void; children: React.ReactNode; subtle?: boolean }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
      active
        ? "bg-ink text-bone border-ink"
        : subtle
        ? "bg-transparent border-border text-ink/70 hover:border-ink/40"
        : "bg-muted/50 border-border text-ink/80 hover:bg-muted",
    )}
  >
    {children}
  </button>
);

export default Repuestos;
