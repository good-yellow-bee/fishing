import { shadowSize, type FishSpecies } from "@stillwater/shared";

/** A golden fish's coat, on the card, the log row and the held-up fish. */
export const GOLDEN_COLOR = "#e2b23c";
export const GOLDEN_ACCENT = "#fff0b0";

export function FishMark({ species, known = true, golden = false }: { species: FishSpecies; known?: boolean; golden?: boolean }) {
  return (
    <svg className={`guide-fish${known ? "" : ` shadow-${shadowSize(species)}`}${golden ? " golden" : ""}`} viewBox="0 0 80 36" aria-hidden>
      <path d={species.silhouette} fill={known ? (golden ? GOLDEN_COLOR : species.color) : "#161310"} stroke={known ? "none" : "#6d675c"} strokeWidth={known ? 0 : 1.2} />
    </svg>
  );
}
