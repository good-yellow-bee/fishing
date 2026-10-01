import { inLake } from "@stillwater/shared";

/** How long the strike whip takes before the rod settles into the fight. */
export const HOOKSET_SEC = 1.55;

/** The upward snap inside the hookset. */
export const STRIKE_SNAP_SEC = 0.22;

/** Pause at the top of the set so the strike reads. */
export const STRIKE_HOLD_SEC = 0.9;

/** Bobber yank toward the angler on the strike. */
export const TUG_SEC = 0.32;

/** Air time of a hooked fish leaving the water. */
export const FISH_LEAP_SEC = 0.52;

export type FightSurge = 0 | 1 | 2;

export type RodInput = {
  tension: number;
  surge: FightSurge;
  reeling: boolean;
  /** Seconds since the strike. Negative while the bite is still on. */
  strikeAge: number;
  biteAge: number;
  time: number;
  /** Retrieve cycle, advances only while reeling. */
  pump: number;
  /** Rod pitch captured at the moment of the strike. */
  fromPitch: number;
};

/** Written by the game loop. The scene reads it on the next frame. */
export const fightInput = { reeling: false };

/** Shared pose so the rod, line, and fish agree on one fight. */
export const fightView = {
  active: false,
  surge: 0 as FightSurge,
  tension: 0.2,
  reeling: false,
  strikeAge: -1,
  biteAge: 0,
  pump: 0,
  time: 0,
  runSide: 0,
  lead: 0.32,
  side: 0,
  depth: 0.42,
  leapAge: -1,
  tug: 0,
  plunge: 0,
  pull: 0,
  sag: 0.22,
  /** Fish offset in the bobber's local space, so spray can follow the run. */
  localX: 0,
  localY: 0,
  localZ: 0,
};

/** 0 at the start of a pump, 1 at the top, 0 after the drop. */
export function reelPumpLift(phase: number) {
  const u = phase - Math.floor(phase);
  if (u < 0.62) return Math.sin((u / 0.62) * (Math.PI / 2));
  return Math.cos(((u - 0.62) / 0.38) * (Math.PI / 2));
}

/** Waiting-rod pitch. The take starts here so the tip does not jump. */
const BITE_REST = 1.05;

/** Mouth tap before the fish commits. */
export const BITE_TAP_SEC = 0.08;

/** End of the slack pause, when the yank starts. */
export const BITE_SLACK_END = 0.15;

/** End of the hard yank. The tip throbs after this. */
export const BITE_YANK_END = 0.29;

/** One pump of the loaded tip after the yank. */
export const BITE_THROB_SEC = 0.22;

function biteAgeOf(biteAge: number) {
  return Math.max(0, biteAge);
}

/** 1 at the bottom of a throb, -1 when the tip springs back. Zero before the yank ends. */
function biteThrob(age: number) {
  if (age < BITE_YANK_END) return 0;
  return Math.sin(((age - BITE_YANK_END) / BITE_THROB_SEC) * Math.PI * 2);
}

/**
 * Tap, almost recover, then a yank that loads the rod.
 * After the yank the tip pumps instead of sitting in one bend.
 */
export function biteRodPitch(biteAge: number, time: number) {
  const age = biteAgeOf(biteAge);
  const tick = Math.sin(time * 23) * 0.035;
  if (age < BITE_TAP_SEC) {
    const u = age / BITE_TAP_SEC;
    return BITE_REST + Math.sin(u * Math.PI) * 0.32 + tick * u;
  }
  if (age < BITE_SLACK_END) {
    const u = (age - BITE_TAP_SEC) / (BITE_SLACK_END - BITE_TAP_SEC);
    return BITE_REST + 0.05 * (1 - u) + tick;
  }
  const u = Math.min(1, (age - BITE_SLACK_END) / (BITE_YANK_END - BITE_SLACK_END));
  const loaded = BITE_REST + 0.05 + (1 - (1 - u) ** 3) * 0.5;
  return loaded + biteThrob(age) * 0.12 + tick;
}

