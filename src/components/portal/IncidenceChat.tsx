import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  incidence_id: string;
  sender_user_id: string;
  sender_role: string;
  sender_name: string | null;
  body: string;
  created_at: string;
};

interface Props {
  incidenceId: string;
  assignedUserId: string | null;
}

export const IncidenceChat = ({ incidenceId, assignedUserId }: Props) => {
  const { user, profile } = useAuth();
  const { isAdmin } = useUserRole();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const canWrite = isAdmin || (assignedUserId && user?.id === assignedUserId);

  // Carga inicial
  useEffect(() => {
    let active = true;
    supabase
      .from("wg_incidence_messages")
      .select("*")
      .eq("incidence_id", incidenceId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          toast.error(error.message);
          return;
        }
        setMessages((data ?? []) as Message[]);
      });
    return () => {
      active = false;
    };
  }, [incidenceId]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`incidence-chat-${incidenceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wg_incidence_messages",
          filter: `incidence_id=eq.${incidenceId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const next = payload.new as Message;
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incidenceId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!user || !body.trim()) return;
    setSending(true);
    const { error } = await supabase.from("wg_incidence_messages").insert({
      incidence_id: incidenceId,
      sender_user_id: user.id,
      sender_role: isAdmin ? "admin" : "collaborator",
      sender_name: profile?.display_name ?? profile?.company_name ?? null,
      body: body.trim(),
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
        <h3 className="font-display text-lg text-ink">Chat interno</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {messages.length} {messages.length === 1 ? "mensaje" : "mensajes"}
        </span>
      </div>

      <div ref={scrollRef} className="px-5 py-4 space-y-3 max-h-96 overflow-y-auto bg-muted/20">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Aún no hay mensajes. {canWrite ? "Escribe el primero." : ""}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_user_id === user?.id;
            return (
              <div
                key={m.id}
                className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                    mine
                      ? "bg-ink text-bone rounded-br-sm"
                      : "bg-card border border-border text-ink rounded-bl-sm",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground px-1">
                  {m.sender_name ?? (m.sender_role === "admin" ? "Admin" : "Colaborador")} ·{" "}
                  {new Date(m.created_at).toLocaleString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
              </div>
            );
          })
        )}
      </div>

      {canWrite ? (
        <div className="px-5 py-3 border-t border-border flex gap-2 items-end">
          <Textarea
            placeholder="Escribe un mensaje…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            className="resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button onClick={send} disabled={sending || !body.trim()} size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="px-5 py-3 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Solo el administrador y el colaborador asignado pueden escribir.
          </p>
        </div>
      )}
    </div>
  );
};
