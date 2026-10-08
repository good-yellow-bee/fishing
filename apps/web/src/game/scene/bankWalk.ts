import { walkableAt } from "@stillwater/shared";

/**
 * The point stand is a dry pad on the open trail. These boards leave that
 * trail and stop on the dry reeds and drop-off ground a cast can reach.
 */

export type BankBoard = {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  yaw: number;
  kind: "walk" | "stand";
};

export const REEDS_STAND = { x: -13.6, z: 10.7 };
export const DROPOFF_STAND = { x: 17.24, z: 8.36 };

/** Same plank colors as the pier. The pale pad is where you stand. */
export const BANK_WALK_PLANK = ["#e28357", "#b56845"] as const;
export const BANK_STAND_PLANK = ["#f6e2b8", "#e7c98a"] as const;
export const BANK_POST = "#4a2c1c";
export const BANK_TOP = 0.035;
export const BANK_THICK = 0.05;
export const BANK_STAND_LIFT = 0.012;

const HALF_ALONG = 0.18;

export const REEDS_WALK: readonly { x: number; z: number }[] = [
  { x: -8.2, z: 12.45 },
  { x: -11.2, z: 12.35 },
  { x: -13.15, z: 11.15 },
  { x: REEDS_STAND.x, z: REEDS_STAND.z },
];

export const DROPOFF_WALK: readonly { x: number; z: number }[] = [
  { x: 8.6, z: 12.5 },
  { x: 12.2, z: 12.35 },
  { x: 15.2, z: 11.35 },
  { x: 16.55, z: 9.35 },
  { x: DROPOFF_STAND.x, z: DROPOFF_STAND.z },
];

const REEDS_HALF = { x: 0.62, z: 0.48 };
/** Shorter toward the water so the whole pad stays on the shore and a cast still reaches deep water. */
const DROPOFF_HALF = { x: 0.36, z: 0.28 };

function boardsAlong(
  points: readonly { x: number; z: number }[],
  halfAcross: number,
  kind: BankBoard["kind"],
): BankBoard[] {
  const boards: BankBoard[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) continue;
    const yaw = Math.atan2(dx, dz);
    const steps = Math.max(1, Math.ceil(len / (HALF_ALONG * 1.35)));
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      boards.push({
        x: a.x + dx * t,
        z: a.z + dz * t,
        halfX: halfAcross,
        halfZ: HALF_ALONG,
        yaw,
        kind,
      });
    }
  }
  return boards;
}

function coverRect(cx: number, cz: number, halfX: number, halfZ: number, kind: BankBoard["kind"]): BankBoard[] {
  const halfAlong = Math.min(HALF_ALONG, halfZ);
  const span = halfZ * 2;
  if (span <= halfAlong * 2 + 1e-6) {
    return [{ x: cx, z: cz, halfX, halfZ: span / 2, yaw: 0, kind }];
  }
  const steps = Math.ceil((span - halfAlong * 2) / (halfAlong * 1.35));
  const pitch = (span - halfAlong * 2) / steps;
  return Array.from({ length: steps + 1 }, (_, i) => ({
    x: cx,
    z: cz - halfZ + halfAlong + pitch * i,
    halfX,
    halfZ: halfAlong,
    yaw: 0,
    kind,
  }));
}

export const BANK_WALK_BOARDS: readonly BankBoard[] = [
  ...boardsAlong(REEDS_WALK, 0.3, "walk"),
  ...boardsAlong(DROPOFF_WALK, 0.2, "walk"),
];

/** Inland edge of each pad, so the post is on the stand and out of the cast. */
export const BANK_POSTS: readonly { x: number; z: number; spot: "reeds" | "dropoff" }[] = [
  { x: REEDS_STAND.x, z: REEDS_STAND.z + 0.36, spot: "reeds" },
  { x: DROPOFF_STAND.x, z: DROPOFF_STAND.z + 0.2, spot: "dropoff" },
];

export const BANK_STAND_BOARDS: readonly BankBoard[] = [
  ...coverRect(REEDS_STAND.x, REEDS_STAND.z, REEDS_HALF.x, REEDS_HALF.z, "stand"),
  ...coverRect(DROPOFF_STAND.x, DROPOFF_STAND.z, DROPOFF_HALF.x, DROPOFF_HALF.z, "stand"),
];

export const BANK_BOARDS: readonly BankBoard[] = [...BANK_WALK_BOARDS, ...BANK_STAND_BOARDS];

export function onBankBoard(board: BankBoard, x: number, z: number) {
  const dx = x - board.x;
  const dz = z - board.z;
  const c = Math.cos(board.yaw);
  const s = Math.sin(board.yaw);
  const lx = c * dx - s * dz;
  const lz = s * dx + c * dz;
  return Math.abs(lx) <= board.halfX + 1e-6 && Math.abs(lz) <= board.halfZ + 1e-6;
}

export function onBankWalk(x: number, z: number) {
  return BANK_WALK_BOARDS.some((board) => onBankBoard(board, x, z));
}

export function onBankStand(x: number, z: number) {
  return BANK_STAND_BOARDS.some((board) => onBankBoard(board, x, z));
}

/** Board samples stay on ground the angler can walk. */
export function bankBoardOnWalk(board: BankBoard) {
  const c = Math.cos(board.yaw);
  const s = Math.sin(board.yaw);
  for (const u of [-1, 0, 1]) {
    for (const v of [-1, 0, 1]) {
      const lx = u * board.halfX;
      const lz = v * board.halfZ;
      const x = board.x + lx * c + lz * s;
      const z = board.z - lx * s + lz * c;
      if (!walkableAt(x, z)) return false;
    }
  }
  return true;
}
