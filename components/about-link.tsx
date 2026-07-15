import Link from "next/link";
import { Sparkles } from "lucide-react";

/** Shared styling for the top-left nav pills (see the nav in app/layout.tsx). */
export const pill =
  "flex items-center gap-2 rounded-full border border-purple-500/20 " +
  "bg-purple-500/10 px-3 py-1.5 text-sm text-gray-200 backdrop-blur-sm " +
  "transition-colors hover:bg-purple-500/20 focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-purple-400";

/**
 * One of the two top-left pills. A plain link, so it renders in the static HTML
 * with no JS. Positioning lives on the wrapping nav, not here.
 */
export function AboutLink() {
  return (
    <Link href="/about" className={pill}>
      <Sparkles className="h-4 w-4 text-purple-400" />
      <span>About</span>
    </Link>
  );
}

export default AboutLink;
