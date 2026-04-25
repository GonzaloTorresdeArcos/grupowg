import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/site/Layout";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/portal/ProtectedRoute";
import { PortalLayout } from "@/components/portal/PortalLayout";
import Index from "./pages/Index.tsx";
import Grupo from "./pages/Grupo.tsx";
import QueHacemos from "./pages/QueHacemos.tsx";
import Soluciones from "./pages/Soluciones.tsx";
import Marcas from "./pages/Marcas.tsx";
import Modelo from "./pages/Modelo.tsx";
import Plataforma from "./pages/Plataforma.tsx";
import Industrias from "./pages/Industrias.tsx";
import Experiencia from "./pages/Experiencia.tsx";
import WGNetwork from "./pages/WGNetwork.tsx";
import Inscripcion from "./pages/Inscripcion.tsx";
import Aniversario from "./pages/Aniversario.tsx";
import Contacto from "./pages/Contacto.tsx";
import Privacidad from "./pages/Privacidad.tsx";
import AvisoLegal from "./pages/AvisoLegal.tsx";
import Cookies from "./pages/Cookies.tsx";
import Accesibilidad from "./pages/Accesibilidad.tsx";
import NotFound from "./pages/NotFound.tsx";
import PortalLogin from "./pages/portal/Login.tsx";
import PortalDashboard from "./pages/portal/Dashboard.tsx";
import PortalCalendar from "./pages/portal/Calendar.tsx";
import PortalDocuments from "./pages/portal/Documents.tsx";
import PortalInvoices from "./pages/portal/Invoices.tsx";
import PortalProfile from "./pages/portal/Profile.tsx";
import PortalIncidencias from "./pages/portal/Incidencias.tsx";
import PortalIncidenciaDetail from "./pages/portal/IncidenciaDetail.tsx";
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
                <Route path="/modelo" element={<Modelo />} />
                <Route path="/plataforma" element={<Plataforma />} />
                <Route path="/industrias" element={<Industrias />} />
                <Route path="/experiencia" element={<Experiencia />} />
                <Route path="/grupo" element={<Grupo />} />
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
              </Route>

              {/* Portal del colaborador */}
              <Route path="/portal/login" element={<PortalLogin />} />
              <Route
                element={
                  <ProtectedRoute>
                    <PortalLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/portal" element={<PortalDashboard />} />
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