/** Meters the bobber is pulled under. A tap ticks it; the yank dunks it. */
export function bitePlunge(biteAge: number) {
  const age = biteAgeOf(biteAge);
  if (age < BITE_TAP_SEC) return Math.sin((age / BITE_TAP_SEC) * Math.PI) * 0.045;
  if (age < BITE_SLACK_END) return 0.008;
  const u = Math.min(1, (age - BITE_SLACK_END) / 0.1);
  const dunk = (1 - (1 - u) ** 2) * 0.36;
  const pump = Math.max(0, biteThrob(age)) * 0.07;
  return dunk + pump;
}

/** Belly of the line. Slack on the tap, tight on the yank, a little belly between pumps. */
export function biteLineSag(biteAge: number) {
  const age = biteAgeOf(biteAge);
  if (age < BITE_SLACK_END) return 0.3;
  const u = Math.min(1, (age - BITE_SLACK_END) / 0.1);
  const tight = 0.3 + (0.045 - 0.3) * (1 - (1 - u) ** 2);
  const belly = Math.max(0, -biteThrob(age)) * 0.07;
  return tight + belly;
}

/** Forward lean. The yank drags the angler; the pumps tug again. */
export function biteBodyLean(biteAge: number) {
  const age = biteAgeOf(biteAge);
  const base = 0.045;
  if (age < BITE_TAP_SEC) return base + Math.sin((age / BITE_TAP_SEC) * Math.PI) * 0.04;
  if (age < BITE_SLACK_END) return base;
  const u = Math.min(1, (age - BITE_SLACK_END) / 0.12);
  return base + (1 - (1 - u) ** 2) * 0.16 + Math.max(0, biteThrob(age)) * 0.05;
}

/** Sideways kick of the tip, radians. */
export function biteRodRoll(biteAge: number, time: number) {
  const age = biteAgeOf(biteAge);
  const tick = Math.sin(time * 17) * 0.025;
  if (age < BITE_SLACK_END) return Math.sin(Math.min(1, age / BITE_TAP_SEC) * Math.PI) * 0.04 + tick;
  if (age < BITE_YANK_END) {
    const u = (age - BITE_SLACK_END) / (BITE_YANK_END - BITE_SLACK_END);
    return Math.sin(u * Math.PI) * 0.16 + tick;
  }
  return Math.sin(((age - BITE_YANK_END) / (BITE_THROB_SEC * 2)) * Math.PI * 2) * 0.1 + tick;
}

/** Sideways dart of the bobber, meters. Positive through the yank, then it swaps sides. */
export function biteDart(biteAge: number) {
  const age = biteAgeOf(biteAge);
  if (age < BITE_SLACK_END) return 0;
  if (age < BITE_YANK_END) {
    const u = (age - BITE_SLACK_END) / (BITE_YANK_END - BITE_SLACK_END);
    return Math.sin(u * Math.PI) * 0.28;
  }
  return Math.sin(((age - BITE_YANK_END) / (BITE_THROB_SEC * 2)) * Math.PI * 2) * 0.2;
}

/**
 * Tension and a run bend the tip down. A pump lifts it.
 * Full tension plus a run stays near 1.5 rad so the tip clears the dock deck.
 */
export function loadedFightPitch(
  tension: number,
  surge: FightSurge,
  reeling: boolean,
  pump: number,
  time: number,
) {
  const t = Math.min(1, Math.max(0, tension));
  const base = 0.94 + t * 0.16;
  const run = surge === 2 ? 0.36 : surge === 1 ? 0.09 : 0;
  const shiver = surge === 2 ? Math.sin(time * 27) * 0.04 : surge === 1 ? Math.sin(time * 19) * 0.028 : 0;
  const lift = reeling ? reelPumpLift(pump) * (surge === 2 ? 0.12 : 0.4) : 0;
  return base + run + shiver - lift;
}

