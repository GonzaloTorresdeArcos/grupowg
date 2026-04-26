/**
 * Página de debug i18n para el namespace `portal`.
 *
 * Compara recursivamente las claves de cada idioma (EN, PT, FR) contra ES
 * (referencia) y muestra:
 *   - Claves faltantes (en idioma destino pero no en ES → ❌ missing)
 *   - Claves extra (presentes en destino pero no en ES → ⚠️ extra)
 *   - Diferencias de tipo (string vs object, array length, etc.)
 *
 * Acceso: /portal-i18n-debug (no enlazada en navegación pública).
 * Pensada para QA antes del build de producción.
 */
import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGS, type AppLang } from "@/i18n";
import i18n from "@/i18n";

type Issue =
  | { kind: "missing"; path: string }
  | { kind: "extra"; path: string }
  | { kind: "type"; path: string; refType: string; gotType: string };

function typeOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function diffKeys(ref: unknown, got: unknown, path: string, out: Issue[]) {
  const rt = typeOf(ref);
  const gt = typeOf(got);
  if (rt !== gt) {
    out.push({ kind: "type", path, refType: rt, gotType: gt });
    return;
  }
  if (rt === "object" && ref && got) {
    const refObj = ref as Record<string, unknown>;
    const gotObj = got as Record<string, unknown>;
    for (const k of Object.keys(refObj)) {
      const childPath = path ? `${path}.${k}` : k;
      if (!(k in gotObj)) {
        out.push({ kind: "missing", path: childPath });
      } else {
        diffKeys(refObj[k], gotObj[k], childPath, out);
      }
    }
    for (const k of Object.keys(gotObj)) {
      if (!(k in refObj)) {
        const childPath = path ? `${path}.${k}` : k;
        out.push({ kind: "extra", path: childPath });
      }
    }
  } else if (rt === "array") {
    const refArr = ref as unknown[];
    const gotArr = got as unknown[];
    if (refArr.length !== gotArr.length) {
      out.push({
        kind: "type",
        path,
        refType: `array(${refArr.length})`,
        gotType: `array(${gotArr.length})`,
      });
    }
  }
}

const targets: AppLang[] = SUPPORTED_LANGS.filter((l) => l !== "es") as AppLang[];

export default function PortalI18nDebug() {
  const { t } = useTranslation("portal");

  const report = useMemo(() => {
    const ref = i18n.getResourceBundle("es", "portal");
    return targets.map((lang) => {
      const got = i18n.getResourceBundle(lang, "portal");
      const issues: Issue[] = [];
      diffKeys(ref, got, "", issues);
      return { lang, issues };
    });
  }, []);

  const totalIssues = report.reduce((acc, r) => acc + r.issues.length, 0);

  useEffect(() => {
    document.title = "i18n Debug · portal namespace";
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = "noindex,nofollow";
  }, []);

  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stamp = () => new Date().toISOString().replace(/[:.]/g, "-");

  const handleDownloadJson = () => {
    const payload = {
      namespace: "portal",
      reference: "es",
      generatedAt: new Date().toISOString(),
      totalIssues,
      results: report.map(({ lang, issues }) => ({
        lang,
        issueCount: issues.length,
        issues,
      })),
    };
    downloadFile(
      `i18n-portal-report-${stamp()}.json`,
      JSON.stringify(payload, null, 2),
      "application/json",
    );
  };

  const handleDownloadCsv = () => {
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = [["lang", "kind", "path", "refType", "gotType"]];
    for (const { lang, issues } of report) {
      if (issues.length === 0) {
        rows.push([lang, "ok", "", "", ""]);
        continue;
      }
      for (const i of issues) {
        rows.push([
          lang,
          i.kind,
          i.path,
          i.kind === "type" ? i.refType : "",
          i.kind === "type" ? i.gotType : "",
        ]);
      }
    }
    const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
    downloadFile(`i18n-portal-report-${stamp()}.csv`, csv, "text/csv");
  };


  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header>
          <p className="eyebrow mb-2">Debug</p>
          <h1 className="font-display text-3xl text-ink">i18n · namespace portal</h1>
          <p className="text-muted-foreground mt-2">
            Reference: <code className="font-mono">es</code> · Targets:{" "}
            {targets.map((l) => (
              <code key={l} className="font-mono mr-1">
                {l}
              </code>
            ))}
          </p>
          <p className="mt-3 text-sm">
            Sample render: <strong>{t("login.title")}</strong> · current lang{" "}
            <code className="font-mono">{i18n.language}</code>
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadJson}
              className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted transition"
            >
              ⬇ Download JSON
            </button>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted transition"
            >
              ⬇ Download CSV
            </button>
          </div>
        </header>

        <section
          className={`rounded-lg border p-4 ${
            totalIssues === 0
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-amber-500/40 bg-amber-500/5"
          }`}
        >
          <h2 className="font-medium">
            {totalIssues === 0
              ? "✅ All target languages are in sync with ES"
              : `⚠️ ${totalIssues} issue(s) found`}
          </h2>
        </section>

        {report.map(({ lang, issues }) => (
          <section key={lang} className="rounded-lg border border-border p-4">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="font-display text-xl">
                <code className="font-mono">{lang}</code>
              </h3>
              <span className="text-sm text-muted-foreground">
                {issues.length === 0 ? "OK" : `${issues.length} issue(s)`}
              </span>
            </div>
            {issues.length === 0 ? (
              <p className="text-sm text-muted-foreground">No missing, extra or type-mismatched keys.</p>
            ) : (
              <ul className="space-y-1 text-sm font-mono">
                {issues.map((i, idx) => (
                  <li key={idx} className="break-all">
                    {i.kind === "missing" && <span className="text-red-500">❌ missing</span>}
                    {i.kind === "extra" && <span className="text-amber-500">⚠️ extra</span>}
                    {i.kind === "type" && (
                      <span className="text-blue-500">
                        ⇄ type ({i.refType} → {i.gotType})
                      </span>
                    )}{" "}
                    {i.path}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
