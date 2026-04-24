import { SimplePage } from "@/components/site/SimplePage";
import { Credibility } from "@/components/home/Credibility";
import { GroupStructure } from "@/components/home/GroupStructure";

const Grupo = () => (
  <>
    <SimplePage
      eyebrow="Grupo WG"
      title="50 años respondiendo donde otros no llegan."
      intro="Grupo Warranty Global integra Serseguro, Hiperservice y Asure Componentes bajo una misma cultura: oficio, proximidad y respuesta. Nacimos resolviendo y seguimos haciéndolo."
    />
    <Credibility />
    <GroupStructure />
  </>
);
export default Grupo;
