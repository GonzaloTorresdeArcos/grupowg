import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/site/Layout";
import Index from "./pages/Index.tsx";
import Grupo from "./pages/Grupo.tsx";
import QueHacemos from "./pages/QueHacemos.tsx";
import Soluciones from "./pages/Soluciones.tsx";
import Marcas from "./pages/Marcas.tsx";
import WGNetwork from "./pages/WGNetwork.tsx";
import Inscripcion from "./pages/Inscripcion.tsx";
import Aniversario from "./pages/Aniversario.tsx";
import Contacto from "./pages/Contacto.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/grupo" element={<Grupo />} />
            <Route path="/que-hacemos" element={<QueHacemos />} />
            <Route path="/soluciones" element={<Soluciones />} />
            <Route path="/marcas" element={<Marcas />} />
            <Route path="/wg-network" element={<WGNetwork />} />
            <Route path="/wg-network/inscripcion" element={<Inscripcion />} />
            <Route path="/50-aniversario" element={<Aniversario />} />
            <Route path="/contacto" element={<Contacto />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
