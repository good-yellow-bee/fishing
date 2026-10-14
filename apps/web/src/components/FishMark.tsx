import { shadowSize, type FishSpecies } from "@stillwater/shared";

export function FishMark({ species, known = true }: { species: FishSpecies; known?: boolean }) {
  return (
    <svg className={`guide-fish${known ? "" : ` shadow-${shadowSize(species)}`}`} viewBox="0 0 80 36" aria-hidden>
      <path d={species.silhouette} fill={known ? species.color : "#161310"} stroke={known ? "none" : "#6d675c"} strokeWidth={known ? 0 : 1.2} />
    </svg>
  );
}
