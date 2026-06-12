import { lazy, Suspense } from "react";
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
const Index = lazy(() => import("./pages/Index.tsx"));
const QueHacemos = lazy(() => import("./pages/QueHacemos.tsx"));
const Soluciones = lazy(() => import("./pages/Soluciones.tsx"));
const Marcas = lazy(() => import("./pages/Marcas.tsx"));

const ServiceOS = lazy(() => import("./pages/portal/ServiceOS.tsx"));
const Industrias = lazy(() => import("./pages/Industrias.tsx"));
const Experiencia = lazy(() => import("./pages/Experiencia.tsx"));
const WGNetwork = lazy(() => import("./pages/WGNetwork.tsx"));
const Inscripcion = lazy(() => import("./pages/Inscripcion.tsx"));
const Aniversario = lazy(() => import("./pages/Aniversario.tsx"));
const Contacto = lazy(() => import("./pages/Contacto.tsx"));
const Privacidad = lazy(() => import("./pages/Privacidad.tsx"));
const AvisoLegal = lazy(() => import("./pages/AvisoLegal.tsx"));
const Cookies = lazy(() => import("./pages/Cookies.tsx"));
const Accesibilidad = lazy(() => import("./pages/Accesibilidad.tsx"));
const AccesibilidadEstado = lazy(() => import("./pages/AccesibilidadEstado.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Portal (lazy)
const PortalLogin = lazy(() => import("./pages/portal/Login.tsx"));
const PortalDashboard = lazy(() => import("./pages/portal/Dashboard.tsx"));
const PortalCalendar = lazy(() => import("./pages/portal/Calendar.tsx"));
const PortalDocuments = lazy(() => import("./pages/portal/Documents.tsx"));
const PortalInvoices = lazy(() => import("./pages/portal/Invoices.tsx"));
const PortalProfile = lazy(() => import("./pages/portal/Profile.tsx"));
const PortalIncidencias = lazy(() => import("./pages/portal/Incidencias.tsx"));
const PortalIncidenciaDetail = lazy(() => import("./pages/portal/IncidenciaDetail.tsx"));
const PortalI18nDebug = lazy(() => import("./pages/PortalI18nDebug.tsx"));

import { CookieConsentProvider } from "./hooks/useCookieConsent.tsx";
import { CookieBanner, CookiePreferencesDialog } from "./components/site/CookieBanner.tsx";
import { ConsentScripts } from "./components/site/ConsentScripts.tsx";

const queryClient = new QueryClient();

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
                <Route path="/" element={<Index />} />
                <Route path="/grupo" element={<Navigate to="/" replace />} />
                <Route path="/grupo/*" element={<Navigate to="/" replace />} />
                <Route path="/modelo" element={<Navigate to="/soluciones" replace />} />
                <Route path="/plataforma" element={<Navigate to="/" replace />} />
                <Route path="/industrias" element={<Industrias />} />
                <Route path="/experiencia" element={<Experiencia />} />
                
                <Route path="/que-hacemos" element={<QueHacemos />} />
                <Route path="/soluciones" element={<Soluciones />} />
                <Route path="/marcas" element={<Marcas />} />
                <Route path="/wg-network" element={<WGNetwork />} />
                <Route path="/wg-network/inscripcion" element={<Inscripcion />} />
                <Route path="/50-aniversario" element={<Aniversario />} />
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
                <Route path="/portal/incidencias" element={<PortalIncidencias />} />
                <Route path="/portal/incidencias/:id" element={<PortalIncidenciaDetail />} />
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
