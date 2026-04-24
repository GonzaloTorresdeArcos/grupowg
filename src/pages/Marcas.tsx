import { SimplePage } from "@/components/site/SimplePage";
import { Brands } from "@/components/home/Brands";

const MarcasPage = () => (
  <>
    <SimplePage
      eyebrow="Marcas"
      title="Las marcas que confían en nosotros."
      intro="Distribuidores, fabricantes, ecommerce, operadores de movilidad y aseguradoras. La confianza se construye respondiendo, año tras año."
    />
    <Brands />
  </>
);
export default MarcasPage;
