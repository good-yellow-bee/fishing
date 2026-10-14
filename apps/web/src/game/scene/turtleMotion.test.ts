import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { AWAY_SEC, CLIMB_SEC, SLIDE_SEC, TURTLE_Y, stepTurtle, turtleEntry, turtleOut, turtlePose, turtleSeat } from "./turtleMotion";

const NO_SPLASH = { x: 0, z: 0, at: Number.NEGATIVE_INFINITY };

describe("turtle", () => {
  it("basks only on bright summer days", () => {
    expect(turtleOut("day", "clear", "summer")).toBe(true);
    expect(turtleOut("day", "partly-cloudy", "summer")).toBe(true);
    expect(turtleOut("day", "overcast", "summer")).toBe(false);
    expect(turtleOut("dusk", "clear", "summer")).toBe(false);
    expect(turtleOut("day", "clear", "spring")).toBe(false);
  });

  it("sits on a log in the water and slides in off its end", () => {
    const seat = turtleSeat();
    const entry = turtleEntry();
    expect(inLake(seat.x, seat.z)).toBe(true);
    expect(inLake(entry.x, entry.z)).toBe(true);
  });

  it("stretches its neck now and then, but holds still for reduced motion", () => {
    const necks = Array.from({ length: 40 }, (_, i) => turtlePose(i * 0.25).neck);
    expect(Math.max(...necks)).toBeGreaterThan(0.9);
    expect(Math.min(...necks)).toBeCloseTo(0.5);
    expect(turtlePose(1.2, { mode: "basking" }, true).neck).toBe(0.5);
  });

  it("slides off from a close cast, stays under, and climbs back", () => {
    const seat = turtleSeat();
    const near = { x: seat.x + 2, z: seat.z, at: 5 };
    expect(stepTurtle({ mode: "basking" }, 5.1, near)).toEqual({ mode: "under", since: 5.1 });
    expect(stepTurtle({ mode: "basking" }, 5.1, { x: 10, z: -5, at: 5 })).toEqual({ mode: "basking" });
    const under = { mode: "under" as const, since: 0 };
    expect(turtlePose(SLIDE_SEC + 5, under).hidden).toBe(true);
    expect(turtlePose(SLIDE_SEC + 0.3, under).ring).toBeGreaterThan(0);
    const back = turtlePose(SLIDE_SEC + AWAY_SEC + CLIMB_SEC, under);
    expect(back.hidden).toBe(false);
    expect(back.y).toBeCloseTo(TURTLE_Y);
    expect(stepTurtle(under, SLIDE_SEC + AWAY_SEC + CLIMB_SEC, NO_SPLASH)).toEqual({ mode: "basking" });
  });
});
