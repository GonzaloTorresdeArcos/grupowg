import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, AlertCircle, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { PROVINCIAS } from "@/lib/spain-provinces";
import { FAMILIAS, MARCAS, URGENCY_OPTIONS, STATUS_LABELS, familiaLabel } from "@/lib/catalogos";
import { useUserRole } from "@/hooks/useUserRole";

type Incidence = {
  id: string;
  ref: string;
  customer_name: string;
  city: string | null;
  province_code: string;
  product_family: string;
  brand: string | null;
  urgency: string;
  status: string;
  assigned_application_id: string | null;
  created_at: string;
};

const statusColor: Record<string, string> = {
  open: "bg-amber-100 text-amber-900 border-amber-200",
  assigned: "bg-blue-100 text-blue-900 border-blue-200",
  in_progress: "bg-indigo-100 text-indigo-900 border-indigo-200",
  closed: "bg-emerald-100 text-emerald-900 border-emerald-200",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const generateRef = () => {
  const yyyy = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INC-${yyyy}-${rand}`;
};

const Incidencias = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [items, setItems] = useState<Incidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    address: "",
    postal_code: "",
    city: "",
    province_code: "",
    product_family: "",
    brand: "",
    urgency: "normal",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("wg_incidences")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Incidence[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!roleLoading && isAdmin) load();
  }, [roleLoading, isAdmin]);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.status === filter)),
    [items, filter],
  );

  const handleCreate = async () => {
    if (!form.customer_name || !form.province_code || !form.product_family) {
      toast.error("Cliente, provincia y familia son obligatorios");
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("wg_incidences")
      .insert({
        ref: generateRef(),
        customer_name: form.customer_name,
        customer_phone: form.customer_phone || null,
        address: form.address || null,
        postal_code: form.postal_code || null,
        city: form.city || null,
        province_code: form.province_code,
        product_family: form.product_family,
        brand: form.brand || null,
        urgency: form.urgency,
        description: form.description || null,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Incidencia creada");
    setOpen(false);
    setForm({
      customer_name: "", customer_phone: "", address: "", postal_code: "", city: "",
      province_code: "", product_family: "", brand: "", urgency: "normal", description: "",
    });
    if (data) navigate(`/portal/incidencias/${data.id}`);
  };

  if (roleLoading) {
    return <p className="text-muted-foreground">Cargando…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="font-display text-xl text-ink mb-2">Acceso restringido</p>
        <p className="text-sm text-muted-foreground">
          La gestión de incidencias está reservada al equipo de operaciones.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="eyebrow mb-2">Operaciones</p>
          <h1 className="font-display text-3xl md:text-4xl text-ink">Incidencias</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registra avisos y asigna automáticamente al colaborador idóneo.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nueva incidencia</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Nueva incidencia</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Cliente *</Label>
                  <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
                </div>
                <div>
                  <Label>Código postal</Label>
                  <Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Dirección</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div>
                  <Label>Ciudad</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <Label>Provincia *</Label>
                  <Select value={form.province_code} onValueChange={(v) => setForm({ ...form, province_code: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {PROVINCIAS.map((p) => (
                        <SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Familia *</Label>
                  <Select value={form.product_family} onValueChange={(v) => setForm({ ...form, product_family: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                    <SelectContent>
                      {FAMILIAS.map((f) => (
                        <SelectItem key={f.code} value={f.code}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Marca</Label>
                  <Select value={form.brand} onValueChange={(v) => setForm({ ...form, brand: v })}>
                    <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
                    <SelectContent>
                      {MARCAS.map((m) => (
                        <SelectItem key={m.code} value={m.code}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Urgencia</Label>
                  <Select value={form.urgency} onValueChange={(v) => setForm({ ...form, urgency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {URGENCY_OPTIONS.map((u) => (
                        <SelectItem key={u.code} value={u.code}>{u.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Descripción</Label>
                  <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Creando..." : "Crear y buscar match"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["all", "open", "assigned", "in_progress", "closed", "cancelled"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "Todas" : STATUS_LABELS[s]}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando incidencias…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Search className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-ink font-medium mb-1">Sin incidencias</p>
          <p className="text-sm text-muted-foreground">Crea una nueva para probar el motor de matching.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <ul className="divide-y divide-border">
            {filtered.map((it) => {
              const prov = PROVINCIAS.find((p) => p.code === it.province_code);
              return (
                <li key={it.id}>
                  <Link
                    to={`/portal/incidencias/${it.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-mono text-xs text-muted-foreground">{it.ref}</p>
                        <Badge className={statusColor[it.status]} variant="outline">
                          {STATUS_LABELS[it.status]}
                        </Badge>
                      </div>
                      <p className="font-medium text-ink truncate">{it.customer_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {familiaLabel(it.product_family)} · {prov?.name ?? it.province_code}
                        {it.city ? ` · ${it.city}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Incidencias;
