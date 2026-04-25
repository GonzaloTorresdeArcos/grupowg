import { useState } from "react";
import { Check, Loader2, Mail, MessageSquare, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  channel: "email" | "sms";
  destination: string;
  verified: boolean;
  onVerified: () => void;
}

export const OtpVerification = ({ channel, destination, verified, onVerified }: Props) => {
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);

  const Icon = channel === "email" ? Mail : MessageSquare;
  const label = channel === "email" ? "email" : "móvil";

  const sendCode = async () => {
    if (!destination) {
      toast.error(`Introduce primero tu ${label}`);
      return;
    }
    console.info("[OTP][send] start", { channel, destination });
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { action: "send", channel, destination },
      });
      console.info("[OTP][send] response", { data, error });
      if (error) throw error;
      setSent(true);
      if (data?.demo_code) setDemoCode(data.demo_code);
      toast.success(channel === "email" ? "Código enviado al email" : "Código (modo demo) generado");
    } catch (e: any) {
      console.error("[OTP][send] error", {
        channel,
        destination,
        message: e?.message,
        name: e?.name,
        stack: e?.stack,
        raw: e,
      });
      toast.error("No hemos podido enviar el código");
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    if (code.length !== 6) {
      toast.error("El código debe tener 6 dígitos");
      return;
    }
    console.info("[OTP][verify] start", { channel, destination, codeLen: code.length });
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { action: "verify", channel, destination, code },
      });
      console.info("[OTP][verify] response", { data, error });
      if (error) throw error;
      if (data?.ok) {
        toast.success(`${channel === "email" ? "Email" : "Teléfono"} verificado`);
        try {
          console.info("[OTP][verify] calling onVerified", { hasCallback: typeof onVerified });
          onVerified();
          console.info("[OTP][verify] onVerified finished OK");
        } catch (cbErr: any) {
          console.error("[OTP][verify] onVerified threw", {
            message: cbErr?.message,
            name: cbErr?.name,
            stack: cbErr?.stack,
            raw: cbErr,
          });
          throw cbErr;
        }
      } else {
        toast.error(data?.error || "Código incorrecto");
      }
    } catch (e: any) {
      console.error("[OTP][verify] error", {
        channel,
        destination,
        message: e?.message,
        name: e?.name,
        stack: e?.stack,
        raw: e,
      });
      toast.error("Error al verificar el código");
    } finally {
      setVerifying(false);
    }
  };

  if (verified) {
    return (
      <div className="flex items-center gap-2 text-sm text-teal-deep">
        <div className="h-6 w-6 rounded-full bg-teal flex items-center justify-center">
          <Check className="h-3.5 w-3.5 text-ink" />
        </div>
        <span className="font-medium">{channel === "email" ? "Email" : "Teléfono"} verificado</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-ink">
          <Icon className="h-4 w-4 text-teal-deep" />
          <span>Verificar {label} {destination && <span className="text-muted-foreground">· {destination}</span>}</span>
        </div>
        <button
          type="button"
          onClick={sendCode}
          disabled={sending || !destination}
          className="text-xs font-medium text-teal-deep hover:underline disabled:opacity-50 disabled:no-underline inline-flex items-center gap-1"
        >
          {sending && <Loader2 className="h-3 w-3 animate-spin" />}
          {sent ? <><RefreshCw className="h-3 w-3" /> Reenviar</> : "Enviar código"}
        </button>
      </div>

      {sent && (
        <>
          {channel === "sms" && demoCode && (
            <div className="text-xs text-muted-foreground bg-card border border-border rounded-md p-2">
              <span className="text-ink-soft">Modo demo SMS:</span>{" "}
              <span className="font-mono font-bold text-ink">{demoCode}</span>{" "}
              <span className="text-muted-foreground">(en producción se enviaría por Twilio)</span>
            </div>
          )}
          {channel === "email" && demoCode && (
            <div className="text-xs text-muted-foreground bg-card border border-border rounded-md p-2">
              <span className="text-ink-soft">Tu código:</span>{" "}
              <span className="font-mono font-bold text-ink">{demoCode}</span>{" "}
              <span className="text-muted-foreground">(simulación de envío)</span>
            </div>
          )}
          <div className="flex gap-2">
            <input
              className={cn(
                "input-base font-mono tracking-widest text-center text-lg",
              )}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
            />
            <button
              type="button"
              onClick={verify}
              disabled={verifying || code.length !== 6}
              className="btn-primary text-sm whitespace-nowrap disabled:opacity-50"
            >
              {verifying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Verificar
            </button>
          </div>
        </>
      )}
    </div>
  );
};
