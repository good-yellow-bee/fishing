import { describe, expect, it } from "vitest";
import { FISH, spotAt, SPOT_IDS, walkableAt } from "@stillwater/shared";
import { bigFeedersOver, hasWormFeeders, PROWLERS, prowlerOver, GROUNDBAIT_CASTS, SWIM_MAX_CASTS, throwHandful, TOPUP_MAX } from "../logic";
import { BANK_STANDS } from "../hotspot";
import { cloudCenter, cloudOpacity, CLOUD_RADIUS, DIMPLES, dimpleAt, feedersShow, openWaterYaw, PERCH, PERCH_FAR, PERCH_NEAR, PERCH_REACH, perchAt, perchShow, PIKE_REACH, PROWL_IN, PROWL_LEG_SEC, PROWL_OUT, prowlAt, ROLL_GAP_SEC, ROLL_SEC, ROLL_SPAN, rollAt, SCATTER_SEC, SCATTER_WAKES, scatterWakeAt, THIEF_IN, THIEF_OUT, thiefAt, thiefCount, THIEVES } from "./groundbaitCloud";

describe("groundbait cloud", () => {
  it.each(SPOT_IDS)("lands on the %s's own open water", (spot) => {
    const at = cloudCenter(spot);
    expect(spotAt(at.x, at.z)).toBe(spot);
    expect(walkableAt(at.x, at.z)).toBe(false);
  });

  it("thins as its casts are fished out", () => {
    const fading = Array.from({ length: GROUNDBAIT_CASTS }, (_, i) => cloudOpacity(GROUNDBAIT_CASTS - i));
    expect([...fading].sort((a, b) => b - a)).toEqual(fading);
    expect(cloudOpacity(1)).toBeGreaterThan(0);
  });

  it("thickens on a swim topped up past a fresh handful, up to its most casts", () => {
    expect(cloudOpacity(GROUNDBAIT_CASTS + 2)).toBeGreaterThan(cloudOpacity(GROUNDBAIT_CASTS));
    expect(cloudOpacity(SWIM_MAX_CASTS)).toBeGreaterThan(cloudOpacity(SWIM_MAX_CASTS - 1));
    expect(cloudOpacity(SWIM_MAX_CASTS + 3)).toBe(cloudOpacity(SWIM_MAX_CASTS));
    expect(cloudOpacity(SWIM_MAX_CASTS)).toBeLessThan(0.6);
  });
});

describe("feeders dimpling over a gathered swim", () => {
  it("ring briefly and in turn, within the cloud", () => {
    let shown = 0;
    for (let t = 0; t < 60; t += 0.05) {
      const live = Array.from({ length: DIMPLES }, (_, i) => dimpleAt(i, t)).filter((d) => d.age < 1);
      shown += live.length;
      for (const d of live) expect(Math.hypot(d.dx, d.dz)).toBeLessThan(CLOUD_RADIUS);
      expect(live.length).toBeLessThan(DIMPLES + 1);
    }
    // On average one to three rings at a time.
    expect(shown / 1200).toBeGreaterThan(1);
    expect(shown / 1200).toBeLessThan(3.2);
  });

  it("show over a swim left to prime or topped up as it faded, not over a fresh handful", () => {
    const fresh = throwHandful(null, "dock").next;
    expect(feedersShow(fresh, false)).toBe(false);
    expect(feedersShow(fresh, true)).toBe(true);
    const topped = throwHandful({ spot: "dock", casts: 2 }, "dock");
    expect(topped.kind).toBe("topped");
    expect(feedersShow(topped.next, false)).toBe(true);
    expect(feedersShow(throwHandful({ spot: "dock", casts: 4 }, "dock").next, false)).toBe(false);
  });

  it("ring more often over a swim built up, still one ring each", () => {
    const shown = (built: number) => {
      let live = 0;
      for (let t = 0; t < 60; t += 0.05) live += Array.from({ length: DIMPLES }, (_, i) => dimpleAt(i, t, built)).filter((d) => d.age < 1).length;
      return live / 1200;
    };
    expect(shown(1)).toBeGreaterThan(shown(0));
    expect(shown(TOPUP_MAX)).toBeGreaterThan(shown(1));
    expect(shown(TOPUP_MAX + 1)).toBe(shown(TOPUP_MAX));
    expect(shown(TOPUP_MAX)).toBeLessThan(DIMPLES);
  });

  it("moves each ring to a new place every round", () => {
    const first = dimpleAt(0, 0.1);
    const later = dimpleAt(0, 0.1 + 2.5);
    expect(Math.hypot(first.dx - later.dx, first.dz - later.dz)).toBeGreaterThan(0.01);
  });
});

