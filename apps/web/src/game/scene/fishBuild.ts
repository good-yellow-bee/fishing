/**
 * How each species is built, on top of the one articulated fish: long and
 * lean for pike, deep and flat for panfish, whiskered for catfish. Lengths
 * and depths multiply the base body; 1 is the old one-size fish.
 */
export type FishBuild = {
  /** Nose to tail. */
  length: number;
  /** Back to belly. */
  depth: number;
  /** Side to side. */
  width: number;
  /** How far the head reaches forward: a pike's duckbill, a bass's big mouth. */
  snout: number;
  /** Height of the fin on its back. */
  dorsal: number;
  /** Whiskers at the mouth: 0, 1 under the chin, 2 at the corners, or 4. */
  barbels: 0 | 1 | 2 | 4;
};

export const PLAIN_BUILD: FishBuild = { length: 1, depth: 1, width: 1, snout: 1, dorsal: 1, barbels: 0 };

const BUILDS: Record<string, Partial<FishBuild>> = {
  "golden-shiner": { depth: 0.85, width: 0.75 },
  bluegill: { length: 0.82, depth: 1.35, width: 0.7, dorsal: 1.6 },
  perch: { depth: 1.0, width: 0.85, dorsal: 1.45 },
  crappie: { length: 0.86, depth: 1.32, width: 0.7, dorsal: 1.6 },
  "brook-trout": { length: 1.15, depth: 0.9, width: 0.85 },
  "smallmouth-bass": { depth: 1.1, width: 0.95, dorsal: 1.2 },
  "rainbow-trout": { length: 1.2, depth: 0.9, width: 0.85 },
  "largemouth-bass": { depth: 1.15, snout: 1.15, dorsal: 1.2 },
  "lake-whitefish": { length: 1.1, width: 0.8 },
  carp: { length: 1.05, depth: 1.25, barbels: 2 },
  pike: { length: 1.5, depth: 0.75, width: 0.8, snout: 1.5, dorsal: 0.7 },
  catfish: { length: 1.25, depth: 0.85, width: 1.05, snout: 0.9, barbels: 4 },
  walleye: { length: 1.25, depth: 0.85, width: 0.85, dorsal: 1.35 },
  burbot: { length: 1.45, depth: 0.7, width: 0.85, dorsal: 0.7, barbels: 1 },
  salmon: { length: 1.2, depth: 0.95, width: 0.85 },
  "tiger-muskie": { length: 1.55, depth: 0.78, width: 0.85, snout: 1.5, dorsal: 0.7 },
  sturgeon: { length: 1.6, depth: 0.7, width: 0.85, snout: 1.4, dorsal: 0.8, barbels: 4 },
  "ghost-pike": { length: 1.5, depth: 0.75, width: 0.8, snout: 1.5, dorsal: 0.7 },
};

export function fishBuild(speciesId: string | undefined): FishBuild {
  const own = speciesId ? BUILDS[speciesId] : undefined;
  return own ? { ...PLAIN_BUILD, ...own } : PLAIN_BUILD;
}
