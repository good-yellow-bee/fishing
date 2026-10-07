import { inLake, walkableAt } from "@stillwater/shared";

/**
 * path_wood.glb is a handful of planks with gaps, and some of those planks
 * are turned. The copies from the bank to the dock were set apart as well.
 * These boards abut along that walk. Their footprint is the pier walk boxes,
 * tucked under the bridge deck, so the angler stays on wood and off the lake.
 */

export type DeckBoard = {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  yaw: number;
};

export type DeckRect = { minX: number; maxX: number; minZ: number; maxZ: number };

/** Tops sit with the old path boards. The dock planks stay at their own height. */
export const PIER_TOP = 0.02;
export const PIER_THICK = 0.06;
/** Kenney path dirt / dirtDark. */
export const PIER_PLANK = ["#e28357", "#b56845"] as const;

/** bridge_wood.glb deck quad, before scale. Yaw π/2 swaps the axes. */
const BRIDGE_DECK_X = 0.42;
const BRIDGE_DECK_Z = 0.4;
export const BRIDGE_SCALE = 1.8;
export const BRIDGE_SPANS = [7.4, 6.25] as const;

type Box = DeckRect;

/** Walk boxes along the pier, with the dock end extended onto the bridge deck. */
const APPROACH: readonly Box[] = [
  { minX: -0.28, maxX: 0.28, minZ: 7.9, maxZ: 9.85 },
  { minX: -0.15, maxX: 0.28, minZ: 9.7, maxZ: 10.55 },
  { minX: 0.05, maxX: 1.18, minZ: 10.18, maxZ: 10.58 },
  { minX: 0.98, maxX: 1.32, minZ: 10.4, maxZ: 11.48 },
];

/** Narrow where the pier leaves the water, then a wider run on the bank. */
const BANK_NEAR: readonly { x: number; z: number }[] = [
  { x: 1.15, z: 11.35 },
  { x: 1.6, z: 11.5 },
];
const BANK_FAR: readonly { x: number; z: number }[] = [
  { x: 1.6, z: 11.5 },
  { x: 2.5, z: 12.55 },
  { x: 3.4, z: 13.2 },
  { x: 4.5, z: 14.6 },
];

const HALF_ALONG = 0.11;

function boardsInBox(box: Box): DeckBoard[] {
  const spanX = box.maxX - box.minX;
  const spanZ = box.maxZ - box.minZ;
  const alongZ = spanZ >= spanX;
  const span = alongZ ? spanZ : spanX;
  const halfCross = (alongZ ? spanX : spanZ) / 2;
  const centerCross = alongZ ? (box.minX + box.maxX) / 2 : (box.minZ + box.maxZ) / 2;
  const minAlong = alongZ ? box.minZ : box.minX;
  const halfAlong = Math.min(HALF_ALONG, span / 2);
  const at = (along: number): DeckBoard =>
    alongZ
      ? { x: centerCross, z: along, halfX: halfCross, halfZ: halfAlong, yaw: 0 }
      : { x: along, z: centerCross, halfX: halfCross, halfZ: halfAlong, yaw: Math.PI / 2 };

  if (span <= halfAlong * 2) return [at(minAlong + span / 2)];
  const steps = Math.ceil((span - halfAlong * 2) / (halfAlong * 1.5));
  const pitch = (span - halfAlong * 2) / steps;
  return Array.from({ length: steps + 1 }, (_, i) => at(minAlong + halfAlong + pitch * i));
}

function boardsAlong(points: readonly { x: number; z: number }[], halfAcross: number): DeckBoard[] {
  const boards: DeckBoard[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) continue;
    const yaw = Math.atan2(dx, dz);
    const steps = Math.max(1, Math.ceil(len / (HALF_ALONG * 1.5)));
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      boards.push({
        x: a.x + dx * t,
        z: a.z + dz * t,
        halfX: halfAcross,
        halfZ: HALF_ALONG,
        yaw,
      });
    }
  }
  return boards;
}

export function bridgeDeckRect(spanZ: number): DeckRect {
  const halfX = BRIDGE_DECK_Z * BRIDGE_SCALE;
  const halfZ = BRIDGE_DECK_X * BRIDGE_SCALE;
  return { minX: -halfX, maxX: halfX, minZ: spanZ - halfZ, maxZ: spanZ + halfZ };
}

export const BRIDGE_DECKS: readonly DeckRect[] = BRIDGE_SPANS.map((z) => bridgeDeckRect(z));

function spillsIntoLake(board: DeckBoard) {
  const c = Math.cos(board.yaw);
  const s = Math.sin(board.yaw);
  for (const u of [-1, 0, 1]) {
    for (const v of [-1, 0, 1]) {
      const lx = u * board.halfX;
      const lz = v * board.halfZ;
      const x = board.x + lx * c + lz * s;
      const z = board.z - lx * s + lz * c;
      if (inLake(x, z) && !walkableAt(x, z)) return true;
    }
  }
  return false;
}

/** Pull a bank board in until it no longer covers open water. */
function fitBank(board: DeckBoard): DeckBoard {
  let halfX = board.halfX;
  while (halfX > 0.1 && spillsIntoLake({ ...board, halfX })) halfX -= 0.02;
  return { ...board, halfX };
}

export const PIER_BOARDS: readonly DeckBoard[] = [
  ...APPROACH.flatMap(boardsInBox),
  ...boardsAlong(BANK_NEAR, 0.12).map(fitBank),
  ...boardsAlong(BANK_FAR, 0.32).map(fitBank),
];

export function onBoard(board: DeckBoard, x: number, z: number) {
  const dx = x - board.x;
  const dz = z - board.z;
  const c = Math.cos(board.yaw);
  const s = Math.sin(board.yaw);
  const lx = c * dx - s * dz;
  const lz = s * dx + c * dz;
  return Math.abs(lx) <= board.halfX + 1e-6 && Math.abs(lz) <= board.halfZ + 1e-6;
}

export function onPierDeck(x: number, z: number) {
  return PIER_BOARDS.some((board) => onBoard(board, x, z));
}

export function onBridgeDeck(x: number, z: number) {
  return BRIDGE_DECKS.some((rect) => x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ);
}

/** Approach boards plus the solid bridge spans. */
export function onJoinedDeck(x: number, z: number) {
  return onPierDeck(x, z) || onBridgeDeck(x, z);
}
