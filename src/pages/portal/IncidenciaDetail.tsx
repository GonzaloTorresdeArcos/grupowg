import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  Wrench,
  AlertCircle,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PROVINCIAS } from "@/lib/spain-provinces";
import { familiaLabel, marcaLabel, STATUS_LABELS, URGENCY_OPTIONS } from "@/lib/catalogos";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { CandidateCard, type MatchCandidate } from "@/components/portal/CandidateCard";
import { IncidenceChat } from "@/components/portal/IncidenceChat";

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
  assigned_user_id: string | null;
  appointment_id: string | null;
  created_at: string;
};

const IncidenciaDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [incidence, setIncidence] = useState<Incidence | null>(null);
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [matching, setMatching] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [smsBusy, setSmsBusy] = useState(false);

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
    if (!roleLoading) load();
  }, [id, roleLoading]);

  const canView =
    isAdmin || (incidence?.assigned_user_id && incidence.assigned_user_id === user?.id);

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

  // Auto-match al cargar si está abierta y soy admin
  useEffect(() => {
    if (
      isAdmin &&
      incidence &&
      incidence.status === "open" &&
      candidates.length === 0 &&
      !matching
    ) {
      runMatch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidence?.id, isAdmin]);

  const sendSmsToCustomer = async (kind: "assigned" | "reminder") => {
    if (!incidence?.customer_phone) {
      toast.warning("Sin teléfono del cliente");
      return;
    }
    setSmsBusy(true);
    const message =
      kind === "assigned"
        ? `WG: hemos asignado a un técnico para su aviso ${incidence.ref}. Le contactará para concretar visita.`
        : `WG: recordatorio de su aviso ${incidence.ref}. El técnico le visitará próximamente.`;
    const { error } = await supabase.functions.invoke("send-sms-mock", {
      body: {
        destination: incidence.customer_phone,
        message,
        context: kind === "assigned" ? "incidence_assigned" : "incidence_reminder",
        relatedIncidenceId: incidence.id,
      },
    });
    setSmsBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("SMS simulado registrado");
  };

  const assign = async (applicationId: string) => {
    if (!incidence) return;
    setAssigning(applicationId);

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, email, display_name")
      .eq("application_id", applicationId)
      .maybeSingle();

    const candidate = candidates.find((c) => c.application_id === applicationId);
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    scheduledAt.setHours(10, 0, 0, 0);

    let appointmentId: string | null = null;

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
        match_snapshot: {
          candidates,
          selected: applicationId,
          ranked_at: new Date().toISOString(),
        } as never,
      })
      .eq("id", incidence.id);
    setAssigning(null);
    if (error) {
      toast.error(error.message);
      return;
    }

    // Email al colaborador (si tiene cuenta) — silencioso si no hay infra de email
    if (profile?.email) {
      supabase.functions
        .invoke("send-transactional-email", {
          body: {
            templateName: "incidence-assignment",
            recipientEmail: profile.email,
            idempotencyKey: `incidence-assignment-${incidence.id}`,
            templateData: {
              name: profile.display_name ?? "Colaborador",
              ref: incidence.ref,
              customerName: incidence.customer_name,
              address: incidence.address ?? "—",
              city: incidence.city ?? "—",
              urgency: incidence.urgency,
              productFamily: familiaLabel(incidence.product_family),
            },
          },
        })
        .then(({ error: emailErr }) => {
          if (emailErr) console.warn("[email] no enviado:", emailErr.message);
        });
    }

    // SMS al cliente
    if (incidence.customer_phone) {
      supabase.functions
        .invoke("send-sms-mock", {
          body: {
            destination: incidence.customer_phone,
            message: `WG: hemos asignado a ${candidate?.nombre_comercial ?? "un técnico"} para su aviso ${incidence.ref}.`,
            context: "incidence_assigned",
            relatedIncidenceId: incidence.id,
          },
        })
        .then(({ error: smsErr }) => {
          if (smsErr) console.warn("[sms] no enviado:", smsErr.message);
        });
    }

    toast.success(
      profile?.user_id
        ? `Asignado a ${candidate?.nombre_comercial ?? "colaborador"} y cita creada`
        : `Asignado a ${candidate?.nombre_comercial ?? "colaborador"} (sin usuario portal vinculado)`,
    );
    load();
  };

  if (roleLoading || loading) return <p className="text-muted-foreground">Cargando…</p>;
  if (!incidence) return <p className="text-muted-foreground">No encontrada.</p>;

  if (!canView) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="font-display text-xl text-ink mb-2">Acceso restringido</p>
        <p className="text-sm text-muted-foreground">
          Esta incidencia no está asignada a tu cuenta.
        </p>
      </div>
    );
  }

  const prov = PROVINCIAS.find((p) => p.code === incidence.province_code);
  const urg = URGENCY_OPTIONS.find((u) => u.code === incidence.urgency);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-2 -ml-2">
        <Link to={isAdmin ? "/portal/incidencias" : "/portal"}>
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
      </Button>

      <header className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div>
            <p className="font-mono text-xs text-muted-foreground mb-2">{incidence.ref}</p>
            <h1 className="font-display text-2xl md:text-3xl text-ink">
              {incidence.customer_name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{STATUS_LABELS[incidence.status]}</Badge>
            {urg && (
              <Badge className={urg.color} variant="outline">
                Urgencia {urg.label}
              </Badge>
            )}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <Info icon={Wrench} label="Familia" value={familiaLabel(incidence.product_family)} />
          <Info
            icon={Sparkles}
            label="Marca"
            value={incidence.brand ? marcaLabel(incidence.brand) : "—"}
          />
          <Info
            icon={MapPin}
            label="Ubicación"
            value={`${prov?.name ?? incidence.province_code}${incidence.city ? ` · ${incidence.city}` : ""}`}
          />
          <Info icon={Phone} label="Teléfono" value={incidence.customer_phone ?? "—"} />
        </div>
        {incidence.description && (
          <div className="mt-4 p-3 bg-muted/40 rounded-lg text-sm text-ink/80">
            {incidence.description}
          </div>
        )}

        {isAdmin && incidence.customer_phone && incidence.status !== "open" && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => sendSmsToCustomer("reminder")}
              disabled={smsBusy}
            >
              <MessageCircle className="h-3.5 w-3.5" /> Recordar al cliente (SMS)
            </Button>
          </div>
        )}
      </header>

      {isAdmin && incidence.status === "open" && (
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
                  onAssign={assign}
                  assigning={assigning === c.application_id}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <IncidenceChat incidenceId={incidence.id} assignedUserId={incidence.assigned_user_id} />
    </div>
  );
};

const Info = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-2">
    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-ink truncate">{value}</p>
    </div>
  </div>
);

export default IncidenciaDetail;
