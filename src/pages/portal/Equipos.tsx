import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MOCK_EQUIPOS, CATEGORIA_LABEL, equipoMargen, type Equipo, type CategoriaEquipo,
} from "@/lib/negocio-mocks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { ShoppingCart, Plus, Minus, Trash2, TrendingUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const eur = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const CATS: CategoriaEquipo[] = ["lavado", "frio", "coccion", "climatizacion", "tv", "pae", "movilidad"];

type Line = { id: string; qty: number };

const Equipos = () => {
  const [cat, setCat] = useState<CategoriaEquipo | "all">("all");
  const [cart, setCart] = useState<Line[]>([]);
  const [openCart, setOpenCart] = useState(false);

  useEffect(() => { document.title = "Tienda de equipos · Portal WG"; }, []);

  const items = useMemo<Equipo[]>(
    () => (cat === "all" ? MOCK_EQUIPOS : MOCK_EQUIPOS.filter((e) => e.categoria === cat)),
    [cat],
  );

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

  const detailed = cart.map((l) => ({ ...l, ref: MOCK_EQUIPOS.find((e) => e.id === l.id)! }));
  const total = detailed.reduce((a, l) => a + l.ref.precioRed * l.qty, 0);
  const totalPVP = detailed.reduce((a, l) => a + l.ref.pvp * l.qty, 0);
  const totalUnits = cart.reduce((a, l) => a + l.qty, 0);

  const submit = () => {
    toast.success("Pedido de equipos enviado", { description: "Nuestro equipo confirmará disponibilidad." });
    setCart([]);
    setOpenCart(false);
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <p className="eyebrow mb-2">Mi negocio</p>
        <h1 className="font-display text-3xl md:text-5xl text-ink leading-[1.02] tracking-tight max-w-3xl">
          Cuando reparar no compensa, sustituye y gana margen.
        </h1>
        <p className="text-muted-foreground mt-3 text-base md:text-lg max-w-2xl">
          Producto nuevo en condiciones de red WG. Sin cuota, sin stock previo, sin sorpresas.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <FilterChip active={cat === "all"} onClick={() => setCat("all")}>Todas las categorías</FilterChip>
        {CATS.map((c) => (
          <FilterChip key={c} active={cat === c} onClick={() => setCat(c)}>
            {CATEGORIA_LABEL[c]}
          </FilterChip>
        ))}
      </div>

      {/* Rejilla */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((e) => {
          const margen = equipoMargen(e);
          return (
            <Card key={e.id} className="p-5 flex flex-col gap-3 border-border hover:border-ink/30 transition-colors">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {e.marca} · {CATEGORIA_LABEL[e.categoria]}
                </p>
                <h3 className="font-display text-lg text-ink leading-snug mt-1">{e.modelo}</h3>
              </div>

              <Badge className="w-fit bg-teal-500/10 text-teal-700 border-teal-500/20 hover:bg-teal-500/10 gap-1">
                <TrendingUp className="h-3 w-3" />
                Margen SAT ~{margen}%
              </Badge>

              <div className="mt-auto pt-2">
                <p className="text-xs text-muted-foreground">
                  PVP orientativo <span className="line-through">{eur(e.pvp)}</span>
                </p>
                <div className="flex items-end justify-between gap-3 mt-1">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Precio red WG</p>
                    <p className="font-display text-2xl text-ink">{eur(e.precioRed)}</p>
                  </div>
                  <Button size="sm" onClick={() => add(e.id)} className="gap-1">
                    <Plus className="h-4 w-4" /> Añadir
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Sheet open={openCart} onOpenChange={setOpenCart}>
        <SheetTrigger asChild>
          <Button className="fixed bottom-6 right-6 z-30 h-14 rounded-full shadow-lg gap-2 px-5" size="lg">
            <ShoppingCart className="h-5 w-5" />
            <span>{totalUnits} · {eur(total)}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">Tu pedido de equipos</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {detailed.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">Aún no has añadido equipos.</p>
            )}
            {detailed.map((l) => (
              <div key={l.id} className="border border-border rounded-lg p-3">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{l.ref.modelo}</p>
                    <p className="text-xs text-muted-foreground">{l.ref.marca} · {CATEGORIA_LABEL[l.ref.categoria]}</p>
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
                  <p className="text-sm font-medium text-ink">{eur(l.ref.precioRed * l.qty)}</p>
                </div>
              </div>
            ))}
          </div>

          <SheetFooter className="border-t border-border pt-4">
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>PVP orientativo</span>
                <span className="line-through">{eur(totalPVP)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total red WG</span>
                <span className="font-display text-2xl text-ink">{eur(total)}</span>
              </div>
              {total > 0 && (
                <p className="text-xs text-teal-700">
                  Margen potencial estimado: {eur(totalPVP - total)}
                </p>
              )}
              <Button className="w-full h-11 gap-2" disabled={detailed.length === 0} onClick={submit}>
                <CheckCircle2 className="h-4 w-4" />
                Solicitar equipos
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

const FilterChip = ({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
      active ? "bg-ink text-bone border-ink" : "bg-muted/50 border-border text-ink/80 hover:bg-muted",
    )}
  >
    {children}
  </button>
);

export default Equipos;
