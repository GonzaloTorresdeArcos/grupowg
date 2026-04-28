# Guía de diagnóstico — Pantalla blanca

Cómo identificar **en qué ruta** se produce una pantalla blanca y **qué señales** revisar
para acotar la causa en pocos minutos.

> Nota: el mensaje `Unknown message type: RESET_BLANK_CHECK` que aparece en la consola
> proviene del runtime del preview de Lovable (chequeo automático de pantallas blancas).
> Es **inofensivo** y no indica un fallo en tu app.

---

## 1. Identificar la ruta exacta

Antes de mirar nada más, anota:

1. **URL completa** que muestra la pantalla blanca (incluye `?query` y `#hash`).
   Ej.: `/soluciones#wg-01`, `/portal/incidencias/123`.
2. **Idioma activo** (ES/EN/FR/PT) — el `i18n` puede romper en un solo idioma si falta una clave.
3. **Acción que la disparó**:
   - ¿Carga directa (refrescar) o navegación interna desde un `<Link>`?
   - ¿Tras login, submit, cambio de idioma, scroll a un anchor?
4. **Dispositivo / viewport** (móvil vs escritorio) — algunos componentes usan `useIsMobile`.
5. **Sesión**: ¿logueado o anónimo? Rutas dentro de `/portal/*` requieren sesión.

---

## 2. Consola del navegador (DevTools → Console)

Abre la consola **antes** de navegar a la ruta sospechosa y filtra por nivel **Error**.

Patrones típicos y qué significan:

| Mensaje en consola | Causa probable | Dónde mirar |
|---|---|---|
| `Uncaught TypeError: Cannot read properties of undefined (reading 'X')` | Acceso a un campo de un objeto que aún no existe (datos async). | Componente del stack: añade guardas (`data?.x`) y estado de carga. |
| `Objects are not valid as a React child` | Se renderiza un objeto en JSX (ej. `t("...", { returnObjects: true })` sin mapear). | El componente que pinta esa traducción. |
| `Invariant failed: You should not use <Link> outside a <Router>` | Componente fuera del árbol de React Router. | `src/App.tsx` y los `<Routes>`. |
| `Loading chunk N failed` / `ChunkLoadError` | Despliegue antiguo cacheado tras un release. | Refresca con `Ctrl+Shift+R`. |
| `Missing translation key: ...` o textos en bruto tipo `home.hero.title` | Falta una clave en `src/i18n/locales/<lang>/*.json`. | Añadir la clave en los 4 idiomas. |
| `Hydration failed` / `Text content does not match` | No aplica (no hay SSR aquí). Si aparece, suele ser una extensión del navegador. | Probar en modo incógnito. |
| `RESET_BLANK_CHECK` (warning) | Telemetría del preview de Lovable. | Ignorar. |

> Si ves un stack trace, **el primer fichero `src/...` desde arriba** suele ser el culpable.
> Haz click en el enlace para ir a la línea exacta.

---

## 3. Pestaña Network (DevTools → Network)

Filtra por **Fetch/XHR** y por **Status: 4xx, 5xx**.

- **401 / 403** en llamadas a Supabase → usuario sin sesión o RLS bloqueando.
  Mira `src/hooks/useAuth.tsx` y las políticas de la tabla.
- **404** en un `import()` dinámico → ruta de código que ya no existe (build viejo).
- **CORS error** en una Edge Function → revisar headers en
  `supabase/functions/<nombre>/index.ts`.
- **Pending eterno** (sin respuesta) → bucle de fetch o función que nunca resuelve.

---

## 4. Acotar el componente

Si la URL renderiza algo pero **se queda en blanco a media página**:

1. Inspecciona el DOM (`Elements`) y busca el último `<section>` o `<div>` que sí se pintó.
2. El componente que **debería** ir a continuación es el que está fallando silenciosamente
   (probablemente envuelto en un `ErrorBoundary` o `Suspense`).
3. Comenta temporalmente ese componente en su página padre (`src/pages/<X>.tsx`) y
   recarga: si la pantalla deja de estar en blanco, lo has aislado.

---

## 5. Checklist rápida según el tipo de ruta

### Páginas públicas (`/`, `/soluciones`, `/plataforma`, `/grupo`, ...)
- [ ] Las claves i18n usadas existen en los 4 idiomas.
- [ ] Ningún `t("...", { returnObjects: true })` se renderiza directo (debe mapearse).
- [ ] No hay imports de archivos eliminados (`Grupo.tsx`, etc.).

### Portal (`/portal/*`)
- [ ] Hay sesión activa (mira `localStorage` → claves `sb-...-auth-token`).
- [ ] `ProtectedRoute` no está redirigiendo en bucle.
- [ ] La consulta a Supabase devuelve datos (Network → status 200 con body no vacío).

### Inscripción (`/inscripcion`)
- [ ] El `useDraft` no devuelve un objeto incompleto que rompa el formulario.
- [ ] Los catálogos (`marcas`, `gamas`, `localidades`) cargan.

---

## 6. Cómo reportarlo aquí

Cuando me pidas que arregle una pantalla blanca, dame **al menos**:

1. Ruta completa (con hash y query).
2. Idioma.
3. Captura o copia del **primer error** de la consola, con el primer `src/...` del stack.
4. Si fue tras una acción concreta (click, submit), descríbela.

Con esos cuatro datos puedo ir directo al fichero culpable sin tener que adivinar.
