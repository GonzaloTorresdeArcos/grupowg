import { lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/site/Layout";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { RouteBoundary } from "@/components/site/RouteBoundary";

// Páginas públicas (lazy → code-splitting por ruta)
import { OpsProtectedRoute } from "@/components/ops/OpsProtectedRoute";
import { OpsLayout } from "@/components/ops/OpsLayout";

// Páginas públicas (lazy → code-splitting por ruta)
const WGNetwork = lazy(() => import("./pages/WGNetwork.tsx"));
const Inscripcion = lazy(() => import("./pages/Inscripcion.tsx"));
const Contacto = lazy(() => import("./pages/Contacto.tsx"));
const Privacidad = lazy(() => import("./pages/Privacidad.tsx"));
const AvisoLegal = lazy(() => import("./pages/AvisoLegal.tsx"));
const Cookies = lazy(() => import("./pages/Cookies.tsx"));
const Accesibilidad = lazy(() => import("./pages/Accesibilidad.tsx"));
const AccesibilidadEstado = lazy(() => import("./pages/AccesibilidadEstado.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Portal (lazy)
const ServiceOS = lazy(() => import("./pages/portal/ServiceOS.tsx"));
const PortalLogin = lazy(() => import("./pages/portal/Login.tsx"));
const PortalDashboard = lazy(() => import("./pages/portal/Dashboard.tsx"));
const PortalCalendar = lazy(() => import("./pages/portal/Calendar.tsx"));
const PortalDocuments = lazy(() => import("./pages/portal/Documents.tsx"));
const PortalInvoices = lazy(() => import("./pages/portal/Invoices.tsx"));
const PortalProfile = lazy(() => import("./pages/portal/Profile.tsx"));
const PortalIncidencias = lazy(() => import("./pages/portal/Incidencias.tsx"));
const PortalLeads = lazy(() => import("./pages/portal/Leads.tsx"));
const PortalIncidenciaDetail = lazy(() => import("./pages/portal/IncidenciaDetail.tsx"));
const PortalI18nDebug = lazy(() => import("./pages/PortalI18nDebug.tsx"));
const PortalRepuestos = lazy(() => import("./pages/portal/Repuestos.tsx"));
const PortalEquipos = lazy(() => import("./pages/portal/Equipos.tsx"));
const PortalGarantias = lazy(() => import("./pages/portal/Garantias.tsx"));

// Operaciones (interno · lazy)
const OpsDashboard = lazy(() => import("./pages/ops/Dashboard.tsx"));
const OpsTecnicos = lazy(() => import("./pages/ops/Tecnicos.tsx"));
const OpsDelegaciones = lazy(() => import("./pages/ops/Delegaciones.tsx"));
const OpsSLA = lazy(() => import("./pages/ops/SLA.tsx"));
const OpsSats = lazy(() => import("./pages/ops/Sats.tsx"));
const OpsImportar = lazy(() => import("./pages/ops/Importar.tsx"));
const OpsCostes = lazy(() => import("./pages/ops/Costes.tsx"));
const OpsDispersion = lazy(() => import("./pages/ops/Dispersion.tsx"));
const OpsHub = lazy(() => import("./pages/ops/Hub.tsx"));
const OpsLogistica = lazy(() => import("./pages/ops/Logistica.tsx"));
const OpsRepuestos = lazy(() => import("./pages/ops/Repuestos.tsx"));
const OpsCalidadDatos = lazy(() => import("./pages/ops/CalidadDatos.tsx"));



import { CookieConsentProvider } from "./hooks/useCookieConsent.tsx";
import { CookieBanner, CookiePreferencesDialog } from "./components/site/CookieBanner.tsx";
import { ConsentScripts } from "./components/site/ConsentScripts.tsx";

const queryClient = new QueryClient();

const HomeRedirect = () => <Navigate to="/" replace />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CookieConsentProvider>
            <ConsentScripts />
            <Routes>
              <Route element={<Layout />}>
                {/* Home = WG Network */}
                <Route path="/" element={<WGNetwork />} />

                {/* Redirecciones de la web corporativa retirada */}
                <Route path="/wg-network" element={<HomeRedirect />} />
                <Route path="/que-hacemos" element={<HomeRedirect />} />
                <Route path="/soluciones" element={<HomeRedirect />} />
                <Route path="/marcas" element={<HomeRedirect />} />
                <Route path="/industrias" element={<HomeRedirect />} />
                <Route path="/experiencia" element={<HomeRedirect />} />
                <Route path="/50-aniversario" element={<HomeRedirect />} />
                <Route path="/grupo" element={<HomeRedirect />} />
                <Route path="/grupo/*" element={<HomeRedirect />} />
                <Route path="/modelo" element={<HomeRedirect />} />
                <Route path="/plataforma" element={<HomeRedirect />} />

                {/* Rutas activas */}
                <Route path="/wg-network/inscripcion" element={<Inscripcion />} />
                <Route path="/contacto" element={<Contacto />} />
                <Route path="/legal/privacidad" element={<Privacidad />} />
                <Route path="/legal/aviso-legal" element={<AvisoLegal />} />
                <Route path="/legal/cookies" element={<Cookies />} />
                <Route path="/legal/accesibilidad" element={<Accesibilidad />} />
                <Route path="/legal/accesibilidad/estado" element={<AccesibilidadEstado />} />
              </Route>

              {/* Debug i18n (no listado, no indexado) */}
              <Route
                path="/portal-i18n-debug"
                element={
                  <RouteBoundary>
                    <PortalI18nDebug />
                  </RouteBoundary>
                }
              />

              {/* Portal del colaborador */}
              <Route
                path="/portal/login"
                element={
                  <RouteBoundary>
                    <PortalLogin />
                  </RouteBoundary>
                }
              />
              <Route
                element={
                  <ProtectedRoute>
                    <PortalLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/portal" element={<PortalDashboard />} />
                <Route path="/portal/service-os" element={<ServiceOS />} />
                <Route path="/portal/calendario" element={<PortalCalendar />} />
                <Route path="/portal/documentos" element={<PortalDocuments />} />
                <Route path="/portal/facturacion" element={<PortalInvoices />} />
                <Route path="/portal/perfil" element={<PortalProfile />} />
                <Route path="/portal/repuestos" element={<PortalRepuestos />} />
                <Route path="/portal/equipos" element={<PortalEquipos />} />
                <Route path="/portal/garantias" element={<PortalGarantias />} />
                <Route path="/portal/incidencias" element={<PortalIncidencias />} />
                <Route path="/portal/incidencias/:id" element={<PortalIncidenciaDetail />} />
                <Route path="/portal/leads" element={<PortalLeads />} />
              </Route>

              {/* /operaciones — sección interna (solo rol management) */}
              <Route
                element={
                  <OpsProtectedRoute>
                    <OpsLayout />
                  </OpsProtectedRoute>
                }
              >
                <Route path="/operaciones" element={<OpsDashboard />} />
                <Route path="/operaciones/tecnicos" element={<OpsTecnicos />} />
                <Route path="/operaciones/delegaciones" element={<OpsDelegaciones />} />
                <Route path="/operaciones/costes" element={<OpsCostes />} />
                <Route path="/operaciones/sla" element={<OpsSLA />} />
                <Route path="/operaciones/dispersion" element={<OpsDispersion />} />
                <Route path="/operaciones/sats" element={<OpsSats />} />
                <Route path="/operaciones/importar" element={<OpsImportar />} />
                {/* Navegación V2 */}
                <Route path="/operaciones/hub" element={<OpsHub />} />
                <Route path="/operaciones/logistica" element={<OpsLogistica />} />
                <Route path="/operaciones/repuestos" element={<OpsRepuestos />} />
                <Route path="/operaciones/calidad-datos" element={<OpsCalidadDatos />} />
              </Route>



              <Route element={<Layout />}>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            <CookieBanner />
            <CookiePreferencesDialog />
          </CookieConsentProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
