import { describe, expect, it } from "vitest";
import { DOCK_PLANKS } from "@stillwater/shared";
import { WEB_CENTER, WEB_RADIUS, WEB_SPOKES, WEB_TURNS, dewWebOut, webDew, webThreads } from "./orbWeb";

describe("dewy web", () => {
  it("shows at dawn outside winter", () => {
    expect(dewWebOut("dawn", "spring")).toBe(true);
    expect(dewWebOut("dawn", "winter")).toBe(false);
    expect(dewWebOut("day", "summer")).toBe(false);
  });

  it("hangs above the planks, inside the rail", () => {
    expect(WEB_CENTER.y - WEB_RADIUS).toBeGreaterThan(DOCK_PLANKS.top);
    expect(WEB_CENTER.x + WEB_RADIUS).toBeLessThan(DOCK_PLANKS.maxX + 0.2);
  });

  it("strings every thread and bead within the web's radius", () => {
    const threads = webThreads();
    expect(threads).toHaveLength((WEB_SPOKES + WEB_TURNS * WEB_SPOKES) * 2);
    for (const [x, y] of [...threads, ...webDew()]) expect(Math.hypot(x, y)).toBeLessThanOrEqual(WEB_RADIUS + 1e-9);
    expect(webDew()).toHaveLength(WEB_TURNS * WEB_SPOKES);
  });
});