/** Same family as a loaded cast: the tip comes back over the shoulder. */
const SET_UP = -0.45;

/** Snap from the loaded bite up through the hookset, hold, then settle. */
export function strikeRodPitch(age: number, from: number, loaded: number) {
  if (age <= STRIKE_SNAP_SEC) {
    const u = Math.max(0, age) / STRIKE_SNAP_SEC;
    const e = 1 - (1 - u) ** 2;
    return from + (SET_UP - from) * e;
  }
  const held = STRIKE_SNAP_SEC + STRIKE_HOLD_SEC;
  if (age <= held) return SET_UP;
  const u = (age - held) / (HOOKSET_SEC - held);
  const damp = Math.exp(-2.6 * Math.max(0, u));
  const settle = SET_UP + (loaded - SET_UP) * (1 - Math.exp(-3.4 * Math.max(0, u)));
  return settle + Math.sin(u * Math.PI * 2.2) * 0.06 * damp;
}

export function fightRodPitch(input: RodInput) {
  const loaded = loadedFightPitch(input.tension, input.surge, input.reeling, input.pump, input.time);
  if (input.strikeAge < 0) return biteRodPitch(input.biteAge, input.time);
  if (input.strikeAge < HOOKSET_SEC) return strikeRodPitch(input.strikeAge, input.fromPitch, loaded);
  return loaded;
}

/** Tip twists toward a side run. Positive runSide rolls positive. */
export function fightRodRoll(surge: FightSurge, runSide: number, time: number, strikeAge: number, biteAge: number) {
  const pull = runSide * (surge === 2 ? 0.26 : surge === 1 ? 0.1 : 0.03);
  let shake = 0;
  if (strikeAge < 0) shake = biteRodRoll(biteAge, time);
  else if (surge === 1) shake = Math.sin(time * 22) * 0.07;
  else if (surge === 2) shake = Math.sin(time * 16) * 0.035;
  const snap = strikeAge >= 0 && strikeAge < STRIKE_SNAP_SEC ? Math.sin((strikeAge / STRIKE_SNAP_SEC) * Math.PI) * 0.1 : 0;
  return pull + shake + snap;
}

/** Negative leans back (the set, a pump). Positive is the fish dragging you forward. */
export function fightBodyLean(surge: FightSurge, reeling: boolean, strikeAge: number, biteAge = 0) {
  let lean = 0;
  if (strikeAge < 0) lean += biteBodyLean(biteAge);
  else if (strikeAge < STRIKE_SNAP_SEC + STRIKE_HOLD_SEC) {
    const u = Math.min(1, Math.max(0, strikeAge) / STRIKE_SNAP_SEC);
    lean -= 0.42 * (1 - (1 - u) ** 2);
  } else if (strikeAge < HOOKSET_SEC) {
    const u = (strikeAge - STRIKE_SNAP_SEC - STRIKE_HOLD_SEC) / (HOOKSET_SEC - STRIKE_SNAP_SEC - STRIKE_HOLD_SEC);
    lean -= 0.42 * (1 - Math.min(1, Math.max(0, u)));
  }
  if (reeling && surge !== 2) lean -= 0.11;
  if (surge === 2) lean += 0.16;
  return lean;
}

/** How far the fish leads the lure, meters, along the cast. */
export function fishLeadMeters(surge: FightSurge, reeling: boolean) {
  if (surge === 2) return reeling ? 0.95 : 1.55;
  if (surge === 1) return 0.72;
  return reeling ? 0.18 : 0.48;
}

/** Lateral lead. runSide is about -1..1. */
export function fishSideMeters(surge: FightSurge, runSide: number) {
  const reach = surge === 2 ? 1.85 : surge === 1 ? 0.62 : 0.12;
  return runSide * reach;
}

/**
 * Meters under the surface. The calm depth covers the body (about 0.31m
 * at fight scale). A run lifts the back out of the water.
 */
