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
  /** Markings on the flanks: perch bars, trout spots, a pike's pale flecks, a bass's dark stripe. */
  marks: "none" | "bars" | "spots" | "flecks" | "stripe";
};

export const PLAIN_BUILD: FishBuild = { length: 1, depth: 1, width: 1, snout: 1, dorsal: 1, barbels: 0, marks: "none" };

const BUILDS: Record<string, Partial<FishBuild>> = {
  "golden-shiner": { depth: 0.85, width: 0.75 },
  bluegill: { length: 0.82, depth: 1.35, width: 0.7, dorsal: 1.6 },
  perch: { marks: "bars", depth: 1.0, width: 0.85, dorsal: 1.45 },
  crappie: { length: 0.86, depth: 1.32, width: 0.7, dorsal: 1.6 },
  "brook-trout": { marks: "spots", length: 1.15, depth: 0.9, width: 0.85 },
  "smallmouth-bass": { marks: "bars", depth: 1.1, width: 0.95, dorsal: 1.2 },
  "rainbow-trout": { marks: "spots", length: 1.2, depth: 0.9, width: 0.85 },
  "largemouth-bass": { marks: "stripe", depth: 1.15, snout: 1.15, dorsal: 1.2 },
  "lake-whitefish": { length: 1.1, width: 0.8 },
  carp: { length: 1.05, depth: 1.25, barbels: 2 },
  pike: { marks: "flecks", length: 1.5, depth: 0.75, width: 0.8, snout: 1.5, dorsal: 0.7 },
  catfish: { length: 1.25, depth: 0.85, width: 1.05, snout: 0.9, barbels: 4 },
  walleye: { marks: "bars", length: 1.25, depth: 0.85, width: 0.85, dorsal: 1.35 },
  burbot: { length: 1.45, depth: 0.7, width: 0.85, dorsal: 0.7, barbels: 1 },
  salmon: { marks: "spots", length: 1.2, depth: 0.95, width: 0.85 },
  "tiger-muskie": { marks: "bars", length: 1.55, depth: 0.78, width: 0.85, snout: 1.5, dorsal: 0.7 },
  sturgeon: { length: 1.6, depth: 0.7, width: 0.85, snout: 1.4, dorsal: 0.8, barbels: 4 },
  "ghost-pike": { marks: "flecks", length: 1.5, depth: 0.75, width: 0.8, snout: 1.5, dorsal: 0.7 },
};

const built = new Map<string, FishBuild>();

/** The same object for a species every time, so a fish's baked shapes are only made once per species. */
export function fishBuild(speciesId: string | undefined): FishBuild {
  const own = speciesId ? BUILDS[speciesId] : undefined;
  if (!own || !speciesId) return PLAIN_BUILD;
  let build = built.get(speciesId);
  if (!build) {
    build = { ...PLAIN_BUILD, ...own };
    built.set(speciesId, build);
  }
  return build;
}

/** The main body, as ArticulatedFish draws it: an ellipsoid centred here, with these half-axes. */
const BODY_Z = 0.1;
const BODY_X = 0.42;
const BODY_Y = 0.42 * 0.78;
const BODY_LEN = 0.42 * 1.65;

/** The body's half-width and half-height at `z` along it, 0 past its ends. */
export function bodySection(z: number) {
  const u = (z - BODY_Z) / BODY_LEN;
  const k = u * u >= 1 ? 0 : Math.sqrt(1 - u * u);
  return { x: BODY_X * k, y: BODY_Y * k };
}

export type Mark = { position: [number, number, number]; scale: [number, number, number] };

/**
 * Where each marking sits on the body. Bars are thin rings just proud of the
 * body; spots and flecks are small dots on both flanks; the stripe runs along
 * the lateral line.
 */
export function markPlacements(marks: FishBuild["marks"]): Mark[] {
  if (marks === "bars") {
    return [-0.28, -0.08, 0.12, 0.32, 0.5].map((z) => {
      const at = bodySection(z);
      return { position: [0, 0, z], scale: [at.x * 1.04, at.y * 1.04, 0.075] };
    });
  }
  if (marks === "stripe") {
    return [1, -1].map((side) => ({ position: [side * BODY_X * 0.97, 0, BODY_Z], scale: [0.03, 0.045, BODY_LEN * 0.85] }));
  }
  if (marks === "spots" || marks === "flecks") {
    const out: Mark[] = [];
    const size = marks === "flecks" ? 0.03 : 0.036;
    for (let i = 0; i < 9; i += 1) {
      const z = -0.38 + (i / 8) * 0.8;
      // A seeded scatter up and down each flank, above and below the midline.
      const a = Math.sin(i * 2.7 + 0.4) * 0.9;
      const at = bodySection(z);
      for (const side of [1, -1]) {
        out.push({ position: [side * at.x * Math.cos(a) * 0.98, at.y * Math.sin(a) * 0.98, z], scale: [size, size, size * 1.3] });
      }
    }
    return out;
  }
  return [];
}
