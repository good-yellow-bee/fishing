import type { LakeHour } from "./hour.ts";

export type TackleItem = {
  id: string;
  tripId: string;
  label: string;
  packed: boolean;
};

export type TackleBox = {
  items: TackleItem[];
};

export type TackleLabel =
  | { ok: true; value: string }
  | { ok: false; message: string };

export function sampleTackle(): TackleItem[] {
  const row = (id: string, tripId: string, label: string): TackleItem => ({
    id,
    tripId,
    label,
    packed: false,
  });

  return [
    row("gear-dawn-spinner", "trip-dawn", "Spinnerbait"),
    row("gear-dawn-mepps", "trip-dawn", "#5 Mepps"),
    row("gear-dawn-leader", "trip-dawn", "Steel leader"),
    row("gear-dawn-spreaders", "trip-dawn", "Jaw spreaders"),
    row("gear-dawn-pliers", "trip-dawn", "Long-nose pliers"),
    row("gear-dawn-glasses", "trip-dawn", "Polarized glasses"),

    row("gear-quarry-next-tubes", "trip-quarry-next", "Green pumpkin tubes"),
    row("gear-quarry-next-heads", "trip-quarry-next", "1/4 oz tube heads"),
    row("gear-quarry-next-leader", "trip-quarry-next", "Spare fluorocarbon leader"),
    row("gear-quarry-next-pliers", "trip-quarry-next", "Split-ring pliers"),
    row("gear-quarry-next-net", "trip-quarry-next", "Landing net"),

    row("gear-mill-rod", "trip-mill", "5-weight fly rod"),
    row("gear-mill-buggers", "trip-mill", "Woolly buggers"),
    row("gear-mill-pt", "trip-mill", "Pheasant tails"),
    row("gear-mill-tippet", "trip-mill", "5x tippet"),
    row("gear-mill-nippers", "trip-mill", "Nippers"),
    row("gear-mill-forceps", "trip-mill", "Forceps"),

    row("gear-cedar-eve-spinner", "trip-cedar-eve", "Spinnerbait"),
    row("gear-cedar-eve-leader", "trip-cedar-eve", "Wire leader"),
    row("gear-cedar-eve-spreaders", "trip-cedar-eve", "Jaw spreaders"),
    row("gear-cedar-eve-lamp", "trip-cedar-eve", "Headlamp"),

    row("gear-quarry-tubes", "trip-quarry", "Green pumpkin tubes"),
    row("gear-quarry-crank", "trip-quarry", "Crayfish crankbait"),
    row("gear-quarry-leader", "trip-quarry", "Fluorocarbon leader"),
    row("gear-quarry-pliers", "trip-quarry", "Needle-nose pliers"),

    row("gear-duck-popper", "trip-duck", "Popper"),
    row("gear-duck-crawlers", "trip-duck", "Nightcrawlers"),
    row("gear-duck-hooks", "trip-duck", "Size 8 hooks"),
    row("gear-duck-bobbers", "trip-duck", "Pencil bobbers"),
    row("gear-duck-forceps", "trip-duck", "Hemostats"),

    row("gear-oxbow-caddis", "trip-oxbow", "Elk hair caddis"),
    row("gear-oxbow-pt", "trip-oxbow", "Pheasant tails"),
    row("gear-oxbow-tippet", "trip-oxbow", "6x tippet"),
    row("gear-oxbow-floatant", "trip-oxbow", "Floatant"),
    row("gear-oxbow-nippers", "trip-oxbow", "Nippers"),
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTackleItem(value: unknown): value is TackleItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.tripId === "string" &&
    value.tripId.length > 0 &&
    typeof value.label === "string" &&
    value.label.length > 0 &&
    typeof value.packed === "boolean"
  );
}

export function isTackleBox(value: unknown): value is TackleBox {
  return isRecord(value) && Array.isArray(value.items) && value.items.every(isTackleItem);
}

export function itemsForTrip(items: TackleItem[], tripId: string): TackleItem[] {
  return items.filter((item) => item.tripId === tripId);
}

export function packedCount(items: TackleItem[]): number {
  return items.reduce((count, item) => count + (item.packed ? 1 : 0), 0);
}

/** Gear that is never tied on, singular or plural. */
const TACKLE_TOOL = /\b(pliers|nets?|(sun)?glasses|jaw spreaders?|forceps|hemostats?|nippers?|floatant|headlamps?|lamps?|rods?|reels?)\b/i;
/** Line names end with the line word ("Steel leader"); "In-line spinner" does not. */
const LINE = /\b(lines?|leaders?|tippets?)\s*$/i;

/** Anything not recognised as a tool or line counts as a lure, so lures the angler typed stay on the list. */
export function isLureLabel(label: string): boolean {
  return !TACKLE_TOOL.test(label) && !LINE.test(label);
}

/** Packed lures, or the sample's lures when none are packed. */
export function luresPacked(items: readonly TackleItem[] | null | undefined): string[] {
  const packed: string[] = [];
  for (const item of items ?? []) {
    if (item.packed && isLureLabel(item.label)) packed.push(item.label);
  }
  const labels = packed.length > 0 ? packed : sampleTackle().map((item) => item.label).filter(isLureLabel);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const label of labels) {
    if (seen.has(label)) continue;
    seen.add(label);
    unique.push(label);
  }
  return unique;
}