export function fishDepthMeters(surge: FightSurge) {
  if (surge === 2) return 0.04;
  if (surge === 1) return 0.22;
  return 0.42;
}

/** 0..1 arc. Zero outside the leap. */
export function fishLeapHeight(age: number) {
  if (age < 0 || age >= FISH_LEAP_SEC) return 0;
  return Math.sin((age / FISH_LEAP_SEC) * Math.PI) * 1.15;
}

/** 0 at the ends of the strike yank, 1 in the middle. */
export function hooksetTug(strikeAge: number) {
  if (strikeAge < 0 || strikeAge > TUG_SEC) return 0;
  return Math.sin((strikeAge / TUG_SEC) * Math.PI);
}

export function bobberPlunge(biteAge: number, strikeAge: number, surge: FightSurge) {
  if (strikeAge < 0) return bitePlunge(biteAge);
  return hooksetTug(strikeAge) * 0.18 + (surge === 2 ? 0.11 : 0);
}

/** How far the lure is dragged along the run, meters. */
export function bobberPull(surge: FightSurge, reeling: boolean) {
  if (surge === 2) return reeling ? 0.45 : 1.35;
  if (surge === 1) return 0.32;
  return 0;
}

/**
 * Belly of the line. Never deeper than a slack fight (0.54), so the drape
 * stays off the dock. A run or a pump lifts that belly.
 */
export function fightLineSag(tension: number, surge: FightSurge, reeling: boolean, pump: number) {
  const slack = 0.04 + Math.max(0, 1 - tension) * 0.5;
  if (surge === 2) return Math.min(slack, 0.05);
  if (!reeling) return slack;
  const lift = reelPumpLift(pump);
  return slack * (0.85 - lift * 0.45);
}

/** bridge_wood.glb scaled 1.8. The deck top sits near y = 0.63. */
const DOCK_DECK = { minX: -1.05, maxX: 1.05, minZ: 5.2, maxZ: 8.5, top: 0.72 };

/**
 * Meters the lure still sits beyond the reeled point at the bottom of a pump.
 * It arrives on the lift, so the haul reads as a dart instead of a slide.
 */
export function retrieveHang(pump: number, reeling: boolean, surge: FightSurge) {
  if (!reeling || surge === 2) return 0;
  return (1 - reelPumpLift(pump)) * (surge === 1 ? 0.22 : 1.45);
}

/** Sideways kick, meters. Alternates each pump and peaks as the lure comes in. */
export function retrieveWeave(pump: number, reeling: boolean, surge: FightSurge) {
  if (!reeling || surge === 2) return 0;
  const stroke = Math.floor(Math.max(0, pump));
  const sign = stroke % 2 === 0 ? 1 : -1;
  return sign * reelPumpLift(pump) * (surge === 1 ? 0.16 : 1.05);
}

/** Skip above the surface on the haul, meters. */
export function retrieveHop(pump: number, reeling: boolean, surge: FightSurge) {
  if (!reeling || surge === 2) return 0;
  return reelPumpLift(pump) * (surge === 1 ? 0.06 : 0.52);
}

/** 0..1 wake while the lure is moving in. A run keeps the water quiet. */
export function retrieveWake(pump: number, reeling: boolean, surge: FightSurge) {
  if (!reeling || surge === 2) return 0;
  return reelPumpLift(pump);
}

/** Buoy half-width at the fight scale, plus a little air. */
const LURE_DOCK_PAD = 0.18;

function onDockDeck(x: number, z: number, pad = 0) {
  return (
    x >= DOCK_DECK.minX - pad &&
    x <= DOCK_DECK.maxX + pad &&
    z >= DOCK_DECK.minZ - pad &&
    z <= DOCK_DECK.maxZ + pad
  );
}

/**
 * Sideways dart of a bobber already on the water.
 * Shrinks the offset so the take stays in the lake and off the dock.
 */
