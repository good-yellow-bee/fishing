import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { CAST_RANGE, DAILY_SKIES, LAKE_HOURS } from "@stillwater/shared";
import { LAKE_HOUR_LOOK, weatherLook } from "./LakeWorld.tsx";

// FishingWorld's OrbitControls: zoomed fully out and orbited lowest, looking at the angler's chest on the dock.
const CAMERA_MAX_DISTANCE = 15;
const CAMERA_MAX_POLAR = 1.38;
const CHEST_HEIGHT = 1.32;
/** View depth of a full cast's bobber from that camera, which is what three.js fog reads. */
const BOBBER_FAR = CAMERA_MAX_DISTANCE + CAST_RANGE * Math.sin(CAMERA_MAX_POLAR) + CHEST_HEIGHT * Math.cos(CAMERA_MAX_POLAR);

/** three.js linear fog blends by smoothstep between near and far. */
function fogged(depth: number, near: number, far: number) {
  const t = Math.min(1, Math.max(0, (depth - near) / (far - near)));
  return t * t * (3 - 2 * t);
}

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
    expect(BOBBER_FAR).toBeGreaterThan(26);
    for (const hour of LAKE_HOURS) {
      for (const sky of DAILY_SKIES) {
        const look = weatherLook(hour, sky);
        expect(fogged(BOBBER_FAR, look.fogNear, look.fogFar), `${hour} ${sky}`).toBeLessThan(0.5);
      }
      const fog = weatherLook(hour, "fog");
      const clear = weatherLook(hour, "clear");
      expect(fog.fogFar, hour).toBeLessThan(clear.fogFar / 2);
      expect(fog.fogNear, hour).toBeLessThan(clear.fogNear / 2);
    }
  });

  it("dulls the water, its glints, and the shadows under cloud, rain, and fog", () => {
    for (const hour of LAKE_HOURS) {
      const clear = weatherLook(hour, "clear");
      expect([clear.water, clear.waterDrop, clear.glint, clear.shadow]).toEqual([
        LAKE_HOUR_LOOK[hour].water,
        LAKE_HOUR_LOOK[hour].waterDrop,
        LAKE_HOUR_LOOK[hour].glint,
        1,
      ]);
      for (const sky of ["overcast", "rain", "fog"] as const) {
        const look = weatherLook(hour, sky);
        expect(saturation(look.water), `${hour} ${sky}`).toBeLessThan(saturation(clear.water) * 0.8);
        expect(saturation(look.waterDrop), `${hour} ${sky}`).toBeLessThan(saturation(clear.waterDrop) * 0.8);
        expect(look.glint, `${hour} ${sky}`).toBeLessThan(clear.glint / 2);
        expect(look.shadow, `${hour} ${sky}`).toBeLessThan(0.5);
      }
    }
  });

  it("sinks the clouds into a fog bank instead of brightening them", () => {
    const clear = weatherLook("day", "clear");
    const fog = weatherLook("day", "fog");
    expect(luminance(fog.clouds)).toBeLessThan(luminance(clear.clouds));
    // Clouds skip the fog, so their color alone has to blend them into it.
    for (const hour of LAKE_HOURS) {
      const own = weatherLook(hour, "clear");
      const foggy = weatherLook(hour, "fog");
      const gap = (look: typeof own) => Math.abs(luminance(look.clouds) - luminance(look.fog));
      expect(gap(foggy), hour).toBeLessThan(gap(own) * 0.3);
    }
  });

  it("dims the unlit rain with the hour's light so night rain does not glow", () => {
    for (const sky of DAILY_SKIES) expect(weatherLook("day", sky).rainLight, sky).toBe(1);
    const light = (hour: (typeof LAKE_HOURS)[number]) => weatherLook(hour, "rain").rainLight;
    expect(light("night")).toBeLessThan(0.2);
    expect(light("night")).toBeLessThan(light("dusk"));
    expect(light("dusk")).toBeLessThan(light("day"));
    expect(light("dawn")).toBeLessThan(light("day"));
  });
});