describe("big feeders rolling over a built swim", () => {
  const swim = (spot: "dock" | "point", built: number) => ({ spot, casts: 8, built });

  it("come only to a swim topped up all the way, at a bank where the tied lure takes them", () => {
    expect(bigFeedersOver(swim("dock", TOPUP_MAX), undefined)).toBe(true);
    expect(bigFeedersOver(swim("dock", TOPUP_MAX - 1), undefined)).toBe(false);
    expect(bigFeedersOver(swim("point", TOPUP_MAX), undefined)).toBe(false);
  });

  it("roll now and then at the cloud's edge, never two at once", () => {
    let rolling = 0;
    const slots = new Set<number>();
    for (let t = 0; t < 600; t += 0.05) {
      const roll = rollAt(t);
      if (!roll) continue;
      rolling += 1;
      slots.add(Math.floor(t / ROLL_GAP_SEC));
      const out = Math.hypot(roll.dx, roll.dz);
      expect(out).toBeGreaterThan(CLOUD_RADIUS * 0.75);
      expect(out).toBeLessThan(CLOUD_RADIUS);
      expect(roll.age).toBeGreaterThanOrEqual(0);
      expect(roll.age).toBeLessThan(ROLL_SPAN);
    }
    // One roll in every gap, each about ROLL_SPAN roll lengths long.
    expect(slots.size).toBe(600 / ROLL_GAP_SEC);
    expect(Math.abs(rolling * 0.05 - (600 / ROLL_GAP_SEC) * ROLL_SEC * ROLL_SPAN)).toBeLessThan(1);
  });

  it("heads round the edge, not in or out", () => {
    for (let t = 0; t < 300; t += 0.5) {
      const roll = rollAt(t);
      if (!roll) continue;
      const along = { x: Math.sin(roll.yaw), z: Math.cos(roll.yaw) };
      expect(Math.abs(along.x * roll.dx + along.z * roll.dz)).toBeLessThan(1e-9);
    }
  });
});

describe("a scattered swim", () => {
  const built = { spot: "dock" as const, casts: 4, built: TOPUP_MAX };

  it("stops the dimples", () => {
    expect(feedersShow(built, false)).toBe(true);
    expect(feedersShow({ ...built, spooked: 2 }, true)).toBe(false);
  });

  it("thins the cloud", () => {
    expect(cloudOpacity(4, true)).toBeLessThan(cloudOpacity(4));
    expect(cloudOpacity(1, true)).toBeGreaterThan(0);
  });

  it("fans a few wakes out toward open water that run on and fade within the scatter", () => {
    for (const spot of SPOT_IDS) {
      const yaw = openWaterYaw(spot);
      const heads = Array.from({ length: SCATTER_WAKES }, (_, i) => scatterWakeAt(i, 0.5, yaw)!.yaw);
      expect(new Set(heads).size).toBe(SCATTER_WAKES);
      for (const head of heads) expect(Math.abs(head - yaw)).toBeLessThan(0.7);
      const stand = BANK_STANDS[spot];
      const at = cloudCenter(spot);
      // The way out leads from the stand through the cloud.
      expect(Math.sin(yaw) * (at.x - stand.x) + Math.cos(yaw) * (at.z - stand.z)).toBeGreaterThan(0);
    }
    const early = scatterWakeAt(1, 0.2, 0)!;
    const late = scatterWakeAt(1, 1.6, 0)!;
    expect(late.run).toBeGreaterThan(early.run);
    expect(late.glow).toBeLessThan(early.glow);
    expect(scatterWakeAt(1, SCATTER_SEC, 0)).toBeNull();
    expect(scatterWakeAt(1, -1, 0)).toBeNull();
    expect(SCATTER_WAKES).toBeLessThanOrEqual(DIMPLES);
  });

  it.each(SPOT_IDS)("keeps the %s's wakes on the water to their ends", (spot) => {
    const at = cloudCenter(spot);
    for (let i = 0; i < SCATTER_WAKES; i++) {
      const end = scatterWakeAt(i, SCATTER_SEC - 0.01, openWaterYaw(spot))!;
      const reach = end.run + end.size;
      expect(walkableAt(at.x + Math.sin(end.yaw) * reach, at.z + Math.cos(end.yaw) * reach)).toBe(false);
    }
  });
});

