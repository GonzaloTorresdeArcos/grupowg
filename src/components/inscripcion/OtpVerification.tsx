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
  /** When provided, the server flips the draft's verification flag for this channel
   * after a successful OTP verify. This keeps trust on the server, not the client. */
  resumeToken?: string;
}

export const OtpVerification = ({ channel, destination, verified, onVerified, resumeToken }: Props) => {
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");

  const Icon = channel === "email" ? Mail : MessageSquare;
  const label = channel === "email" ? "email" : "móvil";

  const sendCode = async () => {
    if (!destination) {
      toast.error(`Introduce primero tu ${label}`);
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { action: "send", channel, destination },
      });
      if (error) throw error;
      if (data?.error === "rate_limited") {
        toast.error("Demasiados intentos. Espera unos minutos.");
        return;
      }
      setSent(true);
      toast.success(channel === "email"
        ? "Te hemos enviado un código a tu email"
        : "Te hemos enviado un código por SMS");
    } catch (e: any) {
      console.error("[OTP][send] error", e);
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
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { action: "verify", channel, destination, code, resume_token: resumeToken },
      });
      if (error) throw error;
      if (data?.ok) {
        toast.success(`${channel === "email" ? "Email" : "Teléfono"} verificado`);
        onVerified();
      } else {
        toast.error("Código incorrecto o expirado");
      }
    } catch (e: any) {
      console.error("[OTP][verify] error", e);
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
          {/* [DEV] Aviso visible del código maestro de pruebas. Quitar en producción. */}
          <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-teal-deep/40 bg-teal/10 px-3 py-2 text-xs text-ink">
            <span>
              <span className="font-semibold text-teal-deep">Modo simulación:</span>{" "}
              usa el código <span className="font-mono font-bold tracking-widest">123456</span>
            </span>
            <button
              type="button"
              onClick={() => setCode("123456")}
              className="text-xs font-medium text-teal-deep hover:underline whitespace-nowrap"
            >
              Rellenar
            </button>
          </div>
        </>
      )}
    </div>
  );
};
