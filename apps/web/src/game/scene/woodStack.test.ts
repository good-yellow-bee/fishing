import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { FIRE_AT } from "./campfireSmoke";
import { FIRESIDE_AT } from "./catNap";
import { FEEDER_AT } from "./feederVisits";
import { COVER, GRAZE } from "./hareRounds";
import { PUDDLES } from "./rainPuddles";
import { BLOCK_AT, LOG_R, WOODPILE_AT, woodpileLogs, woodpileSnowy } from "./woodStack";

describe("woodpile", () => {
  it("is stacked high by fall and burned down through the year", () => {
    expect(woodpileLogs("fall").length).toBeGreaterThan(woodpileLogs("winter").length);
    expect(woodpileLogs("winter").length).toBeGreaterThan(woodpileLogs("spring").length);
    expect(woodpileLogs("summer").length).toBeGreaterThan(0);
  });

  it("stacks each log in the hollow of the row below, none overlapping", () => {
    const logs = woodpileLogs("fall");
    for (const [i, a] of logs.entries()) {
      for (const b of logs.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(LOG_R * 2 - 1e-9);
      expect(a.y).toBeGreaterThanOrEqual(LOG_R);
    }
  });

  it("is snowed on only in winter", () => {
    expect(woodpileSnowy("winter")).toBe(true);
    expect(woodpileSnowy("fall")).toBe(false);
  });

  it("stands on dry land, clear of the fire, the cat, the feeder, the hare and the puddles", () => {
    for (const spot of [WOODPILE_AT, BLOCK_AT]) {
      expect(inLake(spot.x, spot.z)).toBe(false);
      for (const other of [FIRE_AT, FIRESIDE_AT, FEEDER_AT, COVER, ...GRAZE]) expect(Math.hypot(spot.x - other.x, spot.z - other.z)).toBeGreaterThan(0.9);
      for (const puddle of PUDDLES) expect(Math.hypot(spot.x - puddle.x, spot.z - puddle.z)).toBeGreaterThan(puddle.rx + 0.3);
    }
  });
});
