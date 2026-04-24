import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export const StickyMobileCTA = () => (
  <div className="lg:hidden fixed bottom-4 inset-x-4 z-40">
    <Link
      to="/wg-network/inscripcion"
      className="flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 text-sm font-medium text-bone shadow-elevated"
    >
      Únete a WG Network
      <ArrowUpRight className="h-4 w-4" />
    </Link>
  </div>
);
