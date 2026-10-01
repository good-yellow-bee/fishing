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
