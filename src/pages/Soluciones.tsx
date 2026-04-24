import { SimplePage } from "@/components/site/SimplePage";
import { Solutions } from "@/components/home/Solutions";

const SolucionesPage = () => (
  <>
    <SimplePage
      eyebrow="Soluciones"
      title="Resolver no es una parte del proceso. Es el proceso."
      intro="Diseñamos servicio postventa de extremo a extremo: incidencia, intervención, repuesto, reporting y cierre."
    />
    <Solutions />
  </>
);
export default SolucionesPage;
