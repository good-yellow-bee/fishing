import type { LakeSeason, Sky } from "@stillwater/shared";

/**
 * What lies in the bottom of the boats tied up round the lake: snow all winter, a few fallen
 * leaves through the fall, and rainwater while it rains. Pure.
 */

export type FillKind = "snow" | "leaves" | "water";

/** What lies in a moored boat in this season and weather, or null when it is empty and dry. */
export function fillKind(season: LakeSeason, sky: Sky | undefined): FillKind | null {
  if (season === "winter") return "snow";
  if (sky === "rain") return "water";
  if (season === "fall") return "leaves";
  return null;
}

/** How far up the hull from its keel each fill reaches, as a share of the hull's height. */
const LEVEL: Record<FillKind, number> = { snow: 0.62, leaves: 0.4, water: 0.41 };
/** How much of the hull's width and length the fill covers: an ellipse inside the hull, short of its pointed ends. */
const ACROSS = 0.34;
const ALONG = 0.36;

export type HullBox = { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };

/**
 * Where the fill lies in a hull of this size (the boat's own frame, bow along z): its middle, its
 * height, and the ellipse's half-width and half-length. `across` narrows it for a model whose box
 * is wider than its hull, such as a rowboat with its oars out.
 */
export function fillLayout(kind: FillKind, box: HullBox, across = ACROSS) {
  return {
    x: (box.min.x + box.max.x) / 2,
    z: (box.min.z + box.max.z) / 2,
    y: box.min.y + (box.max.y - box.min.y) * LEVEL[kind],
    across: (box.max.x - box.min.x) * across,
    along: (box.max.z - box.min.z) * ALONG,
  };
}

function unit(n: number) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Where the fallen leaves lie, inside the unit circle (scaled to the fill's ellipse), each with its turn and which of the fall colours it is. */
export function leafSpots(count: number, seed: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = unit(seed * 31 + i * 3) * Math.PI * 2;
    const r = Math.sqrt(unit(seed * 31 + i * 3 + 1)) * 0.85;
    return { x: Math.cos(angle) * r, z: Math.sin(angle) * r, yaw: unit(seed * 31 + i * 3 + 2) * Math.PI * 2, colour: i % 3 };
  });
}
