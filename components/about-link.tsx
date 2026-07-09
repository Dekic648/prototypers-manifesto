import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * Top-left counterpart to the sign-in menu — same pill so the two read as a
 * pair. A plain link, so it renders in the static HTML with no JS.
 */
export function AboutLink() {
  return (
    <Link
      href="/about"
      className="fixed left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-sm text-gray-200 backdrop-blur-sm transition-colors hover:bg-purple-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
    >
      <Sparkles className="h-4 w-4 text-purple-400" />
      <span>About</span>
    </Link>
  );
}

export default AboutLink;
