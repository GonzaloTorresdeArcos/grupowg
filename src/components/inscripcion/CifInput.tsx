import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { validateSpanishDoc } from "@/lib/cif-validation";

interface Props {
  value: string;
  onChange: (value: string) => void;
  /**
   * Reservado para integración futura con un proveedor real (eInforma, Axesor,
   * registro mercantil…). Se mantiene en la API por compatibilidad pero
   * actualmente NO se autocompleta nada: la razón social la introduce el
   * usuario para evitar sugerencias erróneas.
   */
  onCompanyDetected?: (name: string) => void;
  error?: string;
}

export const CifInput = ({ value, onChange, error }: Props) => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof validateSpanishDoc> | null>(null);

  useEffect(() => {
    if (!value.trim()) {
      setResult(null);
      return;
    }
    setChecking(true);
    const t = setTimeout(() => {
      setResult(validateSpanishDoc(value));
      setChecking(false);
    }, 350);
    return () => clearTimeout(t);
  }, [value]);

  const showError = error || (result && !result.valid && value.trim().length >= 8 ? result.reason : null);
  const showSuccess = result?.valid;

  return (
    <div>
      <div className="relative">
        <input
          className={cn(
            "input-base pr-10",
            showError && "border-destructive/60 focus:border-destructive",
            showSuccess && "border-teal-deep/60",
          )}
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="B12345678"
          maxLength={12}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {checking && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
          {!checking && showSuccess && <Check className="h-4 w-4 text-teal-deep" />}
          {!checking && showError && <X className="h-4 w-4 text-destructive" />}
        </div>
      </div>

      {showSuccess && result && (
        <div className="mt-2 flex items-center gap-2 text-xs text-teal-deep">
          <Check className="h-3 w-3" />
          <span>{result.type} válido</span>
        </div>
      )}

      {showError && (
        <span className="block text-xs text-destructive mt-1.5">{showError}</span>
      )}
    </div>
  );
};
