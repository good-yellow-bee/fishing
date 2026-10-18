import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { SNAKE_BEADS, SNAKE_CYCLE, SNAKE_ROUTE, SNAKE_SWIM, snakeBody, snakeOut } from "./snakeSwim";

describe("a grass snake swimming out from the lily pads", () => {
  it("swims on bright days in spring and summer", () => {
    expect(snakeOut("summer", "day", "clear")).toBe(true);
    expect(snakeOut("spring", "day", "overcast")).toBe(true);
    expect(snakeOut("summer", "day", "rain")).toBe(false);
    expect(snakeOut("summer", "dawn", "clear")).toBe(false);
    expect(snakeOut("summer", "night", "clear")).toBe(false);
    expect(snakeOut("fall", "day", "clear")).toBe(false);
  });

  it("swims out, then stays out of sight for the rest of its lap", () => {
    expect(snakeBody(1)).not.toBeNull();
    expect(snakeBody(SNAKE_SWIM + 1)).toBeNull();
    expect(snakeBody(SNAKE_CYCLE - 1)).toBeNull();
    const start = snakeBody(0.01)![0]!;
    const end = snakeBody(SNAKE_SWIM - 0.01)![0]!;
    expect(Math.hypot(start.x - SNAKE_ROUTE.from.x, start.z - SNAKE_ROUTE.from.z)).toBeLessThan(0.1);
    expect(Math.hypot(end.x - SNAKE_ROUTE.to.x, end.z - SNAKE_ROUTE.to.z)).toBeLessThan(0.1);
    // The next lap swims back.
    const backStart = snakeBody(SNAKE_CYCLE + 0.01)![0]!;
    expect(Math.hypot(backStart.x - SNAKE_ROUTE.to.x, backStart.z - SNAKE_ROUTE.to.z)).toBeLessThan(0.1);
  });

  it("keeps every bead on the water, the head leading high and the tail tapering", () => {
    for (let t = 0; t < SNAKE_SWIM; t += 0.7) {
      const body = snakeBody(t)!;
      expect(body).toHaveLength(SNAKE_BEADS);
      for (const bead of body) expect(inLake(bead.x, bead.z)).toBe(true);
      expect(body[0]!.lift).toBeGreaterThan(body[5]!.lift);
      expect(body[1]!.size).toBeGreaterThan(body[SNAKE_BEADS - 1]!.size);
    }
  });

  it("waves its body side to side, and holds the wave still for reduced motion", () => {
    const sway = (t: number, still = false) => {
      const body = snakeBody(t, still)!;
      return body[8]!.x - body[8]!.z;
    };
    const values = Array.from({ length: 20 }, (_, i) => sway(10 + i * 0.05));
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.05);
    const head = (t: number) => snakeBody(t, true)![6]!;
    const a = head(10);
    const b = head(10.5);
    // Still, the bead slides only along the route, never sideways.
    const along = { x: SNAKE_ROUTE.to.x - SNAKE_ROUTE.from.x, z: SNAKE_ROUTE.to.z - SNAKE_ROUTE.from.z };
    const cross = (b.x - a.x) * along.z - (b.z - a.z) * along.x;
    expect(Math.abs(cross)).toBeLessThan(1e-9);
  });
});
