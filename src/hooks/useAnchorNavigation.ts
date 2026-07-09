import { type MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type AnchorNavigationOptions = {
  onNavigate?: () => void;
};

export const useAnchorNavigation = (options: AnchorNavigationOptions = {}) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (to: string) => (event: MouseEvent<HTMLElement>) => {
    const hasHash = to.includes("#");

    if (!hasHash) {
      if (location.pathname === to) {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        options.onNavigate?.();
      }

      return;
    }

    event.preventDefault();

    const [rawPath, hash] = to.split("#");
    const targetPath = rawPath || "/";

    const scrollToHash = () => {
      const element = document.getElementById(hash);
      if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    options.onNavigate?.();

    if (location.pathname === targetPath) {
      scrollToHash();
    } else {
      navigate(to);
      window.setTimeout(scrollToHash, 120);
    }
  };
};