describe("bait thieves at the cloud", () => {
  it("crowd a fresh swim, fewer once topped up, none once built all the way", () => {
    expect(thiefCount(0)).toBe(THIEVES);
    expect(thiefCount(1)).toBeGreaterThan(0);
    expect(thiefCount(1)).toBeLessThan(THIEVES);
    expect(thiefCount(TOPUP_MAX)).toBe(0);
  });

  it("dart in past the cloud's edge, turn away and flicker out between darts", () => {
    const poses = Array.from({ length: 200 }, (_, n) => thiefAt(0, n * 0.05));
    expect(poses.some((pose) => pose === null)).toBe(true);
    const shown = poses.filter((pose) => pose !== null);
    const reach = shown.map((pose) => Math.hypot(pose.dx, pose.dz));
    expect(Math.min(...reach)).toBeLessThan(CLOUD_RADIUS);
    expect(Math.max(...reach)).toBeLessThanOrEqual(THIEF_OUT + 1e-9);
    expect(Math.min(...shown.map((pose) => pose.show))).toBeLessThan(0.5);
    // Heading in, then away: its heading swings round within a dart.
    expect(new Set(shown.map((pose) => pose.yaw.toFixed(2))).size).toBeGreaterThan(2);
  });

  it("hold still, all shown, under reduced motion", () => {
    for (let i = 0; i < THIEVES; i++) {
      expect(thiefAt(i, 0, true)).toEqual(thiefAt(i, 9.3, true));
      expect(thiefAt(i, 0, true)!.show).toBe(1);
    }
  });

  it.each(SPOT_IDS)("stay on the %s's water", (spot) => {
    const at = cloudCenter(spot);
    for (let n = 0; n < 16; n++) {
      const angle = (n / 16) * Math.PI * 2;
      // The shiner's nose or tail just past the farthest it darts.
      const reach = THIEF_OUT + 0.25;
      expect(walkableAt(at.x + Math.cos(angle) * reach, at.z + Math.sin(angle) * reach)).toBe(false);
    }
  });
});

describe("perch under a swim with chopped worm in it", () => {
  it("hang there whatever lure is tied on, and bolt with the feeders when they scatter", () => {
    expect(perchShow({ spot: "dock", casts: 6, worm: true })).toBe(true);
    expect(perchShow({ spot: "dock", casts: 6, worm: true, built: TOPUP_MAX })).toBe(true);
    expect(perchShow({ spot: "dock", casts: 6 })).toBe(false);
    expect(perchShow({ spot: "dock", casts: 6, worm: true, spooked: 2 })).toBe(false);
  });

  it("hang under the cloud, well inside the shiners' darts, and dart to a fresh spot now and then", () => {
    for (let i = 0; i < PERCH; i++) {
      const poses = Array.from({ length: 400 }, (_, n) => perchAt(i, n * 0.05));
      const reach = poses.map((pose) => Math.hypot(pose.dx, pose.dz));
      // It hangs off the middle, though a dart may cross it.
      const hangs = poses.filter((pose) => pose.dart === 0).map((pose) => Math.hypot(pose.dx, pose.dz));
      expect(Math.min(...hangs)).toBeGreaterThan(PERCH_NEAR - 0.05);
      expect(Math.max(...reach)).toBeLessThan(PERCH_FAR + 0.05);
      expect(Math.max(...reach) + PERCH_REACH).toBeLessThan(THIEF_IN);
      expect(poses.some((pose) => pose.dart > 0)).toBe(true);
      expect(poses.filter((pose) => pose.dart === 0).length).toBeGreaterThan(poses.length / 2);
      expect(new Set(poses.map((pose) => pose.yaw.toFixed(1))).size).toBeGreaterThan(3);
    }
  });

  it("move and turn without a snap", () => {
    for (let i = 0; i < PERCH; i++) {
      let last = perchAt(i, 0);
      for (let t = 0.01; t < 30; t += 0.01) {
        const pose = perchAt(i, t);
        expect(Math.hypot(pose.dx - last.dx, pose.dz - last.dz)).toBeLessThan(0.1);
        expect(Math.abs(Math.atan2(Math.sin(pose.yaw - last.yaw), Math.cos(pose.yaw - last.yaw)))).toBeLessThan(0.25);
        last = pose;
      }
    }
  });

  it("stay put across exact cycle ends", () => {
    for (const t of [13, 26, 39, 52]) {
      const at = perchAt(0, t);
      const near = perchAt(0, t - 1e-6);
      expect(Math.hypot(at.dx - near.dx, at.dz - near.dz)).toBeLessThan(0.01);
    }
  });

  it("hold still, apart, under reduced motion", () => {
    const held = Array.from({ length: PERCH }, (_, i) => perchAt(i, 0, true));
    held.forEach((pose, i) => expect(perchAt(i, 8.1, true)).toEqual(pose));
    expect(held.every((pose) => pose.dart === 0)).toBe(true);
    for (let i = 1; i < PERCH; i++) expect(Math.hypot(held[i].dx - held[0].dx, held[i].dz - held[0].dz)).toBeGreaterThan(2 * PERCH_REACH);
  });

  it.each(SPOT_IDS.filter(hasWormFeeders))("stay on the %s's water, nose to tail", (spot) => {
    const at = cloudCenter(spot);
    for (let n = 0; n < 16; n++) {
      const angle = (n / 16) * Math.PI * 2;
      const reach = PERCH_FAR + PERCH_REACH;
      expect(walkableAt(at.x + Math.cos(angle) * reach, at.z + Math.sin(angle) * reach)).toBe(false);
    }
  });
});

