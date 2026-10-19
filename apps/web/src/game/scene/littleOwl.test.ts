import { describe, expect, it } from "vitest";
import { inLake } from "@stillwater/shared";
import { LOOK_MAX, OWL_LAMP, OWL_POST, SIT_SEC, VISIT_EVERY_SEC, VISIT_SEC, WATCH_EVERY_SEC, WATCH_FROM_SEC, WATCH_SEC, owlAt, owlLookAt, owlVisit, owlWatchLook, littleOwlOut } from "./littleOwl";
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

  it("with moths about, follows the moths round its own lantern for spells, looking back at the lantern when one goes behind it", () => {
    expect(Math.hypot(OWL_LAMP.x - OWL_POST.x, OWL_LAMP.z - OWL_POST.z)).toBeLessThan(0.3);
    const lamp = owlLookAt(OWL_LAMP.x, OWL_LAMP.z)!;
    let following = 0;
    let last: number | null = null;
    for (let sit = 0; sit < SIT_SEC; sit += 1 / 60) {
      const look = owlWatchLook(sit, 100 + sit);
      const spell = sit % WATCH_EVERY_SEC;
      expect(look !== null).toBe(spell >= WATCH_FROM_SEC && spell < WATCH_FROM_SEC + WATCH_SEC);
      if (look === null) {
        last = null;
        continue;
      }
      expect(Math.abs(look)).toBeLessThanOrEqual(LOOK_MAX);
      if (look !== lamp) following += 1;
      // Never a flip from one shoulder right round to the other.
      if (last !== null) expect(Math.abs(look - last)).toBeLessThan(LOOK_MAX * 1.5);
      last = look;
    }
    expect(following).toBeGreaterThan(60 * WATCH_SEC);
  });

  it("watches the moths only when they are out", () => {
    let differs = 0;
    for (let t = 0; t < VISIT_EVERY_SEC; t += 0.05) if (owlAt(t, false, false, true).look !== owlAt(t).look) differs += 1;
    expect(differs).toBeGreaterThan(0);
  });

  it("beats off its post at once when the angler strikes while it sits, and is back on its next visit", () => {
    let sitFrom = -1;
    for (let t = 0; t < VISIT_EVERY_SEC && sitFrom < 0; t += 0.05) if (owlAt(t).here && !owlAt(t).flying) sitFrom = t;
    const strike = sitFrom + 4;
    expect(owlAt(strike - 0.1, false, false, false, strike).flying).toBe(0);
    const off = owlAt(strike + 0.5, false, false, false, strike);
    expect(off.flying).toBe(1);
    expect(off.flap).toBe(1);
    expect(Math.hypot(off.x - OWL_POST.x, off.z - OWL_POST.z)).toBeGreaterThan(0.1);
    expect(owlAt(strike + 5, false, false, false, strike).here).toBe(false);
    expect(owlAt(sitFrom + 8, false, false, false, strike).here).toBe(false);
    expect(owlAt(sitFrom + 8).here).toBe(true);
    expect(owlAt(sitFrom + VISIT_EVERY_SEC + 1, false, false, false, strike)).toEqual(owlAt(sitFrom + VISIT_EVERY_SEC + 1));
    // A strike while it is away, or with reduced motion, changes nothing.
    expect(owlAt(sitFrom + 2, false, false, false, sitFrom - 30)).toEqual(owlAt(sitFrom + 2));
    expect(owlAt(strike + 1, false, true, false, strike)).toEqual(owlAt(strike + 1, false, true));
  });

  it("struck at while it glides in, it beats off again as it lands; struck late in its sit, it still leaves in time", () => {
    let arrive = -1;
    for (let t = 0; t < VISIT_EVERY_SEC && arrive < 0; t += 0.05) if (owlAt(t).here) arrive = t;
    let landed = -1;
    for (let t = arrive; t < VISIT_EVERY_SEC && landed < 0; t += 0.05) if (owlAt(t).here && !owlAt(t).flying) landed = t;
    const early = arrive + 0.5;
    expect(owlAt(landed + 1, false, false, false, early).flying).toBe(1);
    expect(owlAt(landed + 4, false, false, false, early).here).toBe(false);
    const late = landed + SIT_SEC - 0.2;
    expect(owlAt(late + 0.5, false, false, false, late).flap).toBe(1);
    expect(owlAt(late + 4, false, false, false, late).here).toBe(false);
    expect(owlVisit(late).index).toBe(owlVisit(landed).index);
  });

  it("sits still on its post with reduced motion, up on the snow cap in winter", () => {
    expect(owlAt(3, false, true)).toEqual(owlAt(300, false, true));
    expect(owlAt(3, true, true).y).toBeGreaterThan(owlAt(3, false, true).y);
  });
});
