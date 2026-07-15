import { Download } from "lucide-react";
import { pill } from "./about-link";

/**
 * Downloads the manifesto poster. A same-origin static asset in /public, so the
 * `download` attribute forces a save (with a friendly filename) rather than
 * navigating to the image. A plain anchor — no JS, renders in the static HTML.
 */
export function PosterLink() {
  return (
    <a
      href="/poster.png"
      download="the-prototypers-manifesto-poster.png"
      className={pill}
    >
      <Download className="h-4 w-4 text-purple-400" />
      <span>Poster</span>
    </a>
  );
}

export default PosterLink;