export function applyBiteDart(x: number, z: number, anglerX: number, anglerZ: number, biteAge: number) {
  const dart = biteDart(biteAge);
  if (dart === 0) return { x, z };
  const dx = x - anglerX;
  const dz = z - anglerZ;
  const reach = Math.hypot(dx, dz) || 1;
  const sideX = -dz / reach;
  const sideZ = dx / reach;
  let scale = 1;
  for (let i = 0; i < 4; i += 1) {
    const nextX = x + sideX * dart * scale;
    const nextZ = z + sideZ * dart * scale;
    if (inLake(nextX, nextZ) && !onDockDeck(nextX, nextZ, LURE_DOCK_PAD)) return { x: nextX, z: nextZ };
    scale *= 0.5;
  }
  return { x, z };
}

/**
 * Hang and weave applied to a lure already placed by the line fraction.
 * Shrinks the offset so a haul stays in the water, off the dock and the bank.
 */
export function applyRetrieve(
  x: number,
  z: number,
  reelX: number,
  reelZ: number,
  pump: number,
  reeling: boolean,
  surge: FightSurge,
) {
  const hang = retrieveHang(pump, reeling, surge);
  const weave = retrieveWeave(pump, reeling, surge);
  if (hang === 0 && weave === 0) return { x, z };
  const dx = x - reelX;
  const dz = z - reelZ;
  const reach = Math.hypot(dx, dz) || 1;
  const outX = dx / reach;
  const outZ = dz / reach;
  const capped = Math.min(hang, reach * 0.55);
  let scale = 1;
  let offDeck: { x: number; z: number } | null = null;
  for (let i = 0; i < 6; i += 1) {
    const nextX = x + outX * capped * scale - outZ * weave * scale;
    const nextZ = z + outZ * capped * scale + outX * weave * scale;
    if (inLake(nextX, nextZ) && !onDockDeck(nextX, nextZ)) {
      if (!onDockDeck(nextX, nextZ, LURE_DOCK_PAD)) return { x: nextX, z: nextZ };
      if (!offDeck) offDeck = { x: nextX, z: nextZ };
    }
    scale *= 0.5;
  }
  return offDeck ?? { x, z };
}

/**
 * Points to insert so a straight fight-line span does not cut the dock.
 * Each one sits on the lip. Empty when the span already clears the deck.
 */
export function dockLineLips(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dz = z1 - z0;
  const hits: { t: number; x: number; y: number; z: number }[] = [];
  const planes: Array<[number, number, number]> = [
    [DOCK_DECK.minX, x0, dx],
    [DOCK_DECK.maxX, x0, dx],
    [DOCK_DECK.minZ, z0, dz],
    [DOCK_DECK.maxZ, z0, dz],
  ];
  for (const [plane, origin, delta] of planes) {
    if (Math.abs(delta) < 1e-8) continue;
    const t = (plane - origin) / delta;
    if (t <= 1e-3 || t >= 1 - 1e-3) continue;
    const x = x0 + dx * t;
    const z = z0 + dz * t;
    if (!onDockDeck(x, z, 1e-3)) continue;
    if (hits.some((hit) => Math.abs(hit.t - t) < 1e-3)) continue;
    hits.push({ t, x, y: y0 + dy * t, z });
  }
  hits.sort((a, b) => a.t - b.t);
  if (!hits.some((hit) => hit.y < DOCK_DECK.top - 1e-3)) return [];
  return hits.map((hit) => ({ x: hit.x, y: Math.max(hit.y, DOCK_DECK.top), z: hit.z }));
}

/** Lift a fight-line sample off the dock deck and the ground. Lake water can stay under the surface. */
export function clearFightLine(y: number, x: number, z: number) {
  let next = y;
  if (onDockDeck(x, z)) next = Math.max(next, DOCK_DECK.top);
  if (!inLake(x, z)) next = Math.max(next, 0.12);
  return next;
}
