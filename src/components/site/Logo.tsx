import logo from "@/assets/logo-wg.png";

export const Logo = ({ className = "h-10" }: { className?: string }) => (
  <img
    src={logo}
    alt="Grupo Warranty Global"
    width={512}
    height={512}
    fetchPriority="high"
    decoding="async"
    className={className}
    style={{ aspectRatio: "1 / 1" }}
  />
);
