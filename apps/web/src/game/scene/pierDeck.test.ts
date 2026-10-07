import { inLake, walkableAt } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { BRIDGE_DECKS, onBridgeDeck, onJoinedDeck, onPierDeck, PIER_BOARDS } from "./pierDeck.ts";

const ROUTE: readonly (readonly [number, number])[] = [
  [4.5, 14.6],
  [3.4, 13.2],
  [1.6, 11.5],
  [1.15, 11.35],
  [1.15, 10.5],
  [0.6, 10.38],
  [0.1, 10.2],
  [0, 9.4],
  [0, 8.1],
  [0, 6.8],
];

function samples(step: number) {
  const points: [number, number][] = [];
  for (let i = 0; i < ROUTE.length - 1; i += 1) {
    const [ax, az] = ROUTE[i]!;
    const [bx, bz] = ROUTE[i + 1]!;
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(len / step));
    for (let s = 0; s <= n; s += 1) {
      const t = s / n;
      points.push([ax + (bx - ax) * t, az + (bz - az) * t]);
    }
  }
  return points;
}

describe("pier deck", () => {
  it("joins the bank, the path, and the bridge into one deck", () => {
    for (const [x, z] of samples(0.01)) {
      expect(onJoinedDeck(x, z), `${x},${z}`).toBe(true);
    }
    expect(onPierDeck(0, 8.05)).toBe(true);
    expect(onBridgeDeck(0, 8.05)).toBe(true);
    expect(BRIDGE_DECKS[0]!.minZ).toBeLessThan(BRIDGE_DECKS[1]!.maxZ);
    expect(onBridgeDeck(0, 6.8)).toBe(true);
    expect(PIER_BOARDS.length).toBeGreaterThan(10);
  });

  it("keeps lake walking on the boards and the boards on the walk", () => {
    for (let x = -1; x <= 2.2; x += 0.05) {
      for (let z = 7.7; z <= 11.7; z += 0.05) {
        if (!inLake(x, z)) continue;
        const wood = onPierDeck(x, z);
        const walk = walkableAt(x, z);
        if (walk) expect(onJoinedDeck(x, z), `${x},${z}`).toBe(true);
        // Grid steps land a hair past a box edge. A real overhang into the lake still fails.
        if (wood) {
          const onWalk = [-0.012, 0, 0.012].some((dx) =>
            [-0.012, 0, 0.012].some((dz) => walkableAt(x + dx, z + dz)),
          );
          expect(onWalk, `${x},${z}`).toBe(true);
        }
      }
    }
    expect(onPierDeck(0.8, 9.2)).toBe(false);
    expect(onPierDeck(1.8, 10.4)).toBe(false);
    expect(onPierDeck(1.4, 11.2)).toBe(false);
    expect(onPierDeck(1.6, 7)).toBe(false);
    expect(walkableAt(0, 9.4)).toBe(true);
    expect(walkableAt(0.2, 10.3)).toBe(true);
    expect(walkableAt(1.15, 11.4)).toBe(true);
  });
});
