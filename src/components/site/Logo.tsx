import logo from "@/assets/logo-wg.png";

export const Logo = ({ className = "h-10" }: { className?: string }) => (
  <img src={logo} alt="Grupo Warranty Global" className={className} />
);
