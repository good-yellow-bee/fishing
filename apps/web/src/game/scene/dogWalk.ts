import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, lakeEdge, type LakeHour, type LakeSeason } from "@stillwater/shared";

/**
 * Someone walking their dog along the far bank, from spring to fall: they stroll one way along the
 * shore, turn at the end of the path and stroll back, while the dog runs on ahead, stops to sniff
 * until they have nearly caught up, and runs on again. Pure in time.
 */

/** The path's ends, as angles round the shore rings (the shape's +y is the world's -z, so these lie on the far, north side). */
const PATH_FROM = 1.85;
const PATH_TO = 1;
/** How far back from the waterline the path runs: along the sand, in front of the owl's tree and the kite flyer's spot. */
const PATH_OUT = 0.7;
/** Seconds for one walk along the path, and for turning round at its end. */
export const WALK_SEC = 40;
export const TURN_SEC = 3;
/** Metres in one full stride (left and right) for the walker, and for the dog's four legs. */
const STRIDE_M = 1.5;
const DOG_STRIDE_M = 0.7;
/** How many seconds of the walk the dog is ahead, on average, and how far that wanders: never more than the time itself passes, so the dog never trots backward. */
const DOG_AHEAD = 2.4;
const DOG_ROAM = 1.2;
const DOG_ROUND = 12;
/** How far the dog strays from the path, toward the water and back. */
const DOG_STRAY = 0.4;

/** Out by day from spring to fall, whatever the weather: the dog needs its walk, so in the rain they take an umbrella. */
export function dogWalkOut(hour: LakeHour, season: LakeSeason) {
  return hour === "day" && season !== "winter";
}

/** A point on the path, 0 at its west end and 1 at its east end, `out` metres back from the waterline. */
export function walkPath(u: number, out = PATH_OUT) {
  const angle = PATH_FROM + (PATH_TO - PATH_FROM) * u;
  const edge = lakeEdge(angle);
  return { x: Math.cos(angle) * (LAKE_RX * edge + out), z: LAKE_CENTER_Z - Math.sin(angle) * (LAKE_RZ * edge + out) };
}

/** The path's length in metres. */
export const PATH_LENGTH = Array.from({ length: 64 }, (_, i) => {
  const a = walkPath(i / 64);
  const b = walkPath((i + 1) / 64);
  return Math.hypot(b.x - a.x, b.z - a.z);
}).reduce((sum, step) => sum + step, 0);

function heading(u: number, eastward: boolean) {
  const ahead = walkPath(Math.min(1, u + 0.01));
  const behind = walkPath(Math.max(0, u - 0.01));
  const east = Math.atan2(ahead.x - behind.x, ahead.z - behind.z);
  return eastward ? east : east + Math.PI;
}

function smooth(x: number) {
  const k = Math.min(1, Math.max(0, x));
  return k * k * (3 - 2 * k);
}

type Stroll = { u: number; yaw: number; walked: number };

/** Where along the path the walk has got `time` seconds in, which way it faces, and the metres walked so far. */
function strollAt(time: number): Stroll {
  const lap = 2 * (WALK_SEC + TURN_SEC);
  const laps = Math.floor(time / lap);
  const into = time - laps * lap;
  const eastward = into < WALK_SEC + TURN_SEC;
  const legInto = eastward ? into : into - WALK_SEC - TURN_SEC;
  const before = laps * 2 * PATH_LENGTH + (eastward ? 0 : PATH_LENGTH);
  if (legInto < WALK_SEC) {
    // Setting off from the turn, strolling steadily, and slowing into the next.
    const k = legInto / WALK_SEC;
    const s = k + Math.sin(2 * Math.PI * k) * -0.06;
    const u = eastward ? s : 1 - s;
    return { u, yaw: heading(u, eastward), walked: before + s * PATH_LENGTH };
  }
  const end = eastward ? 1 : 0;
  return { u: end, yaw: heading(end, eastward) + Math.PI * smooth((legInto - WALK_SEC) / TURN_SEC), walked: before + PATH_LENGTH };
}

export type WalkPose = {
  x: number;
  z: number;
  /** Which way they face; the figures face +z. */
  yaw: number;
  /** Where the legs are through a stride: 1 the left leg reached forward, -1 the right. */
  stride: number;
};

export type DogPose = WalkPose & {
  /** 0 trotting along to 1 stopped with its nose to the ground. */
  sniff: number;
  /** 0 walking pace to 1 running flat out to catch up or get ahead. */
  run: number;
};

/** The walker `time` seconds in. `still` holds them standing partway along the path. */
export function walkerAt(time: number, still = false): WalkPose {
  const stroll = still ? { u: 0.45, yaw: heading(0.45, true), walked: 0 } : strollAt(time);
  const here = walkPath(stroll.u);
  return { ...here, yaw: stroll.yaw, stride: still ? 0 : Math.sin((2 * Math.PI * stroll.walked) / STRIDE_M) };
}

/** How far ahead along the walk the dog is, in seconds of the walk, and how fast that is changing. */
function dogLead(time: number) {
  const w = (2 * Math.PI) / DOG_ROUND;
  const wobble = Math.sin(w * time) + 0.25 * Math.sin(2 * w * time + 1);
  const rate = DOG_ROAM * w * (Math.cos(w * time) + 0.5 * Math.cos(2 * w * time + 1));
  return { ahead: DOG_AHEAD + DOG_ROAM * wobble, rate };
}

/** The dog `time` seconds in: on the same walk a little ahead in time, so it turns where the walker turns. `still` sits it just ahead of them. */
export function dogAt(time: number, still = false): DogPose {
  if (still) {
    const u = 0.45 + DOG_AHEAD * (1 / WALK_SEC) * 0.6;
    return { ...walkPath(u, PATH_OUT - 0.2), yaw: heading(u, true), stride: 0, sniff: 0, run: 0 };
  }
  const lead = dogLead(time);
  const stroll = strollAt(time + lead.ahead);
  // Its pace against the walker's: 1 + rate, from nosing along at a third of it to nearly twice as fast.
  const pace = 1 + lead.rate;
  const stray = DOG_STRAY * Math.sin(time * 0.55) + 0.12 * Math.sin(time * 1.7);
  const here = walkPath(stroll.u, PATH_OUT - stray);
  return {
    ...here,
    yaw: stroll.yaw,
    stride: Math.sin((2 * Math.PI * stroll.walked) / DOG_STRIDE_M),
    sniff: smooth((0.6 - pace) / 0.25),
    run: smooth((pace - 1.3) / 0.4),
  };
}
