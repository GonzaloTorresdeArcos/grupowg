import { useEffect } from "react";
import { HeroOS } from "@/components/home/os/HeroOS";
import { ProblemBlock } from "@/components/home/os/ProblemBlock";
import { SolutionBlock } from "@/components/home/os/SolutionBlock";
import { DifferentialBlock } from "@/components/home/os/DifferentialBlock";
import { ServiceOSBlock } from "@/components/home/os/ServiceOSBlock";
import { MetricsBlock } from "@/components/home/os/MetricsBlock";
import { LifecycleBlock } from "@/components/home/os/LifecycleBlock";
import { SolutionsBlock } from "@/components/home/os/SolutionsBlock";
import { PlatformBlock } from "@/components/home/os/PlatformBlock";
import { IntelligenceBlock } from "@/components/home/os/IntelligenceBlock";
import { IndustriesBlock } from "@/components/home/os/IndustriesBlock";
import { ExperienceBlock } from "@/components/home/os/ExperienceBlock";
import { NetworkTeaser } from "@/components/home/NetworkTeaser";
import { AboutBlock } from "@/components/home/os/AboutBlock";
import { ClosingBlock } from "@/components/home/os/ClosingBlock";

const Index = () => {
  useEffect(() => {
    document.title = "WG Service OS · Donde otros terminan, nosotros empezamos";
    const desc = "Convertimos el servicio postventa en un sistema que funciona. Bajo control. Operación, control y conocimiento técnico integrados de principio a fin.";
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute("content", desc);
  }, []);

  return (
    <>
      <HeroOS />
      <ProblemBlock />
      <SolutionBlock />
      <DifferentialBlock />
      <ServiceOSBlock />
      <MetricsBlock />
      <LifecycleBlock />
      <SolutionsBlock />
      <PlatformBlock />
      <IntelligenceBlock />
      <IndustriesBlock />
      <ExperienceBlock />
      {/* WG Network teaser — sección mantenida intacta */}
      <div className="theme-light">
        <NetworkTeaser />
      </div>
      <AboutBlock />
      <ClosingBlock />
    </>
  );
};

export default Index;
