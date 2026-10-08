import {
  CAST_RANGE,
  DOCK_STAND_X,
  DOCK_STAND_Z,
  LAKE_CENTER_Z,
  LAKE_RX,
  LAKE_RZ,
  inLake,
  lakeEdge,
  resolveCast,
  spotAt,
  stanceAt,
  walkableAt,
  type SpotId,
} from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import {
  BANK_BOARDS,
  BANK_POSTS,
  BANK_STAND_BOARDS,
  DROPOFF_STAND,
  DROPOFF_WALK,
  REEDS_STAND,
  REEDS_WALK,
  bankBoardOnWalk,
  onBankStand,
  onBankWalk,
} from "./bankWalk.ts";

function samples(route: readonly { x: number; z: number }[], step: number) {
  const points: { x: number; z: number }[] = [];
  for (let i = 0; i < route.length - 1; i += 1) {
    const a = route[i]!;
    const b = route[i + 1]!;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.ceil(len / step));
    for (let s = 0; s <= n; s += 1) {
      const t = s / n;
      points.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  return points;
}

/** Meters past the rendered shoreline. The ground is cut 0.15m outside that edge. */
function shoreClearance(x: number, z: number) {
  const nx = x / LAKE_RX;
  const nz = (z - LAKE_CENTER_Z) / LAKE_RZ;
  const radius = Math.hypot(nx, nz);
  const edge = lakeEdge(Math.atan2(nz, nx));
  const scale = Math.hypot((LAKE_RX * nx) / (radius || 1), (LAKE_RZ * nz) / (radius || 1));
  return (radius - edge) * scale;
}

function boardPoints(board: { x: number; z: number; halfX: number; halfZ: number; yaw: number }) {
  const c = Math.cos(board.yaw);
  const s = Math.sin(board.yaw);
  const points: { x: number; z: number }[] = [];
  for (const u of [-1, 0, 1]) {
    for (const v of [-1, 0, 1]) {
      const lx = u * board.halfX;
      const lz = v * board.halfZ;
      points.push({ x: board.x + lx * c + lz * s, z: board.z - lx * s + lz * c });
    }
  }
  return points;
}

function nearestWater(x: number, z: number, spot: SpotId) {
  let best: { x: number; z: number; d: number } | null = null;
  for (let zz = -14; zz <= 12; zz += 0.5) {
    for (let xx = -22; xx <= 22; xx += 0.5) {
      if (spotAt(xx, zz) !== spot) continue;
      const d = Math.hypot(xx - x, zz - z);
      if (d > CAST_RANGE) continue;
      if (!best || d < best.d) best = { x: xx, z: zz, d };
    }
  }
  return best;
}

function reached(fromX: number, fromZ: number, goalX: number, goalZ: number) {
  const step = 0.25;
  const seen = new Set<string>([`${fromX.toFixed(2)},${fromZ.toFixed(2)}`]);
  const queue: [number, number][] = [[fromX, fromZ]];
  const hops: [number, number][] = [
    [step, 0],
    [-step, 0],
    [0, step],
    [0, -step],
    [step, step],
    [step, -step],
    [-step, step],
    [-step, -step],
  ];
  while (queue.length > 0) {
    const [x, z] = queue.pop()!;
    if (Math.hypot(x - goalX, z - goalZ) <= step) return true;
    for (const [dx, dz] of hops) {
      const nx = Math.round((x + dx) * 100) / 100;
      const nz = Math.round((z + dz) * 100) / 100;
      const key = `${nx.toFixed(2)},${nz.toFixed(2)}`;
      if (seen.has(key) || !walkableAt(nx, nz)) continue;
      if (nx < -20 || nx > 20 || nz < 4 || nz > 20) continue;
      seen.add(key);
      queue.push([nx, nz]);
    }
  }
  return false;
}

describe("bank walks", () => {
  it("boards the open trail to the reeds and the drop-off", () => {
    for (const route of [REEDS_WALK, DROPOFF_WALK]) {
      expect(route[0]!.z).toBeGreaterThan(11.4);
      for (const point of samples(route, 0.05)) {
        expect(onBankWalk(point.x, point.z), `${point.x},${point.z}`).toBe(true);
        expect(walkableAt(point.x, point.z), `${point.x},${point.z}`).toBe(true);
        expect(inLake(point.x, point.z), `${point.x},${point.z}`).toBe(false);
      }
    }
    for (const board of BANK_BOARDS) {
      expect(bankBoardOnWalk(board), `${board.x},${board.z}`).toBe(true);
      for (const point of boardPoints(board)) {
        expect(shoreClearance(point.x, point.z), `${board.kind} ${point.x},${point.z}`).toBeGreaterThanOrEqual(0.15);
      }
    }
    expect(walkableAt(DOCK_STAND_X, DOCK_STAND_Z)).toBe(true);
    expect(walkableAt(1.15, 11.4)).toBe(true);
    expect(reached(1.15, 11.4, REEDS_STAND.x, REEDS_STAND.z)).toBe(true);
    expect(reached(1.15, 11.4, DROPOFF_STAND.x, DROPOFF_STAND.z)).toBe(true);
    expect(onBankWalk(0, 6.8)).toBe(false);
    expect(BANK_BOARDS.length).toBeGreaterThan(20);
  });

  it("stands on dry ground and casts into that bank", () => {
    const stands: { spot: SpotId; x: number; z: number; level: number }[] = [
      { spot: "reeds", x: REEDS_STAND.x, z: REEDS_STAND.z, level: 1 },
      { spot: "dropoff", x: DROPOFF_STAND.x, z: DROPOFF_STAND.z, level: 3 },
    ];
    for (const stand of stands) {
      expect(onBankStand(stand.x, stand.z), stand.spot).toBe(true);
      expect(walkableAt(stand.x, stand.z), stand.spot).toBe(true);
      expect(inLake(stand.x, stand.z), stand.spot).toBe(false);
      expect(stanceAt(stand.x, stand.z), stand.spot).toBe(stand.spot);
      const water = nearestWater(stand.x, stand.z, stand.spot);
      expect(water, stand.spot).not.toBeNull();
      expect(resolveCast(water!.x, water!.z, stand.spot, stand.level, stand.x, stand.z)).toEqual({
        ok: true,
        spot: stand.spot,
      });
    }
    expect(resolveCast(DROPOFF_STAND.x, -2, "dropoff", 1, DROPOFF_STAND.x, DROPOFF_STAND.z)).toEqual({
      ok: false,
      reason: "locked",
    });
    expect(resolveCast(DROPOFF_STAND.x, -2, "dropoff", 2, DROPOFF_STAND.x, DROPOFF_STAND.z)).toEqual({
      ok: false,
      reason: "locked",
    });
    const dropoffInland = nearestWater(DROPOFF_STAND.x, DROPOFF_STAND.z + 0.2, "dropoff");
    expect(dropoffInland).not.toBeNull();
    expect(
      resolveCast(dropoffInland!.x, dropoffInland!.z, "dropoff", 3, DROPOFF_STAND.x, DROPOFF_STAND.z + 0.2),
    ).toEqual({ ok: true, spot: "dropoff" });
    expect(BANK_STAND_BOARDS.every((board) => board.kind === "stand")).toBe(true);
    expect(onBankStand(REEDS_STAND.x, REEDS_STAND.z + 0.4)).toBe(true);
    expect(onBankStand(DROPOFF_STAND.x, DROPOFF_STAND.z + 0.2)).toBe(true);
    for (const post of BANK_POSTS) {
      expect(onBankStand(post.x, post.z), post.spot).toBe(true);
      expect(walkableAt(post.x, post.z), post.spot).toBe(true);
      expect(inLake(post.x, post.z), post.spot).toBe(false);
      expect(stanceAt(post.x, post.z), post.spot).toBe(post.spot);
    }
  });
});
