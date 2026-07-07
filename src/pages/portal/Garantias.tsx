import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

const Garantias = () => {
  useEffect(() => { document.title = "Garantías y seguros · Portal WG"; }, []);
  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow mb-2">Mi negocio</p>
        <h1 className="font-display text-3xl md:text-5xl text-ink leading-[1.02] tracking-tight max-w-3xl">
          Garantías y seguros para tus clientes.
        </h1>
        <p className="text-muted-foreground mt-3 text-base md:text-lg max-w-2xl">
          Coberturas extendidas, protección de aparato y seguros del hogar que puedes ofrecer con margen.
        </p>
      </div>

      <Card className="p-8 md:p-12 border-border">
        <div className="flex items-start gap-4 max-w-2xl">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center shrink-0">
            <ShieldCheck className="h-6 w-6 text-ink" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Fase 2</p>
            <h2 className="font-display text-2xl text-ink mt-1">Próximamente</h2>
            <p className="text-muted-foreground mt-2">
              Estamos cerrando acuerdos con las principales aseguradoras del sector para que puedas contratar
              garantías extendidas directamente desde el portal. Te avisaremos cuando esté disponible.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Garantias;
