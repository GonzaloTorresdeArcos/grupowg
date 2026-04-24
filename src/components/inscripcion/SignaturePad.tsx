import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  signerName: string;
  onSignerNameChange: (v: string) => void;
  signerDni: string;
  onSignerDniChange: (v: string) => void;
  onChange: (dataUrl: string | null) => void;
}

export const SignaturePad = ({ signerName, onSignerNameChange, signerDni, onSignerDniChange, onChange }: Props) => {
  const sigRef = useRef<SignatureCanvas>(null);
  const [hasSigned, setHasSigned] = useState(false);

  const handleEnd = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      setHasSigned(true);
      onChange(sigRef.current.toDataURL("image/png"));
    }
  };

  const clear = () => {
    sigRef.current?.clear();
    setHasSigned(false);
    onChange(null);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm font-medium text-ink mb-2">Nombre y apellidos del firmante *</span>
          <input className="input-base" value={signerName} onChange={(e) => onSignerNameChange(e.target.value)} />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-ink mb-2">DNI / NIE del firmante</span>
          <input className="input-base" value={signerDni} onChange={(e) => onSignerDniChange(e.target.value.toUpperCase())} />
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-ink">Firma manuscrita *</span>
          <button
            type="button"
            onClick={clear}
            className="text-xs text-muted-foreground hover:text-ink inline-flex items-center gap-1"
          >
            <Eraser className="h-3 w-3" /> Borrar
          </button>
        </div>
        <div className={cn(
          "rounded-xl border-2 border-dashed bg-bone overflow-hidden relative",
          hasSigned ? "border-teal-deep/60" : "border-border",
        )}>
          <SignatureCanvas
            ref={sigRef}
            penColor="hsl(220 18% 12%)"
            canvasProps={{
              className: "w-full h-44 touch-none",
            }}
            onEnd={handleEnd}
          />
          {!hasSigned && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs text-muted-foreground italic">Firma aquí con el ratón o el dedo</span>
            </div>
          )}
        </div>
        {hasSigned && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-teal-deep">
            <Check className="h-3 w-3" /> Firma capturada
          </div>
        )}
      </div>
    </div>
  );
};