describe("a pike prowling a built swim", () => {
  const swim = (spot: "dock" | "reeds", built: number) => ({ spot, casts: 8, built });
  const pikeBanks = SPOT_IDS.filter((spot) => FISH.some((fish) => PROWLERS.has(fish.id) && fish.spots.includes(spot)));

  it("comes only to a swim topped up all the way, at a bank where the tied lure takes pike", () => {
    expect(prowlerOver(swim("reeds", TOPUP_MAX), "Spinner")?.id).toBe("pike");
    expect(prowlerOver(swim("reeds", TOPUP_MAX - 1), "Spinner")).toBeUndefined();
    expect(prowlerOver(swim("reeds", TOPUP_MAX), "Worm")).toBeUndefined();
    expect(prowlerOver(swim("dock", TOPUP_MAX), "Spinner")).toBeUndefined();
  });

  it("glides along the cloud's edge, slashing in at the feeders once a pass", () => {
    const poses = Array.from({ length: (2 * PROWL_LEG_SEC) / 0.05 }, (_, n) => prowlAt(n * 0.05, 0));
    const reach = poses.map((pose) => Math.hypot(pose.dx, pose.dz));
    expect(Math.max(...reach)).toBeCloseTo(PROWL_OUT, 6);
    expect(Math.min(...reach)).toBeCloseTo(PROWL_IN, 2);
    expect(Math.min(...reach)).toBeLessThan(CLOUD_RADIUS);
    // One slash a pass: two passes, two slashes.
    const slashes = poses.filter((pose, n) => pose.slash > 0 && !(poses[n - 1]?.slash > 0)).length;
    expect(slashes).toBe(2);
    // It keeps to the open-water side: never round behind the cloud toward the bank.
    expect(Math.min(...poses.map((pose) => pose.dz))).toBeGreaterThan(0);
  });

  it("turns round at each end of a pass without a snap", () => {
    let last = prowlAt(0, 0).yaw;
    for (let t = 0.02; t < 2 * PROWL_LEG_SEC + 1; t += 0.02) {
      const yaw = prowlAt(t, 0).yaw;
      expect(Math.abs(Math.atan2(Math.sin(yaw - last), Math.cos(yaw - last)))).toBeLessThan(0.2);
      last = yaw;
    }
  });

  it("holds still mid-pass under reduced motion", () => {
    expect(prowlAt(0, 1, true)).toEqual(prowlAt(7.7, 1, true));
    expect(prowlAt(0, 1, true).speed).toBe(0);
    expect(prowlAt(0, 1, true).slash).toBe(0);
  });

  it.each(pikeBanks)("stays on the %s's water, nose to tail", (spot) => {
    const at = cloudCenter(spot);
    const out = openWaterYaw(spot);
    for (let t = 0; t < 2 * PROWL_LEG_SEC; t += 0.1) {
      const pose = prowlAt(t, out);
      for (const end of [PIKE_REACH, -PIKE_REACH]) {
        const x = at.x + pose.dx + Math.sin(pose.yaw) * end;
        const z = at.z + pose.dz + Math.cos(pose.yaw) * end;
        expect(walkableAt(x, z)).toBe(false);
      }
    }
  });
});
