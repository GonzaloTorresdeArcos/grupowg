import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGS, LANG_LABELS, type AppLang } from "@/i18n";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  /**
   * Variante visual:
   * - "header-dark"  → para Header sobre fondo oscuro (texto bone).
   * - "header-light" → para Header sobre fondo claro (texto ink).
   * - "drawer"       → fila ancha dentro del menú móvil.
   */
  variant?: "header-dark" | "header-light" | "drawer";
  className?: string;
}

/**
 * Selector de idioma reutilizable. Cambia `i18n.language`, lo que dispara
 * persistencia en localStorage (configurada en `src/i18n/index.ts`) y la
 * sincronización del atributo `<html lang>`.
 */
export const LanguageSwitcher = ({
  variant = "header-dark",
  className,
}: LanguageSwitcherProps) => {
  const { i18n, t } = useTranslation("header");
  const current = (i18n.resolvedLanguage || i18n.language || "es").split(
    "-",
  )[0] as AppLang;
  const safeCurrent = (SUPPORTED_LANGS as readonly string[]).includes(current)
    ? current
    : ("es" as AppLang);

  const triggerClass =
    variant === "drawer"
      ? "flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border border-border bg-card text-card-foreground hover:bg-accent transition-colors"
      : variant === "header-light"
        ? "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full text-ink/70 hover:text-ink transition-colors"
        : "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full text-bone/70 hover:text-bone transition-colors";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("languageLabel")}
        className={cn(triggerClass, className)}
      >
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="uppercase tracking-wide">{safeCurrent}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {SUPPORTED_LANGS.map((lng) => {
          const active = safeCurrent === lng;
          return (
            <DropdownMenuItem
              key={lng}
              onSelect={() => {
                void i18n.changeLanguage(lng);
              }}
              className="flex items-center justify-between gap-3 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-6">
                  {lng}
                </span>
                <span className="text-sm">{LANG_LABELS[lng]}</span>
              </span>
              {active && <Check className="h-3.5 w-3.5 text-teal" aria-hidden="true" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
