import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { LOOK_MAX, OWL_POST, SIT_SEC, VISIT_EVERY_SEC, VISIT_SEC, WATCH_EVERY_SEC, WATCH_FROM_SEC, WATCH_SEC, owlAt, owlLookAt, littleOwlOut } from "./littleOwl";
import { MOTH_LAMPS, MOTHS_PER_LANTERN, mothAt } from "./mothOrbit";
import { robinOut } from "./robinVisit";

describe("little owl on the dock post", () => {
  it("comes at night in any season, but not in the rain, so it never meets the robin", () => {
    expect(littleOwlOut("night", "clear")).toBe(true);
    expect(littleOwlOut("night", "fog")).toBe(true);
    expect(littleOwlOut("night", "rain")).toBe(false);
    expect(littleOwlOut("dusk", "clear")).toBe(false);
    for (const hour of ["dawn", "day", "dusk", "night"] as const) expect(littleOwlOut(hour, "clear") && robinOut(hour, "clear")).toBe(false);
  });

  it("sits on the front-left post for a good while each visit, and is away the rest", () => {
    let sat = 0;
    let seen = 0;
    for (let t = 0; t < VISIT_EVERY_SEC * 3; t += 0.1) {
      const pose = owlAt(t);
      if (pose.here) seen += 0.1;
      if (pose.here && !pose.flying) {
        sat += 0.1;
        expect([pose.x, pose.y, pose.z]).toEqual([OWL_POST.x, OWL_POST.y, OWL_POST.z]);
      }
    }
    expect(sat).toBeGreaterThan(SIT_SEC * 2);
    expect(seen).toBeLessThan(VISIT_SEC * 3 + 1);
  });

  it("glides in and off over the water without jumps", () => {
    let last = owlAt(0);
    for (let t = 0.02; t < VISIT_EVERY_SEC * 2; t += 0.02) {
      const pose = owlAt(t);
      if (pose.here && last.here) expect(Math.hypot(pose.x - last.x, pose.y - last.y, pose.z - last.z)).toBeLessThan(0.2);
      if (pose.here && pose.flying && Math.hypot(pose.x - OWL_POST.x, pose.z - OWL_POST.z) > 1.5) {
        expect(inLake(pose.x, pose.z)).toBe(true);
        expect(pose.y).toBeGreaterThan(0.3);
      }
      last = pose;
    }
  });

  it("swivels its head well round, bobs and blinks while it sits", () => {
    let maxLook = 0;
    let bobs = 0;
    let blinks = 0;
    for (let t = 0; t < VISIT_EVERY_SEC; t += 0.05) {
      const pose = owlAt(t);
      if (!pose.here || pose.flying) continue;
      maxLook = Math.max(maxLook, Math.abs(pose.look));
      if (pose.bob > 0.5) bobs += 1;
      if (pose.blink) blinks += 1;
    }
    expect(maxLook).toBeGreaterThan(1.2);
    expect(maxLook).toBeLessThanOrEqual(LOOK_MAX);
    expect(bobs).toBeGreaterThan(0);
    expect(blinks).toBeGreaterThan(0);
  });

  it("perches beside the first moth lantern and, with moths about, follows one round with its head for spells", () => {
    expect(Math.hypot(MOTH_LAMPS[0]!.x - OWL_POST.x, MOTH_LAMPS[0]!.z - OWL_POST.z)).toBeLessThan(0.3);
    let watched = 0;
    let differs = 0;
    for (let t = 0; t < VISIT_EVERY_SEC; t += 0.05) {
      const pose = owlAt(t, false, false, true);
      if (!pose.here || pose.flying) continue;
      if (Math.abs(pose.look - owlAt(t).look) > 1e-9) differs += 1;
      for (let i = 0; i < MOTHS_PER_LANTERN; i++) {
        const moth = mothAt(i, t);
        if (Math.abs(owlLookAt(moth.x, moth.z) - pose.look) < 1e-9) {
          watched += 1;
          break;
        }
      }
    }
    expect(watched).toBeGreaterThan(SIT_SEC / WATCH_EVERY_SEC * WATCH_SEC * 10);
    expect(differs).toBeGreaterThan(0);
    expect(WATCH_FROM_SEC + WATCH_SEC).toBeLessThanOrEqual(WATCH_EVERY_SEC);
  });

  it("sits still on its post with reduced motion, up on the snow cap in winter", () => {
    expect(owlAt(3, false, true)).toEqual(owlAt(300, false, true));
    expect(owlAt(3, true, true).y).toBeGreaterThan(owlAt(3, false, true).y);
  });
});
