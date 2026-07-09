import logo from "@/assets/logo-wg.png";

export const Logo = ({ className = "h-10" }: { className?: string }) => (
  <img
    src={logo}
    alt="Grupo Warranty Global"
    width={1406}
    height={601}
    fetchPriority="high"
    decoding="async"
    className={`${className} w-auto`}
  />
);