export function withPacked(items: TackleItem[], id: string, packed: boolean): TackleItem[] {
  return items.map((item) => (item.id === id ? { ...item, packed } : item));
}

export function withTackleItem(items: TackleItem[], item: TackleItem): TackleItem[] {
  return [...items, item];
}

export function parseTackleLabel(raw: string): TackleLabel {
  const label = raw.trim().replace(/\s+/g, " ");
  if (label.length < 2 || label.length > 60) {
    return { ok: false, message: "Name the piece in a few words." };
  }
  return { ok: true, value: label };
}

export type LureClassId = "popper" | "worm" | "bobber" | "fly" | "streamer" | "spinner" | "spoon" | "crank" | "jig" | "plain";

export type LureClass = {
  id: LureClassId;
  /** The tag shown beside the lure on the gear list. */
  label: string;
  match: RegExp;
  /** Which half of a bank's fish, by weight, the lure draws. */
  size: "small" | "large";
  /** Species the lure draws harder: x1.8 on a fish in its half; a fish from the other half bites at the 0.8 left over. */
  species?: Readonly<Record<string, number>>;
  /** How much of the species pull works at each hour; an hour left out gets none. No table means every hour. */
  hours?: Readonly<Partial<Record<LakeHour, number>>>;
};

/** First match wins, small classes first, so a label with both kinds of word reads small as it always has. */
export const LURE_CLASSES: readonly LureClass[] = [
  {
    id: "popper",
    label: "Topwater",
    match: /popper|buzzbait|\bfrogs?\b|topwater/i,
    size: "small",
    species: { "smallmouth-bass": 1.8, "largemouth-bass": 1.8, bluegill: 1.4, pike: 1.3 },
    hours: { dawn: 1, dusk: 1 },
  },
  {
    id: "worm",
    label: "Live bait",
    match: /worm|crawler|leech|minnow/i,
    size: "small",
    species: { catfish: 1.9, carp: 1.4, perch: 1.4, walleye: 1.4 },
    hours: { night: 1, dusk: 0.6, dawn: 0.4, day: 0.25 },
  },
  {
    id: "bobber",
    label: "Float rig",
    match: /bobber|\bfloats?\b|size\s*\d+/i,
    size: "small",
    species: { perch: 1.5, bluegill: 1.5, "golden-shiner": 1.4, crappie: 1.5 },
  },
  {
    id: "fly",
    label: "Fly",
    match: /pheasant|caddis|nymph|midge|hare'?s ear|\bfly\b|\bflies\b/i,
    size: "small",
    species: { "brook-trout": 1.8, "rainbow-trout": 1.8, "lake-whitefish": 1.4 },
    hours: { dawn: 1, dusk: 0.8, day: 0.5 },
  },
  {
    id: "streamer",
    label: "Streamer",
    match: /bugger|streamer|clouser|muddler/i,
    size: "large",
    species: { "rainbow-trout": 1.6, "brook-trout": 1.4, salmon: 1.4 },
  },
  {
    id: "spinner",
    label: "Spinner",
    match: /spinner|mepps|in-?line/i,
    size: "large",
    species: { pike: 1.5, "smallmouth-bass": 1.6, "largemouth-bass": 1.5 },
    hours: { dusk: 1, dawn: 0.8, day: 0.6, night: 0.3 },
  },
  {
    id: "spoon",
    label: "Spoon",
    match: /spoon|dardevle|daredevil|kastmaster/i,
    size: "large",
    species: { pike: 1.6, salmon: 1.6, "tiger-muskie": 1.3, "ghost-pike": 1.3 },
  },
  {
    id: "crank",
    label: "Crankbait",
    match: /crank|jerkbait|rapala/i,
    size: "large",
    species: { "smallmouth-bass": 1.7, pike: 1.3, "rainbow-trout": 1.3 },
  },
  {
    id: "jig",
    label: "Jig",
    match: /tube|\bjigs?\b|\bgrubs?\b/i,
    size: "large",
    species: { "smallmouth-bass": 1.8, burbot: 1.5, walleye: 1.6 },
  },
];

const PLAIN: LureClass = { id: "plain", label: "Small lure", match: /$^/, size: "small" };

/** A lure's class by its label. Every word the old size rule read as big has a class, so anything unnamed stays small. */
export function lureClass(label: string): LureClass {
  return LURE_CLASSES.find((one) => one.match.test(label)) ?? PLAIN;
}

/** How hard a lure pulls one species at this hour, on top of its plain draw: 0 means no pull. */
export function lurePull(lure: LureClass, speciesId: string, hour: LakeHour): number {
  const mul = lure.species?.[speciesId];
  if (mul === undefined || mul <= 1) return 0;
  const share = lure.hours ? (lure.hours[hour] ?? 0) : 1;
  return (mul - 1) * share;
}

/** The classes that pull a species, with the hours they work best, for the field guide. */
export function lureClassesFor(speciesId: string): { lure: LureClass; hours: LakeHour[] | null }[] {
  return LURE_CLASSES.filter((one) => (one.species?.[speciesId] ?? 0) > 1).map((lure) => ({
    lure,
    hours: lure.hours
      ? (Object.entries(lure.hours) as [LakeHour, number][]).filter(([, share]) => share >= 0.8).map(([hour]) => hour)
      : null,
  }));
}
