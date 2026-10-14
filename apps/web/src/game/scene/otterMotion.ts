import { LAKE_CENTER_Z, LAKE_RX, LAKE_RZ, type LakeHour, type LakeSeason } from "@stillwater/shared";
import type { Splash } from "./duckFlush";

/** How far out from the far bank it swims, as a share of the lake's radius. */
const BANK_REACH = 0.82;
/** The stretch of far bank it works, radians either side of due north. */
const SWEEP = Math.PI * 0.28;
/** Seconds for one trip along the bank and back. */
export const OTTER_LAP_SEC = 140;
/** One porpoise: swimming at the top, the arc down, under, and back up. */
export const OTTER_SWIM_SEC = 6;
export const OTTER_ARC_SEC = 0.8;
export const OTTER_UNDER_SEC = 1.6;
export const OTTER_RISE_SEC = 0.6;
const CYCLE = OTTER_SWIM_SEC + OTTER_ARC_SEC + OTTER_UNDER_SEC + OTTER_RISE_SEC;
/** A cast landing closer than this sends it under; only a splash this fresh counts. */
export const OTTER_SCARE_RADIUS = 5;
export const OTTER_SPLASH_FRESH_SEC = 0.6;
/** Seconds it stays down and out of sight after a scare, the quick dive first. */
export const OTTER_HIDE_SEC = 40;
export const OTTER_DIVE_SEC = 0.5;

export type OtterPose = {
  x: number;
  z: number;
  yaw: number;
  /** 0 swimming at the top, 1 out of sight under the water. */
  under: number;
  /** Nose down as it arcs under, up as it comes back, in radians. */
  pitch: number;
  /** The ring where it went under or came up, 0..1 as it spreads; -1 when there is none. */
  ring: number;
};

export type OtterState = { mode: "swimming" } | { mode: "hiding"; since: number };

/** Out along the far bank at dawn and dusk, but not while the lake is frozen at the edges. */
export function otterOut(hour: LakeHour, season: LakeSeason) {
  return (hour === "dawn" || hour === "dusk") && season !== "winter";
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/** Where along the far bank it is and which way it is heading. */
export function otterRoute(time: number) {
  const phase = (time / OTTER_LAP_SEC) * 2 * Math.PI;
  const angle = -Math.PI / 2 + SWEEP * Math.sin(phase);
  const x = Math.cos(angle) * LAKE_RX * BANK_REACH;
  const z = LAKE_CENTER_Z + Math.sin(angle) * LAKE_RZ * BANK_REACH;
  // Velocity along the ellipse, so it turns round smoothly at each end of the stretch.
  const turn = SWEEP * Math.cos(phase);
  const dx = -Math.sin(angle) * LAKE_RX * turn;
  const dz = Math.cos(angle) * LAKE_RZ * turn;
  return { x, z, yaw: Math.atan2(dx, dz) };
}

/** A fresh splash close by sends it under for a while; then it carries on along the bank. */
export function stepOtter(state: OtterState, time: number, at: { x: number; z: number }, splash: Splash): OtterState {
  if (state.mode === "hiding") return time - state.since >= OTTER_HIDE_SEC ? { mode: "swimming" } : state;
  const fresh = time - splash.at >= 0 && time - splash.at < OTTER_SPLASH_FRESH_SEC;
  if (fresh && Math.hypot(at.x - splash.x, at.z - splash.z) < OTTER_SCARE_RADIUS) return { mode: "hiding", since: time };
  return state;
}

export function otterPose(time: number, state: OtterState = { mode: "swimming" }): OtterPose {
  const { x, z, yaw } = otterRoute(time);
  if (state.mode === "hiding") {
    const since = time - state.since;
    const k = clamp01(since / OTTER_DIVE_SEC);
    return { x, z, yaw, under: k, pitch: -1.1 * k, ring: since < OTTER_DIVE_SEC * 2 ? since / (OTTER_DIVE_SEC * 2) : -1 };
  }
  const into = ((time % CYCLE) + CYCLE) % CYCLE;
  const arcStart = OTTER_SWIM_SEC;
  const underStart = arcStart + OTTER_ARC_SEC;
  const riseStart = underStart + OTTER_UNDER_SEC;
  if (into < arcStart) return { x, z, yaw, under: 0, pitch: 0, ring: -1 };
  if (into < underStart) {
    const k = (into - arcStart) / OTTER_ARC_SEC;
    // Up and over: the nose lifts a touch, then rolls down and under.
    return { x, z, yaw, under: k, pitch: 0.3 - 1.4 * k, ring: k * 0.5 };
  }
  if (into < riseStart) {
    const since = into - underStart;
    return { x, z, yaw, under: 1, pitch: -1.1, ring: since < OTTER_ARC_SEC ? 0.5 + (since / OTTER_ARC_SEC) * 0.5 : -1 };
  }
  const k = (into - riseStart) / OTTER_RISE_SEC;
  return { x, z, yaw, under: 1 - k, pitch: 0.5 * (1 - k), ring: k };
}
