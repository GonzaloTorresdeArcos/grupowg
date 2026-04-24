import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Phone, User, Wrench, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PROVINCIAS } from "@/lib/spain-provinces";
import { familiaLabel, marcaLabel, STATUS_LABELS, URGENCY_OPTIONS } from "@/lib/catalogos";
import { useUserRole } from "@/hooks/useUserRole";
import { CandidateCard, type MatchCandidate } from "@/components/portal/CandidateCard";

type Incidence = {
  id: string;
  ref: string;
  customer_name: string;
  customer_phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province_code: string;
  product_family: string;
  brand: string | null;
  urgency: string;
  status: string;
  description: string | null;
  assigned_application_id: string | null;
  appointment_id: string | null;
  created_at: string;
};

const IncidenciaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [incidence, setIncidence] = useState<Incidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [matching, setMatching] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("wg_incidences")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) toast.error(error.message);
    setIncidence(data as Incidence | null);
    setLoading(false);
  };

  useEffect(() => {
    if (!roleLoading && isAdmin) load();
  }, [id, roleLoading, isAdmin]);

  const runMatch = async () => {
    if (!incidence) return;
    setMatching(true);
    const { data, error } = await supabase.functions.invoke("match-collaborators", {
      body: {
        province_code: incidence.province_code,
        product_family: incidence.product_family,
        brand: incidence.brand,
        limit: 5,
      },
    });
    setMatching(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCandidates(data?.candidates ?? []);
    if (!data?.candidates?.length) {
      toast.warning("No se han encontrado candidatos con esa cobertura y familia.");
    }
  };

  // Auto-match al cargar si está abierta
  useEffect(() => {
    if (incidence && incidence.status === "open" && candidates.length === 0 && !matching) {
      runMatch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidence?.id]);

  const assign = async (applicationId: string) => {
    if (!incidence) return;
    setAssigning(applicationId);
    // Buscar profile vinculado para obtener user_id si existe
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("application_id", applicationId)
      .maybeSingle();

    const candidate = candidates.find((c) => c.application_id === applicationId);
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    scheduledAt.setHours(10, 0, 0, 0);

    let appointmentId: string | null = null;

    // Crear appointment solo si tenemos user vinculado
    if (profile?.user_id) {
      const prov = PROVINCIAS.find((p) => p.code === incidence.province_code);
      const { data: app, error: appErr } = await supabase
        .from("wg_appointments")
        .insert({
          user_id: profile.user_id,
          title: `${familiaLabel(incidence.product_family)} - ${incidence.customer_name}`,
          case_ref: incidence.ref,
          customer_name: incidence.customer_name,
          address: incidence.address,
          city: incidence.city ?? prov?.name ?? null,
          postal_code: incidence.postal_code,
          brand: incidence.brand,
          product_family: incidence.product_family,
          scheduled_at: scheduledAt.toISOString(),
          status: "scheduled",
          notes: incidence.description,
        })
        .select("id")
        .single();
      if (appErr) {
        toast.error(`Error creando cita: ${appErr.message}`);
        setAssigning(null);
        return;
      }
      appointmentId = app?.id ?? null;
    }

    const { error } = await supabase
      .from("wg_incidences")
      .update({
        assigned_application_id: applicationId,
        assigned_user_id: profile?.user_id ?? null,
        assigned_at: new Date().toISOString(),
        appointment_id: appointmentId,
        status: "assigned",
        match_snapshot: { candidates, selected: applicationId, ranked_at: new Date().toISOString() },
      })
      .eq("id", incidence.id);
    setAssigning(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      profile?.user_id
        ? `Asignado a ${candidate?.nombre_comercial ?? "colaborador"} y cita creada`
        : `Asignado a ${candidate?.nombre_comercial ?? "colaborador"} (sin usuario portal vinculado)`,
    );
    load();
  };

  if (roleLoading) return <p className="text-muted-foreground">Cargando…</p>;

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="font-display text-xl text-ink mb-2">Acceso restringido</p>
      </div>
    );
  }

  if (loading) return <p className="text-muted-foreground">Cargando incidencia…</p>;
  if (!incidence) return <p className="text-muted-foreground">No encontrada.</p>;

  const prov = PROVINCIAS.find((p) => p.code === incidence.province_code);
  const urg = URGENCY_OPTIONS.find((u) => u.code === incidence.urgency);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
        <Link to="/portal/incidencias"><ArrowLeft className="h-4 w-4" /> Volver</Link>
      </Button>

      <header className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground mb-2">{incidence.ref}</p>
            <h1 className="font-display text-2xl md:text-3xl text-ink">{incidence.customer_name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{STATUS_LABELS[incidence.status]}</Badge>
            {urg && <Badge className={urg.color} variant="outline">Urgencia {urg.label}</Badge>}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <Info icon={Wrench} label="Familia" value={familiaLabel(incidence.product_family)} />
          <Info icon={Sparkles} label="Marca" value={incidence.brand ? marcaLabel(incidence.brand) : "—"} />
          <Info icon={MapPin} label="Ubicación" value={`${prov?.name ?? incidence.province_code}${incidence.city ? ` · ${incidence.city}` : ""}`} />
          <Info icon={Phone} label="Teléfono" value={incidence.customer_phone ?? "—"} />
        </div>
        {incidence.description && (
          <div className="mt-4 p-3 bg-muted/40 rounded-lg text-sm text-ink/80">{incidence.description}</div>
        )}
      </header>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl text-ink">Candidatos sugeridos</h2>
            <p className="text-xs text-muted-foreground">
              Ordenados por cobertura, familia, marca, tier y capacidad operativa.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={runMatch} disabled={matching}>
            {matching ? "Buscando…" : "Recalcular"}
          </Button>
        </div>

        {matching && candidates.length === 0 ? (
          <p className="text-muted-foreground text-sm">Calculando ranking…</p>
        ) : candidates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No hay colaboradores aprobados que cubran esta provincia y familia.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {candidates.map((c, i) => (
              <CandidateCard
                key={c.application_id}
                candidate={c}
                rank={i + 1}
                onAssign={incidence.status === "open" ? assign : undefined}
                assigning={assigning === c.application_id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const Info = ({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-ink truncate">{value}</p>
    </div>
  </div>
);

export default IncidenciaDetail;
