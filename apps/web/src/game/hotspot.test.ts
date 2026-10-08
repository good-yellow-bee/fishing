import { inLake, spotAt } from "@stillwater/shared";
import { describe, expect, it } from "vitest";
import { HOTSPOT_PERIOD_MS, HOTSPOT_RADIUS, hotspotAt, isHotspotCast } from "./hotspot";

describe("bubbling hotspot", () => {
  it("is stable within a period and remains over a named water bank", () => {
    const early = hotspotAt(75_000);
    const later = hotspotAt(HOTSPOT_PERIOD_MS - 1);

    expect(later).toEqual(early);
    expect(inLake(early.x, early.z)).toBe(true);
    expect(spotAt(early.x, early.z)).toBe(early.spot);
  });

  it("moves on a later period and only rewards casts inside its bank and radius", () => {
    const hotspot = hotspotAt(HOTSPOT_PERIOD_MS * 2);
    expect(hotspotAt(HOTSPOT_PERIOD_MS * 2 + HOTSPOT_PERIOD_MS)).not.toEqual(hotspot);
    expect(isHotspotCast(hotspot, hotspot.x + HOTSPOT_RADIUS, hotspot.z, hotspot.spot)).toBe(true);
    expect(isHotspotCast(hotspot, hotspot.x + HOTSPOT_RADIUS + 0.01, hotspot.z, hotspot.spot)).toBe(false);
    expect(isHotspotCast(hotspot, hotspot.x, hotspot.z, "dock")).toBe(hotspot.spot === "dock");
  });
});
