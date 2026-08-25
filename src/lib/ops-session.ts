import { useSyncExternalStore } from "react";

/**
 * SESSION GATE de /operaciones.
 *
 * Incidente de producción: con la sesión perdida (token caducado o expulsado
 * del almacenamiento), supabase-js seguía enviando las RPC firmadas ÚNICAMENTE
 * con la clave publishable, es decir con rol efectivo `anon`. Las funciones
 * SECURITY DEFINER respondían «permission denied for function» y las invoker
 * devolvían conjuntos vacíos por RLS: la UI mostraba ceros en lugar de un
 * estado de sesión perdida.
 *
 * La corrección es un único punto de verdad EN MEMORIA con el access_token
 * vigente, alimentado por el listener `onAuthStateChange` del AuthProvider.
 * No se llama a `getSession()` por render ni por request: no añade ni una sola
 * petición ni un `await` a la ruta crítica.
 */

let tokenActual: string | null = null;
let sesionPerdidaEn: number | null = null;
/** Memoria de pestaña: ¿ha habido alguna vez un token válido en esta sesión de navegador? */
let huboSesion = false;
const oyentes = new Set<() => void>();

const notificar = () => {
  for (const f of oyentes) f();
};

/** Lo llama el AuthProvider en cada cambio de estado de autenticación. */
export const publicarSesionOps = (accessToken: string | null | undefined) => {
  const siguiente = accessToken ?? null;
  if (siguiente === tokenActual) return;
  const teniaToken = tokenActual !== null;
  tokenActual = siguiente;
  if (siguiente) {
    // Nueva sesión válida: el gate rehabilita las queries.
    huboSesion = true;
    sesionPerdidaEn = null;
  } else if (teniaToken) {
    // Transición token → sin token: caducidad / SIGNED_OUT / refresh fallido.
    sesionPerdidaEn = Date.now();
  }
  notificar();
};

/** Marca la sesión como perdida (401 / identidad anónima detectada). */
export const marcarSesionPerdida = () => {
  if (tokenActual === null && sesionPerdidaEn !== null) return;
  if (tokenActual !== null) huboSesion = true;
  tokenActual = null;
  sesionPerdidaEn = Date.now();
  notificar();
};

export const hayTokenOps = (): boolean => tokenActual !== null;
export const tokenOps = (): string | null => tokenActual;
export const sesionOpsPerdida = (): boolean => tokenActual === null && sesionPerdidaEn !== null;
/** true si en esta pestaña llegó a existir una sesión autenticada. */
export const huboSesionOps = (): boolean => huboSesion;

/** Solo para tests: restablece el estado del gate. */
export const _resetSesionOps = () => {
  tokenActual = null;
  sesionPerdidaEn = null;
  huboSesion = false;
  notificar();
};


const suscribir = (cb: () => void) => {
  oyentes.add(cb);
  return () => {
    oyentes.delete(cb);
  };
};

/**
 * Hook ligero: no consulta la red, solo lee el token en memoria.
 * `useSyncExternalStore` garantiza que las queries se rehabiliten en cuanto el
 * AuthProvider publica una sesión válida.
 */
export const useOpsSession = (): { hasSession: boolean; perdida: boolean; hubo: boolean } => {
  const has = useSyncExternalStore(suscribir, hayTokenOps, () => false);
  const perdida = useSyncExternalStore(suscribir, sesionOpsPerdida, () => false);
  const hubo = useSyncExternalStore(suscribir, huboSesionOps, () => false);
  return { hasSession: has, perdida, hubo };
};


/** Error tipado: no ha habido petición de red. */
export class SessionPerdida extends Error {
  readonly esSessionPerdida = true;
  constructor(public readonly rpc: string) {
    super(`Sesión no disponible: la RPC ${rpc} no se ha enviado sin identidad de usuario.`);
    this.name = "SessionPerdida";
  }
}

export const esSessionPerdida = (e: unknown): boolean => {
  if (!e) return false;
  if (typeof e === "object" && (e as { esSessionPerdida?: boolean }).esSessionPerdida) return true;
  const msg =
    typeof e === "object" && e && "message" in e
      ? String((e as { message?: unknown }).message ?? "")
      : String(e);
  const code =
    typeof e === "object" && e && "code" in e ? String((e as { code?: unknown }).code ?? "") : "";
  const status =
    typeof e === "object" && e && "status" in e ? Number((e as { status?: unknown }).status) : 0;
  return (
    status === 401 ||
    code === "42501" ||
    /permission denied for function/i.test(msg) ||
    /jwt expired|invalid claim|missing sub claim/i.test(msg)
  );
};

/** Limpia la caché de rol de /operaciones guardada por sesión. */
export const limpiarCacheRolOps = () => {
  try {
    const claves: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith("ops:mgmt:")) claves.push(k);
    }
    for (const k of claves) sessionStorage.removeItem(k);
  } catch {
    /* almacenamiento no disponible */
  }
};
