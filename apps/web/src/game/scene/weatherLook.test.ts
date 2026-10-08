import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CAST_RANGE, DAILY_SKIES, LAKE_HOURS } from "@stillwater/shared";
import { LAKE_HOUR_LOOK, weatherLook } from "./LakeWorld.tsx";

/** The farthest bobber seen from the dock camera, which sits about 7 m behind the angler. */
const BOBBER_FAR = CAST_RANGE + 7;

function luminance(color: string) {
  const c = new THREE.Color(color);
  return c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
}

function saturation(color: string) {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(color).getHSL(hsl);
  return hsl.s;
}

describe("weather look", () => {
  it("keeps each hour's own look on a clear day", () => {
    for (const hour of LAKE_HOURS) {
      const look = weatherLook(hour, "clear");
      expect(look.sky).toEqual(LAKE_HOUR_LOOK[hour].sky);
      expect(look.fog).toBe(LAKE_HOUR_LOOK[hour].fog);
      expect(look.clouds).toBe(LAKE_HOUR_LOOK[hour].clouds);
      expect(look.sunInt).toBe(LAKE_HOUR_LOOK[hour].sunInt);
      expect(look.sunOut).toBe(true);
      expect([look.fogNear, look.fogFar]).toEqual(hour === "night" ? [28, 90] : [40, 110]);
    }
  });

  it("rains only when the sky is rain", () => {
    for (const hour of LAKE_HOURS) {
      for (const sky of DAILY_SKIES) expect(weatherLook(hour, sky).rain, `${hour} ${sky}`).toBe(sky === "rain");
    }
  });

  it("grays the day and hides the sun under cloud, rain, and fog", () => {
    const clear = weatherLook("day", "clear");
    for (const sky of ["overcast", "rain", "fog"] as const) {
      const look = weatherLook("day", sky);
      expect(look.sunOut, sky).toBe(false);
      expect(look.sunInt, sky).toBeLessThan(clear.sunInt);
      expect(saturation(look.sky[2]), sky).toBeLessThan(saturation(clear.sky[2]) / 2);
      expect(saturation(look.fog), sky).toBeLessThan(saturation(clear.fog));
    }
    expect(luminance(weatherLook("day", "rain").clouds)).toBeLessThan(luminance(weatherLook("day", "overcast").clouds));
    expect(luminance(weatherLook("day", "rain").fog)).toBeLessThan(luminance(weatherLook("day", "fog").fog));
  });

  it("tints the night palette in every weather instead of replacing it", () => {
    const own = weatherLook("night", "clear");
    for (const sky of DAILY_SKIES) {
      const night = weatherLook("night", sky);
      const pairs = [...night.sky.map((color, i) => [color, own.sky[i]!]), [night.fog, own.fog], [night.clouds, own.clouds]];
      for (const [tinted, base] of pairs) {
        expect(luminance(tinted!), `${sky} ${tinted} vs ${base}`).toBeLessThan(luminance(base!) * 1.25);
        expect(luminance(tinted!), `${sky} ${tinted} vs ${base}`).toBeGreaterThan(luminance(base!) * 0.4);
      }
      expect(luminance(night.fog), sky).toBeLessThan(luminance(weatherLook("day", sky).fog) / 4);
      expect(night.sunInt, sky).toBeLessThanOrEqual(LAKE_HOUR_LOOK.night.sunInt);
    }
  });

  it("pulls the fog in close on a foggy day but leaves the farthest bobber more than half clear", () => {
    for (const hour of LAKE_HOURS) {
      const fog = weatherLook(hour, "fog");
      const clear = weatherLook(hour, "clear");
      expect(fog.fogFar, hour).toBeLessThan(clear.fogFar / 2);
      expect(fog.fogNear, hour).toBeLessThan(clear.fogNear / 2);
      const hidden = (BOBBER_FAR - fog.fogNear) / (fog.fogFar - fog.fogNear);
      expect(hidden, hour).toBeLessThan(0.5);
    }
  });
});